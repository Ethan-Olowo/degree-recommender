from recommendations.grades_helper import normalize_grade
import uuid
from models import DegreeProgram, Recommendation, User
from database.schemas import AcademicData, SubjectGrade, Subject, DegreeIndustry, Industry, SubjectRequirement
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MultiLabelBinarizer



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
        self.interest_encoder = MultiLabelBinarizer(classes=self.all_industries)
        self.interest_encoder.fit([self.all_industries])

    def _create_user_vector(self, user: User) -> np.ndarray:
        """
        Creates a numerical vector representation of a user's profile.
        Args:
            user (User): The user object.
        Returns:
            np.ndarray: A 1D NumPy array representing the user's feature vector.
        """
        # 1. Create the subject vector based on grades
        subject_grades = {}
        if user.academic_data.subject_grades:
            for sg in user.academic_data.subject_grades:
                if sg.subject and hasattr(sg.subject, "subject_name"):
                    subject_grades[sg.subject.subject_name] = normalize_grade(sg.grade) / 100
        subject_vector = [subject_grades.get(subject, 0.0) for subject in self.all_subjects]

        # 2. Create the interest vector from personal interests
        interests = []
        if user.personal_interests:
            for interest in user.personal_interests:
                if hasattr(interest, "interest"):
                    interests.append(interest.interest)
        interest_vector = self.interest_encoder.transform([interests])[0]

        # 3. Combine vectors into a single 1D array
        return np.concatenate([subject_vector, interest_vector])

    def _create_degree_vectors(self, programs: list[DegreeProgram]) -> tuple[pd.DataFrame, dict]:
        """
        Creates a matrix of numerical vectors for a list of degree programs.
        Args:
            programs (list[DegreeProgram]): The list of degree programs to vectorize.
        Returns:
            tuple: A pandas DataFrame containing the vectorized programs and a
                   dictionary mapping program ID to its index.
        """
        program_data = []
        program_id_map = {}
        for i, program in enumerate(programs):
            # 1. Create the subject requirement vector
            requirements = {}
            if program.subject_requirements:
                for req in program.subject_requirements:
                    if req.subject and hasattr(req.subject, "subject_name"):
                        requirements[req.subject.subject_name] = 1.0 if req.requirement_detail == "Required" else 0.7
            subject_vector = [requirements.get(subject, 0.0) for subject in self.all_subjects]

            # 2. Create the industry vector for the degree
            industries = []
            if program.degree_industries:
                for ind in program.degree_industries:
                    industries.append(ind)
            industry_vector = self.interest_encoder.transform([industries])[0]

            # 3. Combine vectors
            combined_vector = np.concatenate([subject_vector, industry_vector])
            program_data.append(combined_vector)
            program_id_map[getattr(program, "program_id", None)] = i

        df = pd.DataFrame(program_data, columns=self.all_subjects + self.all_industries)
        return df, program_id_map

    def recommend(self, user, degree_programs: list[DegreeProgram], top_n: int = 10) -> list[Recommendation]:
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

        # 2. Create vectors for the user and the eligible programs
        user_vector = self._create_user_vector(user)
        degree_matrix, program_id_map = self._create_degree_vectors(eligible_programs)

        if degree_matrix.empty:
            print("Could not create feature vectors for eligible programs.")
            return []

        # 3. Calculate cosine similarity
        user_vector_reshaped = user_vector.reshape(1, -1)
        cosine_sim = cosine_similarity(user_vector_reshaped, degree_matrix.values)
        sim_scores = list(enumerate(cosine_sim[0]))

        # 4. Sort programs based on similarity scores
        sorted_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        top_program_indices = [i[0] for i in sorted_scores[:top_n]]

        # 5. Format and return the results
        from models import Recommendation
        recommendations = []
        idx_to_program_id = {v: k for k, v in program_id_map.items()}
        for index in top_program_indices:
            program_id = idx_to_program_id[index]
            program = next((p for p in eligible_programs if getattr(p, "program_id", None) == program_id), None)
            if program:
                # Create Recommendation object
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
                # Attach degree_program for downstream usage (not in schema, but used by engine)
                rec.degree_program = program
                recommendations.append(rec)
        return recommendations