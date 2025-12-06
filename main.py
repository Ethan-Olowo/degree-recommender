from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session
import database.schemas as schema
import models
import market
from database.db import SessionLocal, engine
from recommendations.recommendation_engine import RecommendationEngine
from fastapi.middleware.cors import CORSMiddleware
from database.schemas import Country
import datetime
from fastapi.responses import JSONResponse
from recommendations.market_trend_analyzer import MarketTrendAnalyzer
import traceback
import uuid
from database.crud import (
    logging_task,
    get_market_indicator_values,
    save_market_indicator_values_batch,
    get_recommendation,
    get_user,
    get_degree_program,
    get_personal_interests,
    get_last_5_recommendations,
)

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
def post_market_indicators(
    request: models.MarketIndicatorRequest,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
    req: Request = None,
):
    """
    Fetch market indicator values for specified years and countries. If missing, fetch from World Bank and update DB.
    """
    start_time = datetime.datetime.now()
    user_agent = req.headers.get("user-agent") if req else None
    ip_address = req.client.host if req and req.client else None
    method = req.method if req else "POST"
    status_code = 200
    error_message = None
    stack_trace = None
    response_data = None

    try:
        indicator_names = set(market.INDICATORS.values())
        years = request.years
        country_codes = request.country_codes

        if not country_codes or len(country_codes) == 0:
            country_objs = db.query(Country).all()
            country_codes = [country.country_code for country in country_objs]

        if not years or len(years) == 0:
            years = [datetime.datetime.now().year - 1]

        found_values = get_market_indicator_values(
            db, years=years, country_code=None, indicator_names=list(indicator_names)
        )
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
            save_market_indicator_values_batch(db, fetched, found_set)
            message = "Market data successfully updated."
        response_data = {"message": message}

    except Exception as e:
        stack_trace = traceback.format_exc()
        if status_code == 200:
            status_code = 500
        error_message = str(e)
        response_data = {"detail": error_message}

    finally:
        execution_time_ms = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
        log_level = "ERROR" if status_code >= 400 else "INFO"
        if background_tasks:
            background_tasks.add_task(
                logging_task,
                user_id=None,
                log_level_id=log_level,
                http_method_id=method,
                endpoint="/market-indicators/",
                status_code=status_code,
                execution_time_ms=execution_time_ms,
                ip_address=ip_address,
                user_agent=user_agent,
                error_message=error_message,
                stack_trace=stack_trace
            )

    if status_code >= 400:
        return JSONResponse(
            status_code=status_code,
            content=response_data,
            background=background_tasks
        )
    return response_data


# Recommendations
@app.get(
    "/users/{user_id}/recommendations/",
    response_model=list[models.Recommendation],
    tags=["Recommendations"],
)
def get_recommendations(
    user_id: str,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
    req: Request = None,
):
    """
    Generate and retrieve degree recommendations for a user.
    """
    start_time = datetime.datetime.now()
    method = req.method if req else "GET"
    user_agent = req.headers.get("user-agent") if req else None
    ip_address = req.client.host if req and req.client else None
    response_data = None 
    status_code = 200
    error_message = None
    stack_trace = None
    
    try:
        user = get_user(db, user_id=user_id)
        if not user:
            # DO NOT RAISE HERE. Set status and force an error state.
            status_code = 404
            raise ValueError("User profile not found. Please create a profile first.")

        # Business Logic
        recommendations = recommendation_engine.generate_recommendations(
            user, db=db, background_tasks=background_tasks
        )
        response_data = recommendations

    except Exception as e:
        # 2. Capture the error, but DO NOT re-raise it out of the function
        stack_trace = traceback.format_exc()
        
        # Determine status code if it wasn't set manually above
        if status_code == 200: 
             status_code = 500
        
        # Capture the error message
        error_message = str(e)
        
        # Prepare the error response content
        response_data = {"detail": error_message}

    finally:
        # 3. Add the logging task
        # Since we are inside the function, this executes before the return statement
        execution_time_ms = int(
            (datetime.datetime.now() - start_time).total_seconds() * 1000
        )
        log_level = "ERROR" if status_code >= 400 else "INFO"

        if background_tasks:
            background_tasks.add_task(
                logging_task,
                user_id=user_id,
                log_level_id=log_level,
                http_method_id=method,
                endpoint="/users/{user_id}/recommendations/",
                status_code=status_code,
                execution_time_ms=execution_time_ms,
                ip_address=ip_address,
                user_agent=user_agent,
                error_message=error_message,
                stack_trace=stack_trace,
            )

    # 4. MANUALLY RETURN THE RESPONSE
    # This is the critical fix. We manually attach background_tasks to the response.
    
    if status_code >= 400:
        return JSONResponse(
            status_code=status_code, 
            content=response_data, 
            background=background_tasks # <--- CRITICAL: Attach tasks to error response
        )
    
    # For success, FastAPI automatically attaches background_tasks from the parameter
    return response_data


@app.get(
    "/{user_id}/recommendations/{recommendation_id}/explanation",
    tags=["Recommendations"],
)
def get_recommendation_explanation(
    user_id: str,
    recommendation_id: str,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
    req: Request = None,
):
    """
    Generate and retrieve an explanation for a specific recommendation.
    """
    start_time = datetime.datetime.now()
    method = req.method if req else "GET"
    user_agent = req.headers.get("user-agent") if req else None
    ip_address = req.client.host if req and req.client else None
    status_code = 200
    error_message = None
    stack_trace = None
    response_data = None

    try:
        recommendation = get_recommendation(db, recommendation_id=recommendation_id)
        if not recommendation:
            status_code = 404
            raise ValueError("Recommendation not found.")

        student_data = get_user(db, user_id=user_id)
        if not student_data:
            status_code = 404
            raise ValueError("User profile not found. Please create a profile first.")

        if str(recommendation.user_id) != user_id:
            status_code = 403
            raise ValueError("You do not have permission to access this recommendation.")

        explanation = recommendation.explanation
        if not explanation:
            degree_program = get_degree_program(
                db, program_id=recommendation.program_id
            )
            explanation = recommendation_engine.generate_explanation(
                student_data,
                degree_program,
                recommendation,
                db=db,
                background_tasks=background_tasks,
            )

        response_data = {"recommendation_id": recommendation_id, "explanation": explanation}

    except Exception as e:
        stack_trace = traceback.format_exc()
        if status_code == 200:
            status_code = 500
        error_message = str(e)
        response_data = {"detail": error_message}

    finally:
        execution_time_ms = int(
            (datetime.datetime.now() - start_time).total_seconds() * 1000
        )
        log_level = "ERROR" if status_code >= 400 else "INFO"
        if background_tasks:
            background_tasks.add_task(
                logging_task,
                user_id=user_id,
                log_level_id=log_level,
                http_method_id=method,
                endpoint="/{user_id}/recommendations/{recommendation_id}/explanation",
                status_code=status_code,
                execution_time_ms=execution_time_ms,
                ip_address=ip_address,
                user_agent=user_agent,
                error_message=error_message,
                stack_trace=stack_trace,
            )

    if status_code >= 400:
        return JSONResponse(
            status_code=status_code,
            content=response_data,
            background=background_tasks
        )
    return response_data


@app.post(
    "/users/{user_id}/chat",
    response_model=ChatResponse,
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
    method = req.method if req else "POST"
    user_agent = req.headers.get("user-agent") if req else None
    ip_address = req.client.host if req and req.client else None
    status_code = 200
    error_message = None
    stack_trace = None
    response_data = None
    recommendation_id = recommendation_id or chat_request.recommendation_id

    try:
        user = get_user(db, user_id)
        if not user:
            status_code = 404
            raise ValueError("User not found.")

        personal_interests = ", ".join(
            [pi.interest for pi in get_personal_interests(db, user_id)]
        )
        if recommendation_id:
            recommendation = get_recommendation(
                db, recommendation_id=recommendation_id
            )
            if not recommendation:
                status_code = 404
                raise ValueError("Recommendation not found.")
            
            if str(recommendation.user_id) != user_id:
                status_code = 403
                raise ValueError("You do not have permission to access this recommendation.")
            
            recommendations = [recommendation]
        else:
            recommendations = get_last_5_recommendations(db, user_id)

        response = ExplanationGenerator.process_chat_request(
            chat_request, recommendations, personal_interests
        )

        response_data = response

    except Exception as e:
        stack_trace = traceback.format_exc()
        if status_code == 200:
            status_code = 500
        error_message = str(e)
        response_data = {"detail": error_message}

    finally:
        execution_time_ms = int(
            (datetime.datetime.now() - start_time).total_seconds() * 1000
        )
        log_level = "ERROR" if status_code >= 400 else "INFO"
        if background_tasks:
            background_tasks.add_task(
                logging_task,
                user_id=user_id,
                log_level_id=log_level,
                http_method_id=method,
                endpoint="/users/{user_id}/chat",
                status_code=status_code,
                execution_time_ms=execution_time_ms,
                ip_address=ip_address,
                user_agent=user_agent,
                error_message=error_message,
                stack_trace=stack_trace,
            )

    if status_code >= 400:
        return JSONResponse(
            status_code=status_code,
            content=response_data,
            background=background_tasks
        )
    return response_data
