from recommendations.content_based_filtering import ContentBasedFiltering
from recommendations.market_trend_analyzer import MarketTrendAnalyzer
from recommendations.peer_clustering import PeerClustering
from recommendations.explanation_generator import ExplanationGenerator
from models import DegreeProgram, Recommendation, User
from database.schemas import AcademicData, MarketIndicatorValue, SubjectGrade, Subject, DegreeIndustry, Industry, SubjectRequirement
from database.crud import save_category_confidence, get_subjects, get_degree_programs, get_industries, get_current_recommendation_weights, get_market_indicator_values

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
    indicators: list[MarketIndicatorValue]

    def __init__(self, db=None):
        """
        Optionally pass a db session to load subjects, degree_programs, and industries from the database.
        """
        self.explanation_generator = ExplanationGenerator()
        self.market_trend_analyzer = MarketTrendAnalyzer(indicators=[])
        self.peer_clustering = PeerClustering()
        self.categories = []
        self.subjects = []
        self.degree_programs = []
        self.industries = []
        self.indicators = []
        
        self.content_based_filtering = ContentBasedFiltering(subjects=[], industries=[])



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

        if self.degree_programs == []:
            if db is not None:
                self.degree_programs = get_degree_programs(db)
        if self.subjects == [] and db is not None:
            self.subjects = get_subjects(db)
        if self.industries == [] and db is not None:
            self.industries = get_industries(db)

        # Update attributes instead of reinitializing
        self.content_based_filtering.all_subjects = [s.subject_name for s in self.subjects]
        self.content_based_filtering.all_industries = [i.industry_name for i in self.industries]

        # --- Fetch weights from DB ---
        weights = get_current_recommendation_weights(db) if db is not None else None
        print(weights["algorithm_id"] if weights else "No weights found")

        recommendations: list[Recommendation] = []
        filtered_programs = self.filter_programs([cat['category'] for cat in self.categories])

        # Compute category ranks for peer_score
        category_ranks = {cat['category']: idx for idx, cat in enumerate(self.categories)}

        if len(filtered_programs) >= 10:
            recommendations.extend(self.content_based_filtering.recommend(
                user,
                degree_programs=filtered_programs,
                db=db,
                weights=weights,
                category_ranks=category_ranks
            ))
        else:
            recommendations.extend(self.content_based_filtering.recommend(
                user,
                degree_programs=self.degree_programs,
                db=db,
                weights=weights,
                category_ranks=category_ranks
            ))

        self.indicators = get_market_indicator_values(db, country_code=user.socioeconomic.country_code)
        self.market_trend_analyzer.indicators = self.indicators

        for recommendation in recommendations:
            recommendation.market_score = self.market_trend_analyzer.calculate_market_score(recommendation.degree_program)

        recommendations = self.rank_recommendations(recommendations, weights=weights)
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
    
    def rank_recommendations(self, recommendations: list[Recommendation], weights: dict = None) -> list[Recommendation]:
        """
        Ranks recommendations based on a weighted score of confidence and market scores, using weights from DB.
        """
        # Calculate category ranks (position in the array) for each recommendation
        category_ranks = {cat['category']: idx for idx, cat in enumerate(self.categories)}

        # Default weights
        confidence_score_weight = 0.65
        market_score_weight = 0.3
        category_rank_weight = 0.05
        if weights:
            confidence_score_weight = weights.get('confidence_score_weight', 0.65)
            market_score_weight = weights.get('market_score_weight', 0.3)
            category_rank_weight = weights.get('category_rank_weight', 0.05)

        weighted_scores = []
        for idx, rec in enumerate(recommendations):
            score = (
                confidence_score_weight * rec.confidence_score +
                market_score_weight * rec.market_score +
                category_rank_weight * rec.peer_score # Higher rank gets higher score
            )
            weighted_scores.append((score, rec))

        weighted_scores.sort(key=lambda x: x[0], reverse=True)
        recommendations = [rec for _, rec in weighted_scores]
        return recommendations