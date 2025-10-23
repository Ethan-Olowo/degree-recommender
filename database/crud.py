from sqlalchemy.orm import Session
import database.schemas as schema, models
import uuid

# User CRUD
def get_user(db: Session, user_id: str):
    return db.query(schema.User).filter(schema.User.user_id == user_id).first()

# CategoryConfidence CRUD
def save_category_confidence(db: Session, user_id: str, predicted_category: str, prediction_confidence: float):
    import datetime
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
        liked=getattr(recommendation, "liked", False)
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

