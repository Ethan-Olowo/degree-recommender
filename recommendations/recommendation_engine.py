from recommendations.content_based_filtering import ContentBasedFiltering
from recommendations.market_trend_analyzer import MarketTrendAnalyzer
from recommendations.peer_clustering import PeerClustering
from recommendations.recommendation_fusion import RecommendationFusion
from recommendations.explanation_generator import ExplanationGenerator
from models import StudentProfile, DegreeProgram, Recommendation


class RecommendationEngine:
    """
    A class to encapsulate Recommendation generation logic
    """

    explanation_generator: ExplanationGenerator
    market_trend_analyzer: MarketTrendAnalyzer
    content_based_filtering: ContentBasedFiltering
    peer_clustering: PeerClustering
    recommendation_fusion: RecommendationFusion

    def __init__(self):
        self.explanation_generator = ExplanationGenerator()
        self.market_trend_analyzer = MarketTrendAnalyzer()
        self.content_based_filtering = ContentBasedFiltering()
        self.peer_clustering = PeerClustering()
        self.recommendation_fusion = RecommendationFusion()



    def generate_recommendations(self, student_profile: StudentProfile) -> list[Recommendation]:
        """
        Generates a list of Degree Recommendations for the Student
        """
        reccomendations: list[Recommendation] = []
        reccomendations.__add__(self.content_based_filtering.recommend(student_profile))
        reccomendations.__add__(self.peer_clustering.recommend(student_profile))

        for recommendation in reccomendations:
            recommendation.marketScore = self.market_trend_analyzer.calculate_market_score(recommendation.degree_program)
        
        reccomendations = self.recommendation_fusion.rank_recommendations(reccomendations)
        
        reccomendations = reccomendations[0:5]  # Limit to top 5 recommendations
        return reccomendations


    def generate_explanation(self, student_profile: StudentProfile, degree_program: DegreeProgram, recommendation: Recommendation) -> str:
        """
        Generates a natural language explanation for a recommendation using an LLM.
        """
        trends = self.market_trend_analyzer.analyze_trends(degree_program)
        return self.explanation_generator.generate_explanation(student_profile, degree_program, recommendation, trends)
