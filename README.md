# Degree Recommender Backend

This is the backend for a Degree Recommendation System, built with FastAPI, SQLAlchemy, and Pydantic. It provides APIs for managing students, profiles, degree programs, and generating personalized degree recommendations using multiple algorithms and market trend analysis.

## Features
- **Recommendation Engine:** Generates degree recommendations using content-based filtering, peer clustering, and market trend analysis.
- **Explanations:** Uses OpenAI's GPT models to generate natural language explanations for recommendations.
- **Market Trends:** Analyzes job market data to inform recommendations.

## Tech Stack

- **FastAPI** for API endpoints
- **SQLAlchemy** for ORM/database access
- **Pydantic** for data validation
- **OpenRouter API** for explanation generation
- **Supabase** as the default database

## Setup

1. **Clone the repository**

2. **Install dependencies**
    ```bash
    pip install -r requirements.txt
    ```

3. **Configure environment variables**
    - Copy `.env` and set your OpenAI API key:
      ```
      OPENROUTER_API_KEY="your_openrouter_api_key_here"
      ```

4. **Run the server**
    ```bash
    uvicorn main:app --reload
    ```

## API Endpoints
- `GET /students/{student_id}/recommendations/` - Generate degree recommendations
- `GET /recommendations/{recommendation_id}/explanation` - Get explanation for a recommendation

## Project Structure

```
Degree-Recommender-Backend/
├── main.py
├── market.py
├── models.py
├── requirements.txt
├── README.md
├── __pycache__/
├── database/
│   ├── crud.py
│   ├── db.py
│   ├── schemas.py
│   └── __pycache__/
├── recommendations/
│   ├── content_based_filtering.py
│   ├── explanation_generator.py
│   ├── grades_helper.py
│   ├── market_trend_analyzer.py
│   ├── peer_clustering.py
│   ├── recommendation_algorithm.py
│   ├── recommendation_engine.py
│   └── models/
│       ├── degree_focus_metadata.pt
│       ├── degree_focus_model.pth
│       ├── label_encoder.joblib
│       ├── model_class.py
│       ├── ordinal_encoder.joblib
│       ├── scaler.joblib
│       ├── selected_features.joblib
│       └── xgb_tuned_model.joblib
├── tests/
│   ├── test_grades_helper.py
│   ├── test_market_trend_analyzer.py
│   ├── test_peer_clustering.py
│   ├── test_content_based_filtering.py
│   ├── test_explanation_generator.py
│   └── __pycache__/
```

## Notes

- Passwords are stored in plain text for demonstration; use proper hashing in production.
- The recommendation algorithms are implemented in the `recommendations/` folder. You may need to adapt them for production use.
- The OpenAI API is used for generating explanations; ensure your API key is valid.

## License

MIT License