from models import StudentProfile, Recommendation
from abc import ABC, abstractmethod

class RecommendationAlgorithm:
    """
    A class to encapsulate the recommendation algorithm logic.
    """
    def __init__(self):
        pass

    @abstractmethod
    def recommend(self, student_profile: StudentProfile) -> Recommendation:
        """
        Recommend a degree program based on the student's profile.
        """
        return None  # Placeholder for actual recommendation logic
