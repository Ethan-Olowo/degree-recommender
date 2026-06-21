# Degree Recommender

Degree Recommender helps students discover university programs that match their strengths, interests, and career goals.

It combines profile data, market trends, and machine-learning scoring to produce personalized degree suggestions, then explains each recommendation in plain language.

## What It Does

- Recommends degrees based on academic profile and interests
- Incorporates job-market indicators to improve ranking
- Provides explainable recommendations with score breakdowns
- Offers a student dashboard and admin reporting interface
- Includes recommendation chat support for follow-up guidance

## Why It Matters

Choosing a degree can be overwhelming. This project turns scattered data into clear, actionable recommendations so students can make more confident decisions.

## Product Highlights

- Full-stack platform (FastAPI backend + React frontend)
- Supabase-backed data and authentication
- Hybrid recommendation approach:
  - content fit
  - peer similarity
  - market relevance
- Explainability-first workflow, not just raw scoring

## High-Level Architecture

1. Student creates or updates profile
2. Recommendation engine generates ranked programs
3. System stores and displays top recommendations
4. Explanations and chat provide decision support

## Audience

- Students exploring degree options
- Academic advisors and institutions
- Product and data teams building education guidance tools

## Documentation

For setup, local development, API endpoints, and testing instructions, see [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).
