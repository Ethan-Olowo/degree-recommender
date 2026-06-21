from recommendations.content_based_filtering import ContentBasedFiltering
from recommendations.market_trend_analyzer import MarketTrendAnalyzer
from recommendations.peer_clustering import PeerClustering
from recommendations.explanation_generator import ExplanationGenerator
from models import DegreeProgram, Recommendation, User, RecommendationCreate
from database.schemas import AcademicData, MarketIndicatorValue, SubjectGrade, Subject, DegreeIndustry, Industry, SubjectRequirement
from database.crud import get_subjects, get_degree_programs, get_industries, get_current_recommendation_weights, get_market_indicator_values, save_category_confidences_batch, create_recommendations_batch, update_recommendation_explanation, get_market_indicators_for_past_year
from database.crud import save_category_confidences_batch_in_task, create_recommendations_batch_in_task, update_recommendation_explanation_in_task
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
        category_preds = self.peer_clustering.recommend(user)
        self.categories = category_preds
        
         #Aggregate all confidences and add a single background task
        confidences = [
            {'predicted_category': cat['category'], 'prediction_confidence': cat['score']}
            for cat in category_preds
        ]
        # Save category predictions to DB in batch
        if db is not None and background_tasks is not None and confidences:
            background_tasks.add_task(save_category_confidences_batch_in_task, confidences, str(user.user_id))
        elif db is not None and confidences:
            save_category_confidences_batch(db, confidences, str(user.user_id))

        if self.degree_programs == []:
            if db is not None:
                self.degree_programs = get_degree_programs(db)
                # Ensure industries are populated
                for program in self.degree_programs:
                    program.industries = program.industries or []
        
        self.subjects = get_subjects(db)
        self.industries = get_industries(db)

        # Update attributes
        self.content_based_filtering.all_subjects = [s.subject_name for s in self.subjects]
        self.content_based_filtering.all_industries = [i.industry_name for i in self.industries]

        # --- Fetch weights from DB ---
        weights = get_current_recommendation_weights(db) if db is not None else None
        print(weights["algorithm_id"] if weights else "No weights found")

        recommendations: list[Recommendation] = []
        filtered_programs = self.filter_programs([cat['category'] for cat in self.categories])

        # Compute category ranks for peer_score
        category_ranks = {cat['category']: idx for idx, cat in enumerate(self.categories)}

        if len(filtered_programs) >= 20:
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

        # Use the new function to fetch market indicators
        self.indicators = get_market_indicators_for_past_year(db)
        self.market_trend_analyzer.indicators = [indicator for indicator in self.indicators if indicator.country_code == user.socioeconomic.country_code or indicator.country_code is None]

        program_market_scores = {}
        for recommendation in recommendations:
            degree_program = recommendation.degree_program
            # Check if a similar degree program's market score is already calculated
            matching_program = next(
                (prog for prog in program_market_scores if set(getattr(prog, 'industries', []) or []) == set(getattr(degree_program, 'industries', []) or [])),
                None
            )
            print(getattr(degree_program, 'industries', []))
            if matching_program:
                recommendation.market_score = program_market_scores[matching_program]
            else:
                recommendation.market_score = self.market_trend_analyzer.calculate_market_score(degree_program)
                program_market_scores[degree_program] = recommendation.market_score

        content_importance = self.get_content_importance(user)
        market_importance = self.get_market_importance(user)

        recommendations = self.rank_recommendations(recommendations, weights=weights, content_importance=content_importance, market_importance=market_importance)
        recommendations = recommendations[0:5]  # Limit to top 5 recommendations

        # Persist recommendations in DB and return DB objects
        db_recommendations = []
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
        if db is not None and background_tasks is not None:
            if recs_to_create:
                background_tasks.add_task(create_recommendations_batch_in_task, recs_to_create, user.user_id)
            return recommendations
        elif db is not None:
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
            background_tasks.add_task(update_recommendation_explanation_in_task, recommendation.recommendation_id, explanation)
        elif db is not None:
            update_recommendation_explanation(db, recommendation_id=recommendation.recommendation_id, explanation=explanation)
        return explanation

    def filter_programs(self, categories: list[str]) -> list[DegreeProgram]:
        """
        Filters degree programs by category.
        """
        return [program for program in self.degree_programs if program.category in categories]
    
    def rank_recommendations(self, recommendations: list[Recommendation], weights: dict = None, content_importance: float = 1.0, market_importance: float = 1.0) -> list[Recommendation]:
        """
        Ranks recommendations based on a weighted score of confidence, market scores, and peer scores.
        """
        # Calculate peer scores using prediction confidences, clipped between 0 and 1
        category_confidences = {cat['category']: max(0, min(cat['score'] * 5, 1)) for cat in self.categories}

        # Default weights
        confidence_score_weight = 0.65
        market_score_weight = 0.3
        category_rank_weight = 0.05
        if weights:
            confidence_score_weight = weights.get('confidence_score_weight', 0.65)
            market_score_weight = weights.get('market_score_weight', 0.3)
            category_rank_weight = weights.get('category_rank_weight', 0.05)

        confidence_score_weight *= content_importance
        market_score_weight *= market_importance

        total_weight = confidence_score_weight + market_score_weight + category_rank_weight
        confidence_score_weight /= total_weight
        market_score_weight /= total_weight
        category_rank_weight /= total_weight

        weighted_scores = []
        for rec in recommendations:
            # Calculate peer score based on category confidences
            rec.peer_score = category_confidences.get(rec.degree_program.category, 0.0)

            score = (
                confidence_score_weight * rec.confidence_score +
                market_score_weight * rec.market_score +
                category_rank_weight * rec.peer_score # Higher rank gets higher score
            )
            weighted_scores.append((score, rec))

        weighted_scores.sort(key=lambda x: x[0], reverse=True)
        recommendations = [rec for _, rec in weighted_scores]
        return recommendations
    
    def get_market_importance(self, user: User)->float:
        """
        Determines the importance of market trends based on user's socioeconomic status.
        """
        if user.socioeconomic and user.socioeconomic.income_level:
            income_level = user.socioeconomic.income_level.lower()
            if income_level == 'low':
                return 1.5
            elif income_level == 'medium':
                return 1
            elif income_level == 'high':
                return 0.5
        return 1  # Default importance
    
    def get_content_importance(self, user: User)->float:
        """
        Determines the importance of content-based factors based on amount of interests and academic performance.
        """
        interest_count = len(user.personal_interests) if user.personal_interests else 0
        subject_count = len(user.academic_data.subject_grades) if user.academic_data and user.academic_data.subject_grades else 0
        total_count = subject_count + interest_count
        importance = 1
        if total_count >= 10:
            importance = 1.5
        elif total_count <= 3:
            importance = 0.5
        
        return importance