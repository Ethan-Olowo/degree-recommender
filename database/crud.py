
from sqlalchemy.orm import Session
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
def save_category_confidence(db: Session, user_id: str, predicted_category: str, prediction_confidence: float):
    category_conf = schema.CategoryConfidence(
        prediction_id=str(uuid.uuid4()),
        created_at=datetime.datetime.now(),
        predicted_category=predicted_category,
        user_id=user_id,
        prediction_confidence=prediction_confidence
    )
    db.add(category_conf)
    db.commit()
    db.refresh(category_conf)
    return category_conf

# Personal Interest CRUD
def get_personal_interests(db: Session, user_id: str):
    return db.query(schema.PersonalInterest).filter(schema.PersonalInterest.user_id == user_id).all()

# Socioeconomic Indicator CRUD
def get_socioeconomic_indicator(db: Session, user_id: str):
    return db.query(schema.SocioeconomicIndicator).filter(schema.SocioeconomicIndicator.user_id == user_id).first()


def get_academic_data(db: Session, user_id: str):
    return db.query(schema.AcademicData).filter(schema.AcademicData.user_id == user_id).first()

# Recommendation CRUD
def create_recommendation(db: Session, recommendation: models.RecommendationCreate, user_id: str):
    import datetime
    db_recommendation = schema.Recommendation(
        recommendation_id=str(uuid.uuid4()),
        user_id=user_id,
        program_id=recommendation.program_id,
        confidence_score=recommendation.confidence_score,
        market_score=recommendation.market_score,
        explanation=getattr(recommendation, "explanation", None),
        created_at=getattr(recommendation, "created_at", datetime.datetime.now()),
        liked=getattr(recommendation, "liked", False),
        algorithm_source=getattr(recommendation, "algorithm_source", None),
        subject_score=getattr(recommendation, "subject_score", None),
        semantic_score=getattr(recommendation, "semantic_score", None),
        peer_score=getattr(recommendation, "peer_score", None)
    )
    db.add(db_recommendation)
    db.commit()
    db.refresh(db_recommendation)
    return db_recommendation

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

def get_degree_programs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(schema.DegreeProgram).offset(skip).limit(limit).all()

# Subject CRUD

def get_subject(db: Session, subject_id: str):
    return db.query(schema.Subject).filter(schema.Subject.subject_id == subject_id).first()

def get_subjects(db: Session, skip: int = 0, limit: int = 100):
    return db.query(schema.Subject).offset(skip).limit(limit).all()

# SubjectGrade CRUD

def get_subject_grades_by_academic_data(db: Session, academic_data_id: str):
    return db.query(schema.SubjectGrade).filter(schema.SubjectGrade.academic_data_id == academic_data_id).all()

# SubjectRequirement CRUD

def get_subject_requirements_by_program(db: Session, program_id: str):
    return db.query(schema.SubjectRequirement).filter(schema.SubjectRequirement.program_id == program_id).all()

# Industry CRUD
def get_industries(db: Session, skip: int = 0, limit: int = 100):
    return db.query(schema.Industry).offset(skip).limit(limit).all()

# Generic Embedding CRUD
def save_embedding(db: Session, table: str, row_id: str, embedding: str, secondary_id: str = None):
    """
    Save an embedding value to the specified table and row.
    table: one of 'personal_interests', 'subjects', 'industries', 'degree_programs'
    row_id: primary key (UUID or composite)
    embedding: embedding string (comma-separated)
    secondary_id: for tables with composite PK (e.g., interest for personal_interests)
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
    if not model:
        raise ValueError(f"Table '{table}' does not support embeddings.")
    pk_fields = pk_map[table]
    query = db.query(model)
    if table == 'personal_interests' and secondary_id is not None:
        instance = query.filter(getattr(model, pk_fields[0]) == row_id, getattr(model, pk_fields[1]) == secondary_id).first()
    else:
        instance = query.filter(getattr(model, pk_fields[0]) == row_id).first()
    if not instance:
        raise ValueError(f"Row not found in '{table}' for id '{row_id}'.")
    # Ensure embedding is wrapped in square brackets for PostgreSQL vector type
    if not embedding.startswith('['):
        embedding = f'[{embedding}]'
    if table == 'degree_programs':
        instance.description_embedding = embedding
    else:
        instance.embedding = embedding
    db.commit()
    db.refresh(instance)
    return instance

# --- Recommendation Weights ---
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


def save_market_indicator_values(db, fetched, found_set):
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
        db.add(value)
        db.commit()
        db.refresh(value)