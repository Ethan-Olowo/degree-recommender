# crud.py

from sqlalchemy.orm import Session
import database.schemas as models, models
import uuid

# Student CRUD
def get_student(db: Session, student_id: str):
    return db.query(models.Student).filter(models.Student.studentId == student_id).first()

def get_student_by_email(db: Session, email: str):
    return db.query(models.Student).filter(models.Student.email == email).first()

def create_student(db: Session, student: models.StudentCreate):
    # In a real app, you'd hash the password
    db_student = models.Student(
        studentId=str(uuid.uuid4()),
        firstName=student.firstName,
        lastName=student.lastName,
        email=student.email,
        password=student.password # Hashing is recommended!
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

# Student Profile CRUD
def create_student_profile(db: Session, profile: models.StudentProfileCreate, student_id: str):
    db_profile = models.StudentProfile(
        profileId=str(uuid.uuid4()),
        studentId=student_id,
        **profile.dict()
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

def get_student_profile(db: Session, student_id: str):
    return db.query(models.StudentProfile).filter(models.StudentProfile.studentId == student_id).first()

def get_student_profile_by_recommendation(db: Session, recommendation_id: str):
    recommendation = db.query(models.Recommendation).filter(models.Recommendation.recommendationId == recommendation_id).first()
    if recommendation:
        return db.query(models.StudentProfile).filter(models.StudentProfile.profileId == recommendation.profileId).first()
    return None

# Degree Program CRUD
def create_degree_program(db: Session, program: models.DegreeProgramCreate):
    db_program = models.DegreeProgram(
        programId=str(uuid.uuid4()),
        **program.dict()
    )
    db.add(db_program)
    db.commit()
    db.refresh(db_program)
    return db_program

def get_degree_program(db: Session, program_id: str):
    return db.query(models.DegreeProgram).filter(models.DegreeProgram.programId == program_id).first()

def get_degree_programs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.DegreeProgram).offset(skip).limit(limit).all()

# Recommendation CRUD
def create_recommendation(db: Session, recommendation: models.RecommendationCreate, profile_id: str):
    db_recommendation = models.Recommendation(
        recommendationId=str(uuid.uuid4()),
        profileId=profile_id,
        **recommendation.dict()
    )
    db.add(db_recommendation)
    db.commit()
    db.refresh(db_recommendation)
    return db_recommendation

def get_recommendation(db: Session, recommendation_id: str):
    return db.query(models.Recommendation).filter(models.Recommendation.recommendationId == recommendation_id).first()

def update_recommendation_explanation(db: Session, recommendation_id: str, explanation: str):
    db_recommendation = get_recommendation(db, recommendation_id)
    if db_recommendation:
        db_recommendation.explanation = explanation
        db.commit()
        db.refresh(db_recommendation)
    return db_recommendation

def delete_recommendations_by_profile_id(db: Session, profile_id: str):
    db.query(models.Recommendation).filter(models.Recommendation.profileId == profile_id).delete()
    db.commit()
