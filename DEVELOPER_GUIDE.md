# Degree Recommender Developer Guide

A full-stack degree recommendation platform that combines:

- A FastAPI backend for recommendation generation, explanation generation, and chat.
- A React + Vite frontend for student and admin experiences.
- Supabase (PostgreSQL + Auth) as the primary data/auth backend.

The system recommends degree programs using a hybrid strategy (content fit, peer similarity, and market trends), then supports follow-up explanation and chat interactions.

## Project Overview

### Core capabilities

- Personalized degree recommendations for a user profile.
- Weighted scoring that combines:
  - semantic/interest alignment,
  - subject-strength fit,
  - peer/category confidence,
  - market trend signals.
- On-demand explanation generation for each recommendation (via OpenRouter).
- Recommendation-focused chat assistant for follow-up guidance.
- Admin pages for managing degrees/subjects/industries/algorithm settings and reports.

### High-level architecture

- Frontend (React, TypeScript, Vite, Tailwind, shadcn/ui)
  - Handles auth and data display via Supabase client.
  - Calls backend endpoints for recommendation generation, explanations, and chat.
- Backend (FastAPI, SQLAlchemy, Pydantic)
  - Reads user/profile/program data from PostgreSQL.
  - Runs recommendation pipeline.
  - Persists recommendation output and logs.
  - Calls external APIs:
    - OpenRouter (LLM explanations/chat)
    - World Bank (market indicators)
- Data layer
  - PostgreSQL/Supabase schema for users, profiles, degree programs, market indicators, recommendations, and activity logs.

## Repository Structure

```text
.
├── backend/                  # FastAPI app + recommendation engine + tests
│   ├── main.py               # API entrypoint
│   ├── database/             # SQLAlchemy DB session, schemas, CRUD
│   ├── recommendations/      # Recommendation algorithms and explainers
│   └── tests/                # Pytest unit tests
├── frontend/                 # React/Vite web app
│   ├── src/pages/            # Student and Admin pages
│   ├── src/components/       # UI + feature components
│   └── src/integrations/     # Supabase client/types
├── supabase/                 # Root Supabase config and migrations
└── database_archive/         # DB backup artifacts
```

Note: there is also a `frontend/supabase/` directory used by frontend tooling/workflow.

## Tech Stack

### Backend

- FastAPI + Uvicorn
- SQLAlchemy
- Pydantic
- psycopg2
- pandas, numpy, scikit-learn, xgboost, torch
- sentence-transformers
- OpenRouter API (for explanation/chat generation)

### Frontend

- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui + Radix primitives
- React Router
- Supabase JS client
- TanStack Query

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm (or bun)
- Access to a PostgreSQL/Supabase database
- OpenRouter API key (for explanation/chat features)

Optional (for local Supabase):

- Supabase CLI
- Docker

## Quick Start

### 1. Clone

```bash
git clone <your-repo-url>
cd degree-recommender
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
SUPABASE_DB_URL=postgresql://<user>:<password>@<host>:<port>/<db>
OPENROUTER_API_KEY=<your_openrouter_key>
```

Run backend:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 3. Frontend setup

From repo root:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

- `http://localhost:8080`

Important integration note:

- The frontend currently calls backend endpoints at `http://localhost:8000/...` directly for recommendations/explanations/chat.
- Keep backend running on port 8000 during local development unless you also update those fetch URLs.

## Running with Supabase

This repo contains Supabase configs/migrations at the root `supabase/` directory.

Typical local flow (if you use Supabase CLI):

```bash
supabase start
supabase db reset
```

If you use a hosted Supabase instance, point `SUPABASE_DB_URL` in `backend/.env` to your remote database.

## Backend API Endpoints

### Market indicators

- `POST /market-indicators/`
  - Fetches/refreshes market indicator values for given years/countries.

### Recommendations

- `GET /users/{user_id}/recommendations/`
  - Generates and returns recommendations for the user.
- `GET /{user_id}/recommendations/{recommendation_id}/explanation`
  - Returns existing explanation or generates one if missing.

### Chat

- `POST /users/{user_id}/chat`
  - Chat endpoint for recommendation guidance.

## Recommendation Pipeline (Backend)

At a high level:

1. Predict user-relevant categories via peer clustering.
2. Retrieve degree programs and metadata from DB.
3. Compute content-based scores (interests/subjects).
4. Compute market score from indicator trends.
5. Weight and rank recommendations.
6. Persist top recommendations and return top 5.

Model artifacts are loaded from:

- `backend/recommendations/models/`

## Testing

Backend tests use pytest.

```bash
cd backend
pytest -q
```

Current test suite covers recommendation modules including:

- content-based filtering
- peer clustering
- market trend analyzer
- explanation generator
- recommendation engine helpers

## Useful Commands

### Backend

```bash
cd backend
uvicorn main:app --reload
pytest -q
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run lint
npm run preview
```

## Known Development Notes

- CORS is currently configured with permissive defaults (`allow_origins=["*"]`) for development.
- OpenRouter-backed features require `OPENROUTER_API_KEY`; without it, explanation/chat functionality will fail.
- Frontend Supabase client values are currently present in source; if you need environment-based config, migrate those values to Vite env variables.

## License

No license file is currently present at the repository root. Add one if you plan to distribute this project.
