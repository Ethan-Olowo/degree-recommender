from recommendations.content_based_filtering import ContentBasedFiltering
from recommendations.market_trend_analyzer import MarketTrendAnalyzer
from recommendations.peer_clustering import PeerClustering
from recommendations.explanation_generator import ExplanationGenerator
from models import DegreeProgram, Recommendation, User
from database.schemas import AcademicData, SubjectGrade, Subject, DegreeIndustry, Industry, SubjectRequirement
from database.crud import save_category_confidence, get_subjects, get_degree_programs, get_industries


class RecommendationEngine:
    """
    A class to encapsulate Recommendation generation logic
    """

    explanation_generator: ExplanationGenerator
    market_trend_analyzer: MarketTrendAnalyzer
    content_based_filtering: ContentBasedFiltering
    peer_clustering: PeerClustering
    degree_programs: list[DegreeProgram]
    subjects: list[Subject]
    industries: list[Industry]
    categories: list[dict]

    def __init__(self, db=None):
        """
        Optionally pass a db session to load subjects, degree_programs, and industries from the database.
        """
        self.explanation_generator = ExplanationGenerator()
        self.market_trend_analyzer = MarketTrendAnalyzer()
        self.peer_clustering = PeerClustering()
        self.categories = []
        self.subjects = []
        self.degree_programs = []
        self.industries = []
        
        self.content_based_filtering = ContentBasedFiltering(subjects=self.subjects, industries=self.industries)



    def generate_recommendations(self, user: User, db=None) -> list[Recommendation]:
        """
        Generates a list of Degree Recommendations for the User
        """


        # Prepare input_tensor from user (implement feature extraction as needed)
        category_preds = self.peer_clustering.recommend(user)
        self.categories = category_preds
        # Save category predictions to DB
        if db is not None:
            for cat in category_preds:
                save_category_confidence(db, str(user.user_id), cat['category'], cat['score'])

        if(self.degree_programs == []):
            if db is not None:
                self.degree_programs = get_degree_programs(db)
        if(self.subjects == []):
            if db is not None:
                self.subjects = get_subjects(db)
        if(self.industries == []):
            if db is not None:
                self.industries = get_industries(db)

        self.content_based_filtering = ContentBasedFiltering(subjects=self.subjects, industries=self.industries)

        recommendations: list[Recommendation] = []
        filtered_programs = self.filter_programs([cat['category'] for cat in self.categories])
        recommendations.extend(self.content_based_filtering.recommend(user, degree_programs=filtered_programs))

        if len(recommendations) < 10:
            recommendations = []
            recommendations.extend(self.content_based_filtering.recommend(user, degree_programs=self.degree_programs))

        for recommendation in recommendations:
            recommendation.market_score = self.market_trend_analyzer.calculate_market_score(recommendation.degree_program)

        recommendations = self.rank_recommendations(recommendations)
        recommendations = recommendations[0:5]  # Limit to top 5 recommendations
        return recommendations


    def generate_explanation(self, user: User, degree_program: DegreeProgram, recommendation: Recommendation) -> str:
        """
        Generates a natural language explanation for a recommendation using an LLM.
        """
        trends = self.market_trend_analyzer.analyze_trends(degree_program)
        return self.explanation_generator.generate_explanation(user, degree_program, recommendation, trends)

    def filter_programs(self, categories: list[str]) -> list[DegreeProgram]:
        """
        Filters degree programs by category.
        """
        return [program for program in self.degree_programs if program.category in categories]
    
    def rank_recommendations(self, recommendations: list[Recommendation]) -> list[Recommendation]:
        """
        Ranks recommendations based on a weighted score of confidence and market scores.
        """
        # Calculate category ranks (position in the array) for each recommendation
        category_ranks = {cat['category']: idx for idx, cat in enumerate(self.categories)}

        weighted_scores = []
        for idx, rec in enumerate(recommendations):
            category_rank = category_ranks.get(rec.degree_program.category, 4)  # Default to last rank if not found
            score = (
                0.65 * rec.confidence_score +
                0.3 * rec.market_score +
                0.05 * (1 - category_rank / 4)  # Higher rank gets higher score
            )
            weighted_scores.append((score, rec))

        weighted_scores.sort(key=lambda x: x[0], reverse=True)
        recommendations = [rec for _, rec in weighted_scores]
        return recommendations