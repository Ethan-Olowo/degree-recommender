# Degree Recommender Backend

This is the backend for a Degree Recommendation System, built with FastAPI, SQLAlchemy, and Pydantic. It provides APIs for managing students, profiles, degree programs, and generating personalized degree recommendations using multiple algorithms and market trend analysis.

## Features

- **Student Management:** Register and manage student accounts.
- **Profile Management:** Store academic, career, and personal data for each student.
- **Degree Programs:** CRUD operations for degree programs.
- **Recommendation Engine:** Generates degree recommendations using content-based filtering, peer clustering, and market trend analysis.
- **Explanations:** Uses OpenAI's GPT models to generate natural language explanations for recommendations.
- **Market Trends:** Analyzes job market data to inform recommendations.

## Tech Stack

- **FastAPI** for API endpoints
- **SQLAlchemy** for ORM/database access
- **Pydantic** for data validation
- **OpenAI API** for explanation generation
- **SQLite** as the default database

## Setup

1. **Clone the repository**

2. **Install dependencies**
    ```bash
    pip install -r requirements.txt
    ```

3. **Configure environment variables**
    - Copy `.env` and set your OpenAI API key:
      ```
      OPENAI_API_KEY="your_openai_api_key_here"
      ```

4. **Run the server**
    ```bash
    uvicorn main:app --reload
    ```

## API Endpoints

- `POST /students/` - Register a new student
- `GET /students/{student_id}` - Get student details
- `POST /students/{student_id}/profile/` - Create a student profile
- `GET /students/{student_id}/recommendations/` - Generate degree recommendations
- `GET /recommendations/{recommendation_id}/explanation` - Get explanation for a recommendation
- `POST /degree_programs/` - Add a degree program
- `GET /degree_programs/` - List degree programs

## Project Structure

```
Degree-Recommender-Backend/
├── database/
│   ├── crud.py
│   ├── db.py
│   └── schemas.py
├── recommendations/
│   ├── content_based_filtering.py
│   ├── explanation_generator.py
│   ├── market_trend_analyzer.py
│   ├── peer_clustering.py
│   ├── reccomendation_algorithm.py
│   ├── reccomendation_fusion.py
│   └── recommendation_engine.py
├── models.py
├── main.py
├── requirements.txt
├── .env
└── .gitignore
```

## Notes

- Passwords are stored in plain text for demonstration; use proper hashing in production.
- The recommendation algorithms are placeholders and should be implemented for real use.
- The OpenAI API is used for generating explanations; ensure your API key is valid.

## License

MIT License