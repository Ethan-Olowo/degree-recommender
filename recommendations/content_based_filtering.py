from recommendations.grades_helper import normalize_grade
import uuid
from models import DegreeProgram, Recommendation, User
from database.schemas import AcademicData, SubjectGrade, Subject, DegreeIndustry, Industry, SubjectRequirement
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
from datetime import datetime
import database.crud as crud
from fastapi import BackgroundTasks
from database.crud import save_embeddings_batch_in_task


class ContentBasedFiltering:
    """
    Implements a content-based recommendation algorithm to match users
    with suitable degree programs based on their profiles.
    """

    def __init__(self, subjects: list[Subject], industries: list[Industry], background_tasks: BackgroundTasks = None ):
        """
        Initializes the recommender.
        """
        self.background_tasks = background_tasks
        self._fit_encoders(subjects, industries)
        self.db = None

    def _fit_encoders(self, subjects: list[Subject], industries: list[Industry]):
        """
        Fetches all unique subjects and industries from the database
        to define the feature space for consistent vectorization.
        """
        self.all_subjects = [s.subject_name for s in subjects]
        self.all_industries = [i.industry_name for i in industries]
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        # No precomputation of industry embeddings
        self.industry_id_map = {industry.industry_name: industry.industry_id for industry in industries}

    def _create_user_vectors(self, user: User) -> tuple[np.ndarray, np.ndarray]:
        """
        Creates separate vectors for subject grades and interests.
        Returns:
            tuple: (subject_vector, interest_vector)
        """
        # DEBUG: Print the subjects we are looking for
        print(f"--- DEBUG: self.all_subjects (first 10): {self.all_subjects[:10]}")
        # Subject grades vector
        subject_grades = {}
        if user.academic_data and user.academic_data.subject_grades:
            for sg in user.academic_data.subject_grades:
                if sg.subject and hasattr(sg.subject, "subject_name"):
                    subject_grades[sg.subject.subject_name] = normalize_grade(sg.grade) / 100
        subject_vector = np.array([subject_grades.get(subject, 0.0) for subject in self.all_subjects])

        # Interests embedding vector (average of all interest embeddings)
        interests = []
        interest_embeddings = []
        embeddings_to_save = []
        if user.personal_interests:
            for interest_obj in user.personal_interests:
                if hasattr(interest_obj, "interest"):
                    interests.append(interest_obj.interest)
                    if getattr(interest_obj, 'embedding', None):
                        emb_str = interest_obj.embedding.strip('[]')
                        emb = np.array([float(x) for x in emb_str.split(',')])
                    else:
                        emb = self.embedding_model.encode([interest_obj.interest])[0]
                        # Collect embedding for batch save
                        embeddings_to_save.append({
                            'row_id': str(user.user_id),
                            'embedding': ','.join(map(str, emb)),
                            'secondary_id': interest_obj.interest
                        })
                    interest_embeddings.append(emb)
        # Batch save all new embeddings
        if embeddings_to_save:
            if hasattr(self, 'background_tasks') and self.background_tasks is not None:
                self.background_tasks.add_task(
                    save_embeddings_batch_in_task,
                    'personal_interests',
                    embeddings_to_save
                )
            elif self.db is not None:
                crud.save_embeddings_batch(self.db, 'personal_interests', embeddings_to_save)
            else:
                print("No DB session available to save personal interest embeddings.")
        if interest_embeddings:
            interest_vector = np.mean(interest_embeddings, axis=0)
        else:
            # Use default embedding size (MiniLM-L6-v2: 384)
            interest_vector = np.zeros(384)
        return subject_vector, interest_vector

    def _create_degree_vectors(self, programs: list[DegreeProgram]) -> tuple[pd.DataFrame, np.ndarray, dict, np.ndarray]:
        """
        Creates separate matrices for subject requirements and semantic embeddings (industry + description) for degree programs.
        Returns:
            tuple: (subject_matrix, semantic_embedding_matrix, program_id_map, degree_norms)
        """
        subject_data = []
        semantic_embeddings = []
        program_id_map = {}
        inds_embeddings_to_save = []
        desc_embeddings_to_save = []
        degree_norms = []  # New array to store norms

        for i, program in enumerate(programs):
            # Subject requirement vector
            requirements = {}
            if program.subject_requirements:
                for req in program.subject_requirements:
                    if req.subject and hasattr(req.subject, "subject_name"):
                        requirements[req.subject.subject_name] = 1.0 if req.requirement_detail == None else normalize_grade(req.requirement_detail)
            subject_vector = [requirements.get(subject, 0.0) for subject in self.all_subjects]
            subject_data.append(subject_vector)

            # Calculate norm for the subject vector
            norm = np.sqrt(np.sum(np.square(subject_vector)))
            if norm == 0.0:
                norm = 1.0  # Avoid division by zero
            degree_norms.append(norm)

            # --- Semantic embedding: combine industry embeddings and description embedding ---
            inds_embeddings = []
            if program.degree_industries:
                for degree_ind_obj in program.degree_industries:
                    industry_obj = getattr(degree_ind_obj, 'industry', None)
                    if industry_obj:
                        if getattr(industry_obj, 'embedding', None):
                            emb_str = industry_obj.embedding.strip('[]')
                            emb = np.array([float(x) for x in emb_str.split(',')])
                        else:
                            emb = self.embedding_model.encode([industry_obj.industry_name])[0]
                            # Collect for batch save
                            inds_embeddings_to_save.append({
                                'row_id': str(industry_obj.industry_id),
                                'embedding': ','.join(map(str, emb))
                            })
                        inds_embeddings.append(emb)
            # Degree description embedding
            desc_emb = None
            if getattr(program, 'description_embedding', None):
                desc_emb_str = program.description_embedding.strip('[]')
                desc_emb = np.array([float(x) for x in desc_emb_str.split(',')])
            else:
                # Compute and collect embedding if not present
                if getattr(program, 'description', None):
                    desc_emb = self.embedding_model.encode([program.description])[0]
                    desc_embeddings_to_save.append({
                        'row_id': str(program.program_id),
                        'embedding': ','.join(map(str, desc_emb)),
                        'secondary_id': 'description_embedding'
                    })
            # Combine all semantic embeddings (industry + description)
            all_sem_embs = []
            if inds_embeddings:
                all_sem_embs.extend(inds_embeddings)
            if desc_emb is not None:
                all_sem_embs.append(desc_emb)
            if all_sem_embs:
                semantic_embedding = np.mean(all_sem_embs, axis=0)
            else:
                semantic_embedding = np.zeros(384)
            semantic_embeddings.append(semantic_embedding)

            program_id_map[getattr(program, "program_id", None)] = i

        # Batch save all new industry and description embeddings
        if inds_embeddings_to_save:
            if hasattr(self, 'background_tasks') and self.background_tasks is not None:
                self.background_tasks.add_task(crud.save_embeddings_batch, self.db, 'industries', inds_embeddings_to_save)
            elif self.db is not None:
                crud.save_embeddings_batch(self.db, 'industries', inds_embeddings_to_save)
            else:
                print("No DB session available to save industry embeddings.")
        if desc_embeddings_to_save:
            if hasattr(self, 'background_tasks') and self.background_tasks is not None:
                self.background_tasks.add_task(crud.save_embeddings_batch, self.db, 'degree_programs', desc_embeddings_to_save)
            elif self.db is not None:
                crud.save_embeddings_batch(self.db, 'degree_programs', desc_embeddings_to_save)
            else:
                print("No DB session available to save description embeddings.")
        if desc_embeddings_to_save:
            crud.save_embeddings_batch(self.db, 'degree_programs', desc_embeddings_to_save)

        subject_df = pd.DataFrame(subject_data, columns=self.all_subjects)
        print("Subject DataFrame shape:", subject_df.shape)
        if semantic_embeddings:
            semantic_embedding_matrix = np.vstack(semantic_embeddings)
        else:
            semantic_embedding_matrix = np.zeros((0, 384))
        return subject_df, semantic_embedding_matrix, program_id_map, np.array(degree_norms)

    def recommend(self, user, degree_programs: list[DegreeProgram], top_n: int = 10, db=None, weights: dict = None, category_ranks: dict = None) -> list[Recommendation]:
        """
        Generates personalized degree recommendations for a given user.
        Args:
            user (User): The user to generate recommendations for.
            degree_programs (list[DegreeProgram]): List of degree programs to consider.
            top_n (int): The number of recommendations to return.
        Returns:
            list[Recommendation]: A list of Recommendation objects, each with program details
                        and a confidence score. Returns an empty list if user not found.
        """
        # 1. Pre-filter degree programs based on minimum GPA
        user_gpa = 0.0
        if user.academic_data and hasattr(user.academic_data, "gpa"):
            user_gpa = user.academic_data.gpa or 0.0
        eligible_programs = [program for program in degree_programs if user_gpa >= (getattr(program, "minimum_gpa", 0.0) or 0.0)]

        # 2. Set db for embedding saving
        self.db = db
        # 3. Create separate vectors for user and programs
        user_subject_vec, user_interest_vec = self._create_user_vectors(user)
        subject_matrix, semantic_embedding_matrix, program_id_map, degree_norms = self._create_degree_vectors(eligible_programs)

        if subject_matrix.empty or semantic_embedding_matrix.shape[0] == 0:
            print("Could not create feature vectors for eligible programs.")
            return []

        # 4. Calculate subject similarity (grades vs requirements)
        subject_sim = np.dot(user_subject_vec, subject_matrix.values.T) / degree_norms
        subject_sim = np.clip(subject_sim, 0.0, 1.0)  # Ensure scores stay between 0.0 and 1.0

        # 5. Calculate semantic similarity (user interests vs [industry+description] embeddings)
        user_interest_vec_reshaped = user_interest_vec.reshape(1, -1)
        semantic_sim = cosine_similarity(user_interest_vec_reshaped, semantic_embedding_matrix)[0]

        # Normalize to [0,1] assuming max similarity ~0.7
        semantic_sim = semantic_sim / 0.7
        semantic_sim = np.clip(semantic_sim, 0, 1)

        # 6. Combine similarities with weights from DB
        subject_weight = 0.3
        semantic_weight = 0.7
        if weights:
            subject_weight = weights.get('subject_similarity_weight', 0.3)
            semantic_weight = weights.get('semantic_similarity_weight', 0.7)
        combined_sim = subject_weight * subject_sim + semantic_weight * semantic_sim
        sim_scores = list(enumerate(combined_sim))

        # 7. Sort programs based on combined similarity scores
        sorted_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        top_program_indices = [i[0] for i in sorted_scores[:top_n]]

        # 8. Format and return the results
        recommendations = []
        idx_to_program_id = {v: k for k, v in program_id_map.items()}
        algorithm_source = weights["algorithm_id"]
        print(f"Algorithm Source ID: {algorithm_source}")
        for index in top_program_indices:
            program_id = idx_to_program_id[index]
            program = next((p for p in eligible_programs if getattr(p, "program_id", None) == program_id), None)
            if program:
                # Ensure program_type is always a string
                if getattr(program, "program_type", None) is None:
                    program.program_type = "Unknown"
                # Calculate scores for this program
                subject_score = float(subject_sim[index])
                semantic_score = float(semantic_sim[index])

                rec = Recommendation(
                    recommendation_id=uuid.uuid4(),
                    user_id=getattr(user, "user_id", None),
                    program_id=program.program_id,
                    confidence_score=round(float(sorted_scores[top_program_indices.index(index)][1]), 4),
                    market_score=0.0,
                    explanation=None,
                    created_at=datetime.now(),
                    liked=False,
                    algorithm_source=algorithm_source,
                    subject_score=subject_score,
                    semantic_score=semantic_score,
                    peer_score=0.0  # Default peer score, can be updated in rank_recommendations
                )
                rec.degree_program = program
                recommendations.append(rec)
        return recommendations