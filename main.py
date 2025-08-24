from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import database.schemas as schema 
import database.crud as crud
import models
from database.db import SessionLocal, engine
from recommendations.recommendation_engine import RecommendationEngine

# Create all database tables
schema.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Degree Recommendation System API",
    description="API for a degree recommendation system using FastAPI, SQLAlchemy, and a recommendation engine.",
    version="1.0.0",
)

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize the recommendation engine
recommendation_engine = RecommendationEngine()


# Users
@app.post("/users/", response_model=models.User, tags=["Users"])
def create_user(user: models.UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user.
    """
    db_user = crud.get_user_by_auth_id(db, auth_id=user.auth_id)
    if db_user:
        raise HTTPException(status_code=400, detail="Auth ID already registered")
    return crud.create_user(db=db, user=user)

@app.get("/users/{user_id}", response_model=models.User, tags=["Users"])
def read_user(user_id: str, db: Session = Depends(get_db)):
    """
    Get a user by their ID.
    """
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# Profile
@app.post("/users/{user_id}/profile/", response_model=models.StudentProfile, tags=["Student Profiles"])
def create_student_profile(user_id: str, profile: models.StudentProfileCreate, db: Session = Depends(get_db)):
    """
    Create a profile for a user.
    """
    return crud.create_student_profile(db=db, profile=profile, user_id=user_id)

# Recommendations
@app.get("/users/{user_id}/recommendations/", response_model=list[models.Recommendation], tags=["Recommendations"])
def get_recommendations(user_id: str, db: Session = Depends(get_db)):
    """
    Generate and retrieve degree recommendations for a user.
    """
    student_profile = crud.get_student_profile(db, user_id=user_id)
    if not student_profile:
        raise HTTPException(status_code=404, detail="User profile not found. Please create a profile first.")

    recommendations_data = recommendation_engine.generate_recommendations(student_profile)

    crud.delete_recommendations_by_profile_id(db, profile_id=student_profile.profile_id)

    recommendations = []
    for rec_data in recommendations_data:
        recommendation_to_create = models.RecommendationCreate(**rec_data)
        recommendation = crud.create_recommendation(db=db, recommendation=recommendation_to_create, profile_id=student_profile.profile_id)
        recommendations.append(recommendation)

    return recommendations

@app.get("/recommendations/{recommendation_id}/explanation", tags=["Recommendations"])
def get_recommendation_explanation(recommendation_id: str, db: Session = Depends(get_db)):
    """
    Generate and retrieve an explanation for a specific recommendation.
    """
    recommendation = crud.get_recommendation(db, recommendation_id=recommendation_id)
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    if not recommendation.explanation:
        student_profile = crud.get_student_profile_by_recommendation(db, recommendation_id=recommendation_id)
        degree_program = crud.get_degree_program(db, program_id=recommendation.program_id)

        explanation = recommendation_engine.generate_explanation(student_profile, degree_program, recommendation)
        crud.update_recommendation_explanation(db, recommendation_id=recommendation_id, explanation=explanation)
        recommendation.explanation = explanation

    return {"recommendation_id": recommendation_id, "explanation": recommendation.explanation}

# Degree Programs
@app.post("/degree_programs/", response_model=models.DegreeProgram, tags=["Degree Programs"])
def create_degree_program(program: models.DegreeProgramCreate, db: Session = Depends(get_db)):
    """
    Create a new degree program.
    """
    return crud.create_degree_program(db=db, program=program)

@app.get("/degree_programs/", response_model=list[models.DegreeProgram], tags=["Degree Programs"])
def read_degree_programs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retrieve a list of degree programs.
    """
    programs = crud.get_degree_programs(db, skip=skip, limit=limit)
    return programs

