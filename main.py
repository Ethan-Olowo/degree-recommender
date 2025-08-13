from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import database.schemas as models, models, database.crud as crud
from database.db import SessionLocal, engine
from recommendations.recommendation_engine import RecommendationEngine

# Create all database tables
models.Base.metadata.create_all(bind=engine)

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

@app.post("/students/", response_model=models.Student, tags=["Students"])
def create_student(student: models.StudentCreate, db: Session = Depends(get_db)):
    """
    Create a new student.
    """
    db_student = crud.get_student_by_email(db, email=student.email)
    if db_student:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_student(db=db, student=student)

@app.get("/students/{student_id}", response_model=models.Student, tags=["Students"])
def read_student(student_id: str, db: Session = Depends(get_db)):
    """
    Get a student by their ID.
    """
    db_student = crud.get_student(db, student_id=student_id)
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return db_student

@app.post("/students/{student_id}/profile/", response_model=models.StudentProfile, tags=["Student Profiles"])
def create_student_profile(student_id: str, profile: models.StudentProfileCreate, db: Session = Depends(get_db)):
    """
    Create a profile for a student.
    """
    return crud.create_student_profile(db=db, profile=profile, student_id=student_id)


@app.get("/students/{student_id}/recommendations/", response_model=list[models.Recommendation], tags=["Recommendations"])
def get_recommendations(student_id: str, db: Session = Depends(get_db)):
    """
    Generate and retrieve degree recommendations for a student.
    """
    student_profile = crud.get_student_profile(db, student_id=student_id)
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found. Please create a profile first.")

    # In a real application, you would have different recommendation algorithms.
    # Here we simulate getting recommendations from our engine.
    recommendations_data = recommendation_engine.generate_recommendations(student_profile)

    # Clear existing recommendations before adding new ones
    crud.delete_recommendations_by_profile_id(db, profile_id=student_profile.profileId)

    recommendations = []
    for rec_data in recommendations_data:
        # Create a recommendation schema object
        recommendation_to_create = models.RecommendationCreate(**rec_data)
        # Save the recommendation to the database
        recommendation = crud.create_recommendation(db=db, recommendation=recommendation_to_create, profile_id=student_profile.profileId)
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
        degree_program = crud.get_degree_program(db, program_id=recommendation.degreeProgramId)

        explanation = recommendation_engine.generate_explanation(student_profile, degree_program, recommendation)
        crud.update_recommendation_explanation(db, recommendation_id=recommendation_id, explanation=explanation)
        recommendation.explanation = explanation

    return {"recommendation_id": recommendation_id, "explanation": recommendation.explanation}

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

