
from sqlalchemy.orm import Session
import functools
import database.schemas as schema, models
import uuid
import datetime
from sqlalchemy import desc
from database.schemas import RecommendationWeights
from sqlalchemy.orm import joinedload
import datetime

# User CRUD
def get_user(db: Session, user_id: str):
    return db.query(schema.User).filter(schema.User.user_id == user_id).first()

# CategoryConfidence CRUD
def save_category_confidences_batch(db: Session, confidences: list[dict], user_id: str):
    """
    Saves a batch of category confidences in a single transaction.
    confidences: List of dicts with keys: predicted_category, prediction_confidence
    """
    import uuid, datetime
    db_confidences = [
        schema.CategoryConfidence(
            prediction_id=str(uuid.uuid4()),
            created_at=datetime.datetime.now(),
            predicted_category=conf['predicted_category'],
            user_id=user_id,
            prediction_confidence=conf['prediction_confidence']
        )
        for conf in confidences
    ]
    if not db_confidences:
        return []
    db.add_all(db_confidences)
    db.commit()
    for conf in db_confidences:
        db.refresh(conf)
    return db_confidences

# Personal Interest CRUD
def get_personal_interests(db: Session, user_id: str):
    return db.query(schema.PersonalInterest).filter(schema.PersonalInterest.user_id == user_id).all()

# Socioeconomic Indicator CRUD
def get_socioeconomic_indicator(db: Session, user_id: str):
    return db.query(schema.SocioeconomicIndicator).filter(schema.SocioeconomicIndicator.user_id == user_id).first()


def get_academic_data(db: Session, user_id: str):
    return db.query(schema.AcademicData).filter(schema.AcademicData.user_id == user_id).first()

# Recommendation CRUD
def create_recommendations_batch(db: Session, recommendations: list[models.RecommendationCreate], user_id: str):
    """
    Saves a batch of recommendations in a single transaction.
    """
    db_recommendations = [
        schema.Recommendation(
            recommendation_id=str(uuid.uuid4()),
            user_id=user_id,
            program_id=rec.program_id,
            confidence_score=rec.confidence_score,
            market_score=rec.market_score,
            explanation=getattr(rec, "explanation", None),
            created_at=getattr(rec, "created_at", datetime.datetime.now()),
            liked=getattr(rec, "liked", False),
            algorithm_source=getattr(rec, "algorithm_source", None),
            subject_score=getattr(rec, "subject_score", None),
            semantic_score=getattr(rec, "semantic_score", None),
            peer_score=getattr(rec, "peer_score", None)
        )
        for rec in recommendations
    ]
    if not db_recommendations:
        return []
    db.add_all(db_recommendations)
    db.commit()
    for rec in db_recommendations:
        db.refresh(rec)
    return db_recommendations

def get_recommendations(db: Session, user_id: str = None, skip: int = 0, limit: int = 100):
    query = db.query(schema.Recommendation)
    if user_id:
        query = query.filter(schema.Recommendation.user_id == user_id)
    return query.offset(skip).limit(limit).all()

def get_recommendation(db: Session, recommendation_id: str):
    return db.query(schema.Recommendation).filter(schema.Recommendation.recommendation_id == recommendation_id).first()

def update_recommendation_explanation(db: Session, recommendation_id: str, explanation: str):
    db_recommendation = get_recommendation(db, recommendation_id)
    if db_recommendation:
        db_recommendation.explanation = explanation
        db.commit()
        db.refresh(db_recommendation)
    return db_recommendation

def delete_recommendations_by_user_id(db: Session, user_id: str):
    db.query(schema.Recommendation).filter(schema.Recommendation.user_id == user_id).delete()
    db.commit()

def get_degree_program(db: Session, program_id: str):
    return db.query(schema.DegreeProgram).filter(schema.DegreeProgram.program_id == program_id).first()

@functools.lru_cache(maxsize=None)
def get_degree_programs(db: Session, skip: int = 0, limit: int = 100):
    print("Cache miss: Fetching degree programs from DB")
    return db.query(schema.DegreeProgram).offset(skip).limit(limit).all()

# Subject CRUD

def get_subject(db: Session, subject_id: str):
    return db.query(schema.Subject).filter(schema.Subject.subject_id == subject_id).first()

@functools.lru_cache(maxsize=None)
def get_subjects(db: Session, skip: int = 0, limit: int = 100):
    print("Cache miss: Fetching subjects from DB")
    return db.query(schema.Subject).offset(skip).limit(limit).all()

# SubjectGrade CRUD

def get_subject_grades_by_academic_data(db: Session, academic_data_id: str):
    return db.query(schema.SubjectGrade).filter(schema.SubjectGrade.academic_data_id == academic_data_id).all()

# SubjectRequirement CRUD

def get_subject_requirements_by_program(db: Session, program_id: str):
    return db.query(schema.SubjectRequirement).filter(schema.SubjectRequirement.program_id == program_id).all()

# Industry CRUD
@functools.lru_cache(maxsize=None)
def get_industries(db: Session, skip: int = 0, limit: int = 100):
    print("Cache miss: Fetching industries from DB")
    return db.query(schema.Industry).offset(skip).limit(limit).all()

# Generic Embedding CRUD
def save_embeddings_batch(db: Session, table: str, embeddings: list[dict]):
    """
    Saves a batch of embeddings for a given table in a single transaction.
    Each dict in embeddings should have keys: row_id, embedding, (optional) secondary_id
    """
    model_map = {
        'personal_interests': schema.PersonalInterest,
        'subjects': schema.Subject,
        'industries': schema.Industry,
        'degree_programs': schema.DegreeProgram
    }
    pk_map = {
        'personal_interests': ['user_id', 'interest'],
        'subjects': ['subject_id'],
        'industries': ['industry_id'],
        'degree_programs': ['program_id']
    }
    model = model_map.get(table)
    pk_fields = pk_map[table]
    db_instances = []
    for emb in embeddings:
        row_id = emb['row_id']
        embedding = emb['embedding']
        secondary_id = emb.get('secondary_id')
        # Ensure embedding is wrapped in square brackets for PostgreSQL vector type
        if not embedding.startswith('['):
            embedding = f'[{embedding}]'
        # Find or create instance
        query = db.query(model)
        if table == 'personal_interests' and secondary_id is not None:
            instance = query.filter(getattr(model, pk_fields[0]) == row_id, getattr(model, pk_fields[1]) == secondary_id).first()
        else:
            instance = query.filter(getattr(model, pk_fields[0]) == row_id).first()
        if not instance:
            # Create new instance
            if table == 'personal_interests' and secondary_id is not None:
                instance = model(user_id=row_id, interest=secondary_id, embedding=embedding)
            else:
                instance = model(**{pk_fields[0]: row_id}, embedding=embedding)
        else:
            if table == 'degree_programs':
                instance.description_embedding = embedding
            else:
                instance.embedding = embedding
        db_instances.append(instance)
    if not db_instances:
        return []
    db.add_all(db_instances)
    db.commit()
    for inst in db_instances:
        db.refresh(inst)
    return db_instances


# --- Recommendation Weights ---
@functools.lru_cache(maxsize=None)
def get_current_recommendation_weights(db):
    """
    Fetch the current (latest) recommendation weights from the recommendation_weights table.
    Returns a dict with all weights and the algorithm_id.
    """
    # Try to get the row where current=True, else get the latest by created_at
    weights = db.query(RecommendationWeights).filter_by(current=True).order_by(desc(RecommendationWeights.created_at)).first()
    if not weights:
        weights = db.query(RecommendationWeights).order_by(desc(RecommendationWeights.created_at)).first()
    if not weights:
        # Fallback to defaults if table is empty
        return {
            'algorithm_id': None,
            'subject_similarity_weight': 0.3,
            'semantic_similarity_weight': 0.7,
            'confidence_score_weight': 0.65,
            'market_score_weight': 0.3,
            'category_rank_weight': 0.05
        }
    return {
        'algorithm_id': weights.algorithm_id,
        'subject_similarity_weight': weights.subject_similarity_weight,
        'semantic_similarity_weight': weights.semantic_similarity_weight,
        'confidence_score_weight': weights.confidence_score_weight,
        'market_score_weight': weights.market_score_weight,
        'category_rank_weight': weights.category_rank_weight
    }

# market indicator value CRUD
def get_market_indicator_values(
    db: Session,
    country_code: str = None,
    years: list[int] = None,
    indicator_names: list = None
):
    """
    Retrieve market indicator values from the database for a given country and year.

    Parameters:
        db (Session): SQLAlchemy database session.
        country_code (str, optional): Country code to filter market indicators. If None, fetches global indicators.
        year (datetime, optional): Minimum last_updated date for indicators. Defaults to January 1st of last year.
        indicator_names (list, optional): List of indicator names to filter. If None, fetches all indicators.
    Returns:
        list: List of MarketIndicatorValue objects matching the criteria.
    """
    if years is None:
        years = [(datetime.datetime.now().year - 1)]
    
    indicators = []

    # Eagerly load relationships to avoid DetachedInstanceError
    eager_options = [
        joinedload(schema.MarketIndicatorValue.indicator_type),
        joinedload(schema.MarketIndicatorValue.industry)
    ]

    if country_code:
        country_query = db.query(schema.MarketIndicatorValue).options(*eager_options).filter(
            schema.MarketIndicatorValue.country_code == country_code,
            schema.MarketIndicatorValue.last_updated.in_([datetime.date(y, 12, 31) for y in years]),        
            schema.MarketIndicatorValue.indicator_type.has(schema.IndicatorType.indicator_name.in_(indicator_names)) if indicator_names else True
        )
        indicators.extend(country_query.all())
    global_query = db.query(schema.MarketIndicatorValue).options(*eager_options).filter(
        schema.MarketIndicatorValue.country_code.is_(None),
        schema.MarketIndicatorValue.last_updated.in_([datetime.date(y, 12, 31) for y in years]),
        schema.MarketIndicatorValue.indicator_type.has(schema.IndicatorType.indicator_name.in_(indicator_names)) if indicator_names else True
    )
    indicators.extend(global_query.all())
    return indicators


def save_market_indicator_values_batch(db, fetched, found_set):
    """
    Batch version: Save all new market indicator values in a single transaction.
    """
    new_values = []
    for point in fetched:
        tup = (point['indicator_name'], point['year'], point['country_code'])
        if tup in found_set:
            continue
        indicator_type = db.query(schema.IndicatorType).filter(schema.IndicatorType.indicator_name == point['indicator_name']).first()
        if not indicator_type:
            indicator_type = schema.IndicatorType(indicator_name=point['indicator_name'], description="", unit="")
            db.add(indicator_type)
            db.commit()
            db.refresh(indicator_type)
        country = db.query(schema.Country).filter(schema.Country.country_code == point['country_code']).first()
        if not country:
            country = schema.Country(country_code=point['country_code'], country_name=point['country_name'])
            db.add(country)
            db.commit()
            db.refresh(country)
        value = schema.MarketIndicatorValue(
            indicator_type_id=indicator_type.indicator_type_id,
            value=point['value'],
            last_updated=datetime.date(point['year'], 12, 31),
            country_code=point['country_code'],
            industry_id=None
        )
        new_values.append(value)
    if new_values:
        db.add_all(new_values)
        db.commit()
        for v in new_values:
            db.refresh(v)
    return new_values