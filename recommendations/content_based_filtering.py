from recommendations.grades_helper import normalize_grade
import uuid
from models import DegreeProgram, Recommendation, User
from database.schemas import AcademicData, SubjectGrade, Subject, DegreeIndustry, Industry, SubjectRequirement
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import database.crud as crud


class ContentBasedFiltering:
    """
    Implements a content-based recommendation algorithm to match users
    with suitable degree programs based on their profiles.
    """

    def __init__(self, subjects: list[Subject], industries: list[Industry]):
        """
        Initializes the recommender.
        """
        self._fit_encoders(subjects, industries)

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
        # Subject grades vector
        subject_grades = {}
        if user.academic_data.subject_grades:
            for sg in user.academic_data.subject_grades:
                if sg.subject and hasattr(sg.subject, "subject_name"):
                    subject_grades[sg.subject.subject_name] = normalize_grade(sg.grade) / 100
        subject_vector = np.array([subject_grades.get(subject, 0.0) for subject in self.all_subjects])

        # Interests embedding vector (average of all interest embeddings)
        interests = []
        interest_embeddings = []
        if user.personal_interests:
            for interest_obj in user.personal_interests:
                if hasattr(interest_obj, "interest"):
                    interests.append(interest_obj.interest)
                    if getattr(interest_obj, 'embedding', None):
                        emb_str = interest_obj.embedding.strip('[]')
                        emb = np.array([float(x) for x in emb_str.split(',')])
                    else:
                        emb = self.embedding_model.encode([interest_obj.interest])[0]
                        # Save embedding to DB
                        crud.save_embedding(self.db, 'personal_interests', str(user.user_id), ','.join(map(str, emb)), secondary_id=interest_obj.interest)
                    interest_embeddings.append(emb)
        if interest_embeddings:
            interest_vector = np.mean(interest_embeddings, axis=0)
        else:
            # Use default embedding size (MiniLM-L6-v2: 384)
            interest_vector = np.zeros(384)
        return subject_vector, interest_vector

    def _create_degree_vectors(self, programs: list[DegreeProgram]) -> tuple[pd.DataFrame, np.ndarray, dict]:
        """
        Creates separate matrices for subject requirements and industries for degree programs.
        Returns:
            tuple: (subject_matrix, industry_embedding_matrix, program_id_map)
        """
        subject_data = []
        industry_embeddings = []
        program_id_map = {}
        for i, program in enumerate(programs):
            # Subject requirement vector
            requirements = {}
            if program.subject_requirements:
                for req in program.subject_requirements:
                    if req.subject and hasattr(req.subject, "subject_name"):
                        requirements[req.subject.subject_name] = 1.0 if req.requirement_detail == "Required" else 0.7
            subject_vector = [requirements.get(subject, 0.0) for subject in self.all_subjects]
            subject_data.append(subject_vector)

            # Industry embedding vector (average of all industry embeddings for the program)
            inds_embeddings = []
            if program.degree_industries:
                for degree_ind_obj in program.degree_industries:
                    # degree_ind_obj is DegreeIndustry, get industry object
                    industry_obj = getattr(degree_ind_obj, 'industry', None)
                    if industry_obj:
                        if getattr(industry_obj, 'embedding', None):
                            emb_str = industry_obj.embedding.strip('[]')
                            emb = np.array([float(x) for x in emb_str.split(',')])
                        else:
                            emb = self.embedding_model.encode([industry_obj.industry_name])[0]
                            # Save embedding to DB
                            crud.save_embedding(self.db, 'industries', str(industry_obj.industry_id), ','.join(map(str, emb)))
                        inds_embeddings.append(emb)
            if inds_embeddings:
                industry_embedding = np.mean(inds_embeddings, axis=0)
            else:
                industry_embedding = np.zeros(384)
            industry_embeddings.append(industry_embedding)

            program_id_map[getattr(program, "program_id", None)] = i

        subject_df = pd.DataFrame(subject_data, columns=self.all_subjects)
        if industry_embeddings:
            industry_embedding_matrix = np.vstack(industry_embeddings)
        else:
            industry_embedding_matrix = np.zeros((0, 384))
        return subject_df, industry_embedding_matrix, program_id_map

    def recommend(self, user, degree_programs: list[DegreeProgram], top_n: int = 10, db=None) -> list[Recommendation]:
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
        eligible_programs = [program for program in degree_programs if user_gpa >= getattr(program, "minimum_gpa", 0.0)]

        # 2. Set db for embedding saving
        self.db = db
        # 3. Create separate vectors for user and programs
        user_subject_vec, user_interest_vec = self._create_user_vectors(user)
        subject_matrix, industry_embedding_matrix, program_id_map = self._create_degree_vectors(eligible_programs)

        if subject_matrix.empty or industry_embedding_matrix.shape[0] == 0:
            print("Could not create feature vectors for eligible programs.")
            return []

        # 3. Calculate subject similarity (grades vs requirements)
        user_subject_vec_reshaped = user_subject_vec.reshape(1, -1)
        subject_sim = cosine_similarity(user_subject_vec_reshaped, subject_matrix.values)[0]

        # 4. Calculate semantic similarity (interests vs industries) using embeddings
        user_interest_vec_reshaped = user_interest_vec.reshape(1, -1)
        semantic_sim = cosine_similarity(user_interest_vec_reshaped, industry_embedding_matrix)[0]

        # 5. Combine similarities with weights
        combined_sim = 0.3 * subject_sim + 0.7 * semantic_sim
        sim_scores = list(enumerate(combined_sim))

        # 6. Sort programs based on combined similarity scores
        sorted_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        top_program_indices = [i[0] for i in sorted_scores[:top_n]]

        # 7. Format and return the results
        recommendations = []
        idx_to_program_id = {v: k for k, v in program_id_map.items()}
        for index in top_program_indices:
            program_id = idx_to_program_id[index]
            program = next((p for p in eligible_programs if getattr(p, "program_id", None) == program_id), None)
            if program:
                from datetime import datetime
                rec = Recommendation(
                    recommendation_id=uuid.uuid4(),
                    user_id=getattr(user, "user_id", None),
                    program_id=program.program_id,
                    confidence_score=round(float(sorted_scores[top_program_indices.index(index)][1]), 4),
                    market_score=0.0,
                    explanation=None,
                    created_at=datetime.now(),
                    liked=False
                )
                rec.degree_program = program
                recommendations.append(rec)
        return recommendations