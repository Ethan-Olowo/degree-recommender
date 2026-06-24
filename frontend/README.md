# Frontend (Degree Recommender)

React + TypeScript frontend for the Degree Recommender platform.

This app provides:

- Student experience: profile creation, recommendation dashboard, degree exploration, comparison, recommendation details, and chat assistant.
- Admin experience: management pages (degrees, subjects, industries, algorithms) and analytics/reporting views.
- Authentication and role-based routing backed by Supabase.

## Stack

- React 18 + TypeScript
- Vite 5
- React Router
- TanStack Query
- Supabase JS
- Tailwind CSS + shadcn/ui

## Requirements

- Node.js 18+ (or a current LTS release)
- npm
- Running backend API (default expected at `http://localhost:8000`)
- Supabase instance configured for this project (local dev defaults are currently wired in `src/integrations/supabase/client.ts`)

## Setup

From this folder (`frontend/`):

```sh
npm install
```

## Available Scripts

```sh
# Start dev server
npm run dev

# Build production bundle
npm run build

# Build with development mode
npm run build:dev

# Lint the codebase
npm run lint

# Preview the built app locally
npm run preview
```

## Routing Overview

Main routes are defined in `src/App.tsx`:

- Public: `/`, `/auth`
- Student: `/dashboard`, `/explore`, `/degree/:programId`, `/compare`, `/profile`, `/profile/create`, `/recommendation/:recommendationId`
- Admin: `/admin`, `/admin/degrees`, `/admin/subjects`, `/admin/industries`, `/admin/algorithms`, and report routes under `/admin/reports/*`

Dashboard routing is role-aware via auth context:

- Admin users are routed to admin dashboard.
- Non-admin users are routed to student dashboard.

## Backend and Data Integration

The frontend uses two data paths:

- Supabase client operations (auth, profile/admin data lookups, and RPC usage).
- Direct backend API calls for recommendations, explanations, and chat.

Current API calls in the codebase target `http://localhost:8000` directly. If you run the backend elsewhere, update those endpoints or centralize them behind a shared config.

## Directory Map

- `src/pages/Student/`: student-facing pages
- `src/pages/Admin/`: admin-facing pages and reports
- `src/components/`: shared UI and app components
- `src/contexts/`: app-wide context providers (auth)
- `src/integrations/supabase/`: Supabase client and generated types
- `src/hooks/`: custom hooks

## Development Notes

- Keep frontend and backend contracts in sync when changing recommendation/chat endpoints.
- If auth or role behavior changes, verify both student and admin dashboard flows.
- Run lint before committing:

```sh
npm run lint
```
