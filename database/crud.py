from sqlalchemy.orm import Session, sessionmaker
import functools
import database.schemas as schema, models
import uuid
import traceback
import datetime
from sqlalchemy import desc
from database.schemas import RecommendationWeights
from sqlalchemy.orm import joinedload
import datetime
from database.db import SessionLocal
import datetime
import functools

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
    try:
        db.add_all(db_confidences)
        db.commit()
        for conf in db_confidences:
            db.refresh(conf)
    except Exception as e:
        db.rollback()  # Rollback the transaction to avoid PendingRollbackError
        raise e  # Re-raise the exception to handle it upstream
    return db_confidences

def save_category_confidences_batch_in_task(confidences: list[dict], user_id: str):
    """
    Saves a batch of category confidences in a single transaction (for background tasks).
    """
    session = SessionLocal()
    try:
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
        if db_confidences:
            session.add_all(db_confidences)
            session.commit()
            for conf in db_confidences:
                session.refresh(conf)
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

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
    try:
        db.add_all(db_recommendations)
        db.commit()
        for rec in db_recommendations:
            db.refresh(rec)
    except Exception as e:
        db.rollback()  # Rollback the transaction to avoid PendingRollbackError
        raise e  # Re-raise the exception to handle it upstream
    return db_recommendations

def create_recommendations_batch_in_task(recommendations: list[models.RecommendationCreate], user_id: str):
    """
    Saves a batch of recommendations in a single transaction (for background tasks).
    """
    session = SessionLocal()
    try:
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
        if db_recommendations:
            session.add_all(db_recommendations)
            session.commit()
            for rec in db_recommendations:
                session.refresh(rec)
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

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

def update_recommendation_explanation_in_task(recommendation_id: str, explanation: str):
    """
    Updates the explanation for a recommendation (for background tasks).
    """
    session = SessionLocal()
    try:
        db_recommendation = session.query(schema.Recommendation).filter(schema.Recommendation.recommendation_id == recommendation_id).first()
        if db_recommendation:
            db_recommendation.explanation = explanation
            session.commit()
            session.refresh(db_recommendation)
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

def delete_recommendations_by_user_id(db: Session, user_id: str):
    db.query(schema.Recommendation).filter(schema.Recommendation.user_id == user_id).delete()
    db.commit()

def get_degree_program(db: Session, program_id: str):
    return db.query(schema.DegreeProgram).filter(schema.DegreeProgram.program_id == program_id).first()

@functools.lru_cache(maxsize=None)
def get_degree_programs(db: Session, skip: int = 0, limit: int = 100):
    print("Cache miss: Fetching degree programs from DB")
    degree_programs = db.query(schema.DegreeProgram).options(
        joinedload(schema.DegreeProgram.subject_requirements).joinedload(schema.SubjectRequirement.subject),
        joinedload(schema.DegreeProgram.degree_industries).joinedload(schema.DegreeIndustry.industry)
    ).offset(skip).limit(limit).all()

    # Populate the industries attribute with industry names
    for program in degree_programs:
        program.industries = [di.industry.industry_name for di in program.degree_industries]
        program.subject_requirements = [sr for sr in program.subject_requirements]

    return degree_programs

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
    pk_fields = pk_map.get(table, [])
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
        db_instances.append(instance)
    try:
        db.add_all(db_instances)
        db.commit()
        for instance in db_instances:
            db.refresh(instance)
    except Exception as e:
        db.rollback()
        raise e

def save_embeddings_batch_in_task(table: str, embeddings: list[dict]):
    """
    Saves a batch of embeddings for a given table in a single transaction (for background tasks).
    Each dict in embeddings should have keys: row_id, embedding, (optional) secondary_id.
    """
    session = SessionLocal()
    try:
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
        pk_fields = pk_map.get(table, [])
        db_instances = []
        for emb in embeddings:
            row_id = emb['row_id']
            embedding = emb['embedding']
            secondary_id = emb.get('secondary_id')
            # Ensure embedding is wrapped in square brackets for PostgreSQL vector type
            if not embedding.startswith('['):
                embedding = f'[{embedding}]'
            # Find or create instance
            query = session.query(model)
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
            db_instances.append(instance)
        if db_instances:
            session.add_all(db_instances)
            session.commit()
            for instance in db_instances:
                session.refresh(instance)
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

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
        try:
            db.add_all(new_values)
            db.commit()
            for v in new_values:
                db.refresh(v)
        except Exception as e:
            db.rollback()  # Rollback the transaction to avoid PendingRollbackError
            raise e  # Re-raise the exception to handle it upstream
    return new_values

def logging_task(
    user_id: str, 
    log_level_id: str, 
    http_method_id: str, 
    endpoint: str, 
    status_code: int, 
    execution_time_ms: int, 
    ip_address: str = None, 
    user_agent: str = None, 
    error_message: str = None, 
    stack_trace: str = None
):
    """
    Handles both Activity and Error logging in a SINGLE transaction 
    with a dedicated session.
    """
    # Create a fresh session for this background task
    with SessionLocal() as session:
        try:
            log_id = str(uuid.uuid4())
            
            # 1. Prepare Activity Log
            log = schema.ActivityLog(
                log_id=log_id,
                user_id=user_id,
                log_level_id=log_level_id,
                http_method_id=http_method_id,
                endpoint=endpoint,
                status_code=status_code,
                execution_time_ms=execution_time_ms,
                ip_address=ip_address,
                user_agent=user_agent,
                created_at=datetime.datetime.now()
            )
            session.add(log)
            
            # 2. Flush to stage the log_id in the DB transaction (prevents FK errors)
            session.flush() 

            # 3. If there is an error, add it now
            if error_message:
                error = schema.LogError(
                    log_id=log_id, # This is now safe to use
                    error_message=error_message,
                    stack_trace=stack_trace
                )
                session.add(error)
            
            # 4. Commit everything together
            session.commit()
            
        except Exception as e:
            print(f"CRITICAL: Logging failed completely. Error: {e}")
            session.rollback()
            # Since this is a background task, we catch the error so it doesn't 
            # crash the worker, but we log it to stdout.

@functools.lru_cache(maxsize=None)
def get_market_indicators_for_past_year(db: Session, indicator_names: list = None):
    """
    Fetch all market indicators for the past year.

    Parameters:
        db (Session): SQLAlchemy database session.
        indicator_names (list, optional): List of indicator names to filter. If None, fetches all indicators.

    Returns:
        list: List of MarketIndicatorValue objects matching the criteria.
    """
    # Calculate the start of the past year
    today = datetime.date.today()
    start_of_last_year = datetime.date(today.year - 1, 1, 1)

    # Eagerly load relationships to avoid DetachedInstanceError
    eager_options = [
        joinedload(schema.MarketIndicatorValue.indicator_type),
        # joinedload(schema.MarketIndicatorValue.industry)
    ]

    query = db.query(schema.MarketIndicatorValue).options(*eager_options).filter(
        schema.MarketIndicatorValue.last_updated >= start_of_last_year
    )

    if indicator_names:
        query = query.filter(
            schema.MarketIndicatorValue.indicator_type.has(
                schema.IndicatorType.indicator_name.in_(indicator_names)
            )
        )

    return query.all()

def get_last_5_recommendations(db: Session, user_id: str):
    """
    Fetch the last 5 recommendations for a given user, ordered by creation date.
    """
    return (
        db.query(schema.Recommendation)
        .filter(schema.Recommendation.user_id == user_id)
        .order_by(desc(schema.Recommendation.created_at))
        .limit(5)
        .all()
    )