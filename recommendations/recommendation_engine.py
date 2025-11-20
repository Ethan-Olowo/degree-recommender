from recommendations.content_based_filtering import ContentBasedFiltering
from recommendations.market_trend_analyzer import MarketTrendAnalyzer
from recommendations.peer_clustering import PeerClustering
from recommendations.explanation_generator import ExplanationGenerator
from models import DegreeProgram, Recommendation, User, RecommendationCreate
from database.schemas import AcademicData, MarketIndicatorValue, SubjectGrade, Subject, DegreeIndustry, Industry, SubjectRequirement
from database.crud import get_subjects, get_degree_programs, get_industries, get_current_recommendation_weights, get_market_indicator_values, save_category_confidences_batch, create_recommendations_batch, update_recommendation_explanation
from fastapi import BackgroundTasks

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



    def generate_recommendations(self, user: User, db=None, background_tasks: BackgroundTasks = None) -> list[Recommendation]:
        """
        Generates a list of Degree Recommendations for the User and persists them in the database.
        """
        # Prepare input_tensor from user (implement feature extraction as needed)
        category_preds = self.peer_clustering.recommend(user)
        self.categories = category_preds
        # Save category predictions to DB in batch
        if db is not None and background_tasks is not None:
            # Aggregate all confidences and add a single background task
            confidences = [
                {'predicted_category': cat['category'], 'prediction_confidence': cat['score']}
                for cat in category_preds
            ]
            if confidences:
                background_tasks.add_task(save_category_confidences_batch, db, confidences, str(user.user_id))
        elif db is not None:
            confidences = [
                {'predicted_category': cat['category'], 'prediction_confidence': cat['score']}
                for cat in category_preds
            ]
            if confidences:
                save_category_confidences_batch(db, confidences, str(user.user_id))

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

        # Persist recommendations in DB and return DB objects
        db_recommendations = []
        if db is not None and background_tasks is not None:
            # Batch all recommendations and add as a single background task
            recs_to_create = [
                RecommendationCreate(
                    user_id=user.user_id,
                    program_id=rec_obj.degree_program.program_id,
                    confidence_score=rec_obj.confidence_score,
                    market_score=rec_obj.market_score,
                    explanation=rec_obj.explanation,
                    created_at=rec_obj.created_at,
                    liked=rec_obj.liked,
                    algorithm_source=rec_obj.algorithm_source,
                    subject_score=rec_obj.subject_score,
                    semantic_score=rec_obj.semantic_score,
                    peer_score=rec_obj.peer_score
                )
                for rec_obj in recommendations
            ]
            if recs_to_create:
                background_tasks.add_task(create_recommendations_batch, db, recs_to_create, user.user_id)
            return recommendations
        elif db is not None:
            recs_to_create = [
                RecommendationCreate(
                    user_id=user.user_id,
                    program_id=rec_obj.degree_program.program_id,
                    confidence_score=rec_obj.confidence_score,
                    market_score=rec_obj.market_score,
                    explanation=rec_obj.explanation,
                    created_at=rec_obj.created_at,
                    liked=rec_obj.liked,
                    algorithm_source=rec_obj.algorithm_source,
                    subject_score=rec_obj.subject_score,
                    semantic_score=rec_obj.semantic_score,
                    peer_score=rec_obj.peer_score
                )
                for rec_obj in recommendations
            ]
            if recs_to_create:
                db_recommendations = create_recommendations_batch(db, recs_to_create, user.user_id)
            return db_recommendations
        else:
            return recommendations


    def generate_explanation(self, user: User, degree_program: DegreeProgram, recommendation: Recommendation, db=None, background_tasks: BackgroundTasks = None) -> str:
        """
        Generates a natural language explanation for a recommendation using an LLM.
        """
        trends = self.market_trend_analyzer.analyze_trends(degree_program)
        explanation = self.explanation_generator.generate_explanation(user, degree_program, recommendation, trends)
        if db is not None and background_tasks is not None:
            background_tasks.add_task(update_recommendation_explanation, db, recommendation_id=recommendation.recommendation_id, explanation=explanation)
        elif db is not None:
            update_recommendation_explanation(db, recommendation_id=recommendation.recommendation_id, explanation=explanation)
        return explanation

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