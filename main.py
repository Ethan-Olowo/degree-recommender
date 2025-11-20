from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
import database.schemas as schema 
import database.crud as crud
import models
import market
from database.db import SessionLocal, engine
from recommendations.recommendation_engine import RecommendationEngine
from fastapi.middleware.cors import CORSMiddleware
from database.schemas import MarketIndicatorValue, IndicatorType, Country
import datetime
from fastapi.responses import JSONResponse

# Create all database tables
schema.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Degree Recommendation System API",
    description="API for a degree recommendation system using FastAPI, SQLAlchemy, and a recommendation engine.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

# TODO: Update this to be more modular (i.e. move data fetching to crud, etc.)
# --- Market Indicator Endpoint ---
@app.post("/market-indicators/", tags=["Market Indicators"])
def post_market_indicators(request: models.MarketIndicatorRequest, db: Session = Depends(get_db)):
    """
    Fetch market indicator values for specified years and countries. If missing, fetch from World Bank and update DB.
    """
    try:
        indicator_names = set(market.INDICATORS.values())
        years = request.years
        country_codes = request.country_codes

        if not country_codes or len(country_codes) == 0:
            country_objs = db.query(Country).all()
            country_codes = [country.country_code for country in country_objs]

        if not years or len(years) == 0:
            years = [datetime.datetime.now().year - 1]

        # Use crud.get_market_indicator_values to get all relevant values
        found_values = crud.get_market_indicator_values(db, years=years, country_code=None, indicator_names=list(indicator_names))
        found_set = set()
        for v in found_values:
            year_val = v.last_updated.year if v.last_updated else None
            found_set.add((v.indicator_type.indicator_name, year_val, v.country_code))

        missing = []
        for indicator_id, indicator_name in market.INDICATORS.items():
            for year in years:
                for country in country_codes:
                    if (indicator_name, year, country) not in found_set:
                        missing.append((indicator_id, indicator_name, year, country))

        if missing:
            fetched = market.fetch_world_bank_data(years, country_codes)
            crud.save_market_indicator_values(db, fetched, found_set)
            return {"message": "Market data successfully updated."}
        else:
            return {"message": "Market data is already up to date."}
    except Exception as e:
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"message": f"Error: {str(e)}"})

# Recommendations
@app.get("/users/{user_id}/recommendations/", response_model=list[models.Recommendation], tags=["Recommendations"])
def get_recommendations(user_id: str, db: Session = Depends(get_db), background_tasks: BackgroundTasks = None):
    """
    Generate and retrieve degree recommendations for a user.
    """
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found. Please create a profile first.")

    # Now generate_recommendations will also persist and return the DB objects
    recommendations = recommendation_engine.generate_recommendations(user, db=db, background_tasks=background_tasks)
    return recommendations

@app.get("/{user_id}/recommendations/{recommendation_id}/explanation", tags=["Recommendations"])
def get_recommendation_explanation(user_id: str, recommendation_id: str, db: Session = Depends(get_db), background_tasks: BackgroundTasks = None):
    """
    Generate and retrieve an explanation for a specific recommendation.
    """
    recommendation = crud.get_recommendation(db, recommendation_id=recommendation_id)
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    if str(recommendation.user_id) != user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to access this recommendation.")
    
    student_data = crud.get_user(db, user_id=user_id)
    if not student_data:
        raise HTTPException(status_code=404, detail="User profile not found. Please create a profile first.")

    if not recommendation.explanation:
        degree_program = crud.get_degree_program(db, program_id=recommendation.program_id)
        explanation = recommendation_engine.generate_explanation(student_data, degree_program, recommendation, db=db, background_tasks=background_tasks)

    return {"recommendation_id": recommendation_id, "explanation": explanation}


