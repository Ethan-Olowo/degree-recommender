
from sqlalchemy.orm import Session
import database.schemas as schema, models
import uuid

# User CRUD
def get_user(db: Session, user_id: str):
    return db.query(schema.User).filter(schema.User.user_id == user_id).first()

def get_user_by_auth_id(db: Session, auth_id: str):
    return db.query(schema.User).filter(schema.User.auth_id == auth_id).first()

def create_user(db: Session, user: models.UserCreate):
    db_user = schema.User(
        user_id=str(uuid.uuid4()),
        full_name=user.fullName,
        is_admin=user.is_admin,
        auth_id=user.auth_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Student Profile CRUD
def create_student_profile(db: Session, profile: models.StudentProfileCreate, user_id: str):
    db_profile = schema.StudentProfile(
        profile_id=str(uuid.uuid4()),
        user_id=user_id,
        academic_data_id=None # You may want to create AcademicData separately
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    # Add personal interests
    for interest in profile.personalInterests:
        db_interest = schema.PersonalInterest(
            profile_id=db_profile.profile_id,
            interest=interest
        )
        db.add(db_interest)
    db.commit()
    db.refresh(db_profile)
    return db_profile

def get_student_profile(db: Session, user_id: str):
    return db.query(schema.StudentProfile).filter(schema.StudentProfile.user_id == user_id).first()

def get_student_profile_by_recommendation(db: Session, recommendation_id: str):
    recommendation = db.query(schema.Recommendation).filter(schema.Recommendation.recommendation_id == recommendation_id).first()
    if recommendation:
        return db.query(schema.StudentProfile).filter(schema.StudentProfile.profile_id == recommendation.profile_id).first()
    return None

# Degree Program CRUD
def create_degree_program(db: Session, program: models.DegreeProgramCreate):
    db_program = schema.DegreeProgram(
        program_id=str(uuid.uuid4()),
        program_name=program.programName,
        program_type=program.programType,
        description=program.description,
        minimum_gpa=program.minimumGPA
    )
    db.add(db_program)
    db.commit()
    db.refresh(db_program)
    # Add industries
    for industry_name in program.industries:
        # Find or create industry
        industry = db.query(schema.Industry).filter(schema.Industry.industry_name == industry_name).first()
        if not industry:
            industry = schema.Industry(industry_id=str(uuid.uuid4()), industry_name=industry_name)
            db.add(industry)
            db.commit()
        db_degree_industry = schema.DegreeIndustry(
            program_id=db_program.program_id,
            industry_id=industry.industry_id
        )
        db.add(db_degree_industry)
    db.commit()
    # Add subject requirements
    for subject_name in program.requiredSubjects:
        subject = db.query(schema.Subject).filter(schema.Subject.subject_name == subject_name).first()
        if not subject:
            subject = schema.Subject(subject_id=str(uuid.uuid4()), subject_name=subject_name)
            db.add(subject)
            db.commit()
        db_subject_req = schema.SubjectRequirement(
            program_id=db_program.program_id,
            subject_id=subject.subject_id,
            requirement_detail="Required"
        )
        db.add(db_subject_req)
    db.commit()
    db.refresh(db_program)
    return db_program

def get_degree_program(db: Session, program_id: str):
    return db.query(schema.DegreeProgram).filter(schema.DegreeProgram.program_id == program_id).first()

def get_degree_programs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(schema.DegreeProgram).offset(skip).limit(limit).all()

# Recommendation CRUD
def create_recommendation(db: Session, recommendation: models.RecommendationCreate, profile_id: str):
    db_recommendation = schema.Recommendation(
        recommendation_id=str(uuid.uuid4()),
        profile_id=profile_id,
        program_id=recommendation.degreeProgramId,
        confidence_score=recommendation.confidenceScore,
        algorithm_source=recommendation.algorithmSource,
        market_score=recommendation.marketScore,
        explanation=getattr(recommendation, "explanation", None)
    )
    db.add(db_recommendation)
    db.commit()
    db.refresh(db_recommendation)
    return db_recommendation

def get_recommendation(db: Session, recommendation_id: str):
    return db.query(schema.Recommendation).filter(schema.Recommendation.recommendation_id == recommendation_id).first()

def update_recommendation_explanation(db: Session, recommendation_id: str, explanation: str):
    db_recommendation = get_recommendation(db, recommendation_id)
    if db_recommendation:
        db_recommendation.explanation = explanation
        db.commit()
        db.refresh(db_recommendation)
    return db_recommendation

def delete_recommendations_by_profile_id(db: Session, profile_id: str):
    db.query(schema.Recommendation).filter(schema.Recommendation.profile_id == profile_id).delete()
    db.commit()
