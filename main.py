from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, Request
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
from recommendations.market_trend_analyzer import MarketTrendAnalyzer
import traceback
from api_logging import log_activity, log_error
import uuid
from database.crud import log_activity_in_task
# from chat import process_chat_request
from models import ChatRequest, ChatResponse, ErrorResponse
from recommendations.explanation_generator import ExplanationGenerator
from typing import Optional

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

# --- Market Indicator Endpoint ---
@app.post("/market-indicators/", tags=["Market Indicators"])
def post_market_indicators(request: models.MarketIndicatorRequest, db: Session = Depends(get_db), background_tasks: BackgroundTasks = None, req: Request = None):
    """
    Fetch market indicator values for specified years and countries. If missing, fetch from World Bank and update DB.
    """
    start_time = datetime.datetime.now()
    log_id = str(uuid.uuid4())
    try:
        indicator_names = set(market.INDICATORS.values())
        years = request.years
        country_codes = request.country_codes

        if not country_codes or len(country_codes) == 0:
            country_objs = db.query(Country).all()
            country_codes = [country.country_code for country in country_objs]

        if not years or len(years) == 0:
            years = [datetime.datetime.now().year - 1]

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

        status_code = 200
        message = "Market data is already up to date."
        if missing:
            fetched = MarketTrendAnalyzer.fetch_world_bank_data(years, country_codes)
            crud.save_market_indicator_values_batch(db, fetched, found_set)
            message = "Market data successfully updated."
        execution_time_ms = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
        if background_tasks:
            background_tasks.add_task(
                log_activity_in_task,
                None,
                "INFO",
                req.method if req else "POST",
                "/market-indicators/",
                status_code,
                execution_time_ms,
                req.client.host if req and req.client else None,
                req.headers.get("user-agent") if req else None
            )
        return {"message": message}
    except Exception as e:
        execution_time_ms = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
        stack_trace = traceback.format_exc()
        if isinstance(e, HTTPException):
            status_code = e.status_code
            detail = e.detail
        else:
            status_code = 500
            detail = f"Error: {str(e)}"
        # Log synchronously (no background tasks) on error
        log_activity(
            db,
            None,
            "ERROR",
            req.method if req else "POST",
            "/market-indicators/",
            status_code,
            execution_time_ms,
            req.client.host if req and req.client else None,
            req.headers.get("user-agent") if req else None,
            log_id
        )
        log_error(
            db,
            log_id,
            str(e),
            stack_trace
        )
        return JSONResponse(status_code=status_code, content={"message": detail})

# Recommendations
@app.get("/users/{user_id}/recommendations/", response_model=list[models.Recommendation], tags=["Recommendations"])
def get_recommendations(user_id: str, db: Session = Depends(get_db), background_tasks: BackgroundTasks = None, req: Request = None):
    """
    Generate and retrieve degree recommendations for a user.
    """
    start_time = datetime.datetime.now()
    log_id = str(uuid.uuid4())
    try:
        user = crud.get_user(db, user_id=user_id)
        if not user:
            status_code = 404
            execution_time_ms = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
            if background_tasks:
                background_tasks.add_task(
                    log_activity_in_task,
                    user_id,
                    "ERROR",
                    req.method if req else "GET",
                    "/users/{user_id}/recommendations/",
                    status_code,
                    execution_time_ms,
                    req.client.host if req and req.client else None,
                    req.headers.get("user-agent") if req else None
                )
            raise HTTPException(status_code=404, detail="User profile not found. Please create a profile first.")

        recommendations = recommendation_engine.generate_recommendations(user, db=db, background_tasks=background_tasks)
        status_code = 200
        execution_time_ms = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
        if background_tasks:
            background_tasks.add_task(
                log_activity_in_task,
                user_id,
                "INFO",
                req.method if req else "GET",
                "/users/{user_id}/recommendations/",
                status_code,
                execution_time_ms,
                req.client.host if req and req.client else None,
                req.headers.get("user-agent") if req else None
            )
        return recommendations
    except Exception as e:
        execution_time_ms = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
        stack_trace = traceback.format_exc()
        if isinstance(e, HTTPException):
            status_code = e.status_code
            detail = e.detail
        else:
            status_code = 500
            detail = f"Error: {str(e)}"
        # Log synchronously (no background tasks) on error
        log_activity(
            db,
            user_id,
            "ERROR",
            req.method if req else "GET",
            "/users/{user_id}/recommendations/",
            status_code,
            execution_time_ms,
            req.client.host if req and req.client else None,
            req.headers.get("user-agent") if req else None,
            log_id
        )
        log_error(
            db,
            log_id,
            str(e),
            stack_trace
        )
        raise HTTPException(status_code=status_code, detail=detail)

@app.get("/{user_id}/recommendations/{recommendation_id}/explanation", tags=["Recommendations"])
def get_recommendation_explanation(user_id: str, recommendation_id: str, db: Session = Depends(get_db), background_tasks: BackgroundTasks = None, req: Request = None):
    """
    Generate and retrieve an explanation for a specific recommendation.
    """
    start_time = datetime.datetime.now()
    log_id = str(uuid.uuid4())
    try:
        recommendation = crud.get_recommendation(db, recommendation_id=recommendation_id)
        if not recommendation:
            execution_time_ms = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
            raise HTTPException(status_code=404, detail="Recommendation not found.")

        if str(recommendation.user_id) != user_id:
            execution_time_ms = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
            raise HTTPException(status_code=403, detail="You do not have permission to access this recommendation.")

        student_data = crud.get_user(db, user_id=user_id)
        if not student_data:
            execution_time_ms = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
            raise HTTPException(status_code=404, detail="User profile not found. Please create a profile first.")

        explanation = recommendation.explanation
        if not explanation:
            degree_program = crud.get_degree_program(db, program_id=recommendation.program_id)
            explanation = recommendation_engine.generate_explanation(student_data, degree_program, recommendation, db=db, background_tasks=background_tasks)

        status_code = 200
        execution_time_ms = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
        if background_tasks:
            background_tasks.add_task(
                log_activity,
                db,
                user_id,
                "INFO",
                req.method if req else "GET",
                "/{user_id}/recommendations/{recommendation_id}/explanation",
                status_code,
                execution_time_ms,
                req.client.host if req and req.client else None,
                req.headers.get("user-agent") if req else None,
                log_id
            )
        return {"recommendation_id": recommendation_id, "explanation": explanation}
    except Exception as e:
        execution_time_ms = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
        stack_trace = traceback.format_exc()
        if isinstance(e, HTTPException):
            status_code = e.status_code
            detail = e.detail
        else:
            status_code = 500
            detail = f"Error: {str(e)}"
        # Log synchronously (no background tasks) on error
        log_activity(
            db,
            user_id,
            "ERROR",
            req.method if req else "GET",
            "/{user_id}/recommendations/{recommendation_id}/explanation",
            status_code,
            execution_time_ms,
            req.client.host if req and req.client else None,
            req.headers.get("user-agent") if req else None,
            log_id
        )
        log_error(
            db,
            log_id,
            str(e),
            stack_trace
        )
        raise HTTPException(status_code=status_code, detail=detail)

# Chat Endpoint
@app.post(
    "/users/{user_id}/chat",
    response_model=ChatResponse,
    responses={
        404: {"model": ErrorResponse, "description": "User or recommendation not found."},
        500: {"model": ErrorResponse, "description": "Internal Server Error."},
    },
    tags=["Chat"],
)
def chat_endpoint(
    user_id: str,
    chat_request: ChatRequest,
    recommendation_id: Optional[str] = None,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
    req: Request = None,
):
    """
    Handle chat requests by validating input, querying recommendations, and returning the response.

    - **Path Parameter**: `user_id` (str) - The unique identifier of the user.
    - **Query Parameter**: `recommendation_id` (Optional[str]) - The unique identifier of a specific recommendation.
    - **Request Body**: `ChatRequest` - Contains the chat history, new message, and optional recommendations.
    - **Response**: `ChatResponse` - Contains the generated reply.
    """
    start_time = datetime.datetime.now()
    log_id = str(uuid.uuid4())
    recommendation_id = str(chat_request.recommendation_id) or recommendation_id

    try:
        # Validate user existence
        user = crud.get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        # Fetch user interests
        personal_interests = ', '.join([pi.interest for pi in crud.get_personal_interests(db, user_id)])

        # Validate recommendation ownership if recommendation_id is provided
        recommendations = []
        if recommendation_id:
            recommendation = crud.get_recommendation(db, recommendation_id)
            print(recommendation)
            print(recommendation.user_id)
            if not recommendation or str(recommendation.user_id) != user_id:
                raise HTTPException(status_code=404, detail="Recommendation not found or access denied.")
            recommendations = [recommendation]
        else:
            # Fetch the last 5 recommendations for the user
            recommendations = crud.get_last_5_recommendations(db, user_id)
            # if not recommendations:
                # raise HTTPException(status_code=404, detail="No recommendations found.")
        print(recommendations)
        # Process the chat request
        response = ExplanationGenerator.process_chat_request(chat_request, recommendations, personal_interests)

        # Calculate execution time
        execution_time_ms = int((datetime.datetime.now() - start_time).total_seconds() * 1000)

        # Log the request and response asynchronously
        if background_tasks:
            background_tasks.add_task(
                log_activity_in_task,
                user_id,
                "INFO",
                req.method if req else "POST",
                "/users/{user_id}/chat",
                200,
                execution_time_ms,
                req.client.host if req and req.client else None,
                req.headers.get("user-agent") if req else None,
            )

        return response

    except Exception as e:
        execution_time_ms = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
        stack_trace = traceback.format_exc()
        log_activity(
            db,
            user_id,
            "ERROR",
            req.method if req else "POST",
            "/users/{user_id}/chat",
            500,
            execution_time_ms,
            req.client.host if req and req.client else None,
            req.headers.get("user-agent") if req else None,
            log_id,
        )
        log_error(db, log_id, str(e), stack_trace)
        raise HTTPException(status_code=500, detail="Internal Server Error")


