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

# Recommendations
@app.get("/users/{user_id}/recommendations/", response_model=list[models.Recommendation], tags=["Recommendations"])
def get_recommendations(user_id: str, db: Session = Depends(get_db)):
    """
    Generate and retrieve degree recommendations for a user.
    """
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found. Please create a profile first.")

    recommendations_objs = recommendation_engine.generate_recommendations(user, db=db)

    recommendations = []
    for rec_obj in recommendations_objs:
        # Convert Recommendation object to RecommendationCreate
        recommendation_to_create = models.RecommendationCreate(
            user_id=user.user_id,
            program_id=rec_obj.degree_program.program_id,
            confidence_score=rec_obj.confidence_score,
            market_score=rec_obj.market_score,
            explanation=rec_obj.explanation,
            created_at=rec_obj.created_at,
            liked=rec_obj.liked,
            algorithm_source=rec_obj.algorithm_source
        )
        recommendation = crud.create_recommendation(db=db, recommendation=recommendation_to_create, user_id=user.user_id)
        recommendations.append(recommendation)

    return recommendations

@app.get("/{user_id}/recommendations/{recommendation_id}/explanation", tags=["Recommendations"])
def get_recommendation_explanation(user_id: str, recommendation_id: str, db: Session = Depends(get_db)):
    """
    Generate and retrieve an explanation for a specific recommendation.
    """
    recommendation = crud.get_recommendation(db, recommendation_id=recommendation_id)
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    if str(recommendation.user_id) != user_id:
        print(user_id+" ")
        print(recommendation.user_id)
        raise HTTPException(status_code=403, detail="You do not have permission to access this recommendation.")
    
    student_data = crud.get_user(db, user_id=user_id)
    if not student_data:
        raise HTTPException(status_code=404, detail="User profile not found. Please create a profile first.")

    if not recommendation.explanation:
        degree_program = crud.get_degree_program(db, program_id=recommendation.program_id)

        explanation = recommendation_engine.generate_explanation(student_data, degree_program, recommendation)
        crud.update_recommendation_explanation(db, recommendation_id=recommendation_id, explanation=explanation)
        recommendation.explanation = explanation

    return {"recommendation_id": recommendation_id, "explanation": recommendation.explanation}


