-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create Enums
CREATE TYPE public.funding_soucrces AS ENUM ('self', 'parents', 'credit');

-- 1. Base Tables (No Foreign Keys)
CREATE TABLE public.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, 
    full_name TEXT,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.countries (
    country_code TEXT PRIMARY KEY,
    country_name TEXT NOT NULL
);

CREATE TABLE public.industries (
    industry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_name TEXT NOT NULL,
    embedding vector(384)
);

CREATE TABLE public.subjects (
    subject_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_name TEXT NOT NULL,
    embedding vector(384)
);

CREATE TABLE public.indicator_types (
    indicator_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_name TEXT NOT NULL UNIQUE,
    description TEXT,
    unit TEXT
);

CREATE TABLE public.degree_programs (
    program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_name TEXT NOT NULL,
    program_type TEXT,
    category TEXT,
    description TEXT,
    minimum_gpa DOUBLE PRECISION,
    description_embedding vector(384)
);

CREATE TABLE public.recommendation_weights (
    algorithm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    current BOOLEAN DEFAULT false,
    category_rank_weight DOUBLE PRECISION DEFAULT 0,
    confidence_score_weight DOUBLE PRECISION DEFAULT 0,
    market_score_weight DOUBLE PRECISION DEFAULT 0,
    semantic_similarity_weight DOUBLE PRECISION DEFAULT 0,
    subject_similarity_weight DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Dependent Tables (With Foreign Keys)
CREATE TABLE public.degree_industries (
    program_id UUID REFERENCES public.degree_programs(program_id) ON DELETE CASCADE,
    industry_id UUID REFERENCES public.industries(industry_id) ON DELETE CASCADE,
    PRIMARY KEY (program_id, industry_id)
);

CREATE TABLE public.subject_requirements (
    program_id UUID REFERENCES public.degree_programs(program_id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(subject_id) ON DELETE CASCADE,
    requirement_detail TEXT,
    PRIMARY KEY (program_id, subject_id)
);

CREATE TABLE public.academic_data (
    academic_data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    gpa DOUBLE PRECISION,
    grade_system TEXT,
    school_type TEXT
);

CREATE TABLE public.subject_grades (
    academic_data_id UUID REFERENCES public.academic_data(academic_data_id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(subject_id) ON DELETE CASCADE,
    grade TEXT,
    PRIMARY KEY (academic_data_id, subject_id)
);

CREATE TABLE public.socioeconomic_indicators (
    user_id UUID PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
    country_code TEXT REFERENCES public.countries(country_code) ON DELETE SET NULL,
    funding_method public.funding_soucrces,
    gender TEXT,
    income_level TEXT,
    school_type TEXT,
    father_education TEXT,
    mother_education TEXT
);

CREATE TABLE public.personal_interests (
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    interest TEXT NOT NULL,
    embedding vector(384),
    PRIMARY KEY (user_id, interest)
);

CREATE TABLE public.recommendations (
    recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.degree_programs(program_id) ON DELETE SET NULL,
    algorithm_source UUID REFERENCES public.recommendation_weights(algorithm_id) ON DELETE SET NULL,
    confidence_score DOUBLE PRECISION,
    market_score DOUBLE PRECISION,
    peer_score DOUBLE PRECISION,
    semantic_score DOUBLE PRECISION,
    subject_score DOUBLE PRECISION,
    explanation TEXT,
    liked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.market_indicator_values (
    value_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code TEXT REFERENCES public.countries(country_code) ON DELETE CASCADE,
    indicator_type_id UUID REFERENCES public.indicator_types(indicator_type_id) ON DELETE CASCADE,
    industry_id UUID REFERENCES public.industries(industry_id) ON DELETE CASCADE,
    value DOUBLE PRECISION,
    last_updated DATE DEFAULT CURRENT_DATE
);

CREATE TABLE public.reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_stats TEXT,
    generated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE TABLE public.activity_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    http_method_id TEXT,
    log_level_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.log_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES public.activity_logs(log_id) ON DELETE CASCADE,
    error_message TEXT,
    stack_trace TEXT
);

CREATE TABLE public.category_confidence (
    prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    predicted_category TEXT NOT NULL,
    prediction_confidence DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- 3. Functions (RPCs)

-- A. get_market_insights_reports
CREATE OR REPLACE FUNCTION public.get_market_insights_reports()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object(
    'avgIndicatorByIndustry', '[]'::json,
    'avgIndicatorByCountry', '[]'::json,
    'topIndustriesByIndicator', '[]'::json,
    'topCountriesByIndicator', '[]'::json,
    'indicatorTrendsCountry', '[]'::json,
    'indicatorTrendsIndustry', '[]'::json,
    'missingOrOutdated', '[]'::json,
    'correlationIndustryDegree', '[]'::json
  );
END;
$$;

-- B. get_admin_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object(
    'totalUsers', (SELECT count(*) FROM public.users),
    'newUsersThisMonth', 0,
    'totalRecommendations', (SELECT count(*) FROM public.recommendations),
    'recommendationsLiked', (SELECT count(*) FROM public.recommendations WHERE liked = true),
    'likePercentage', 0,
    'programsByCategory', '[]'::json,
    'activeAlgorithm', 'Default',
    'averageLikeRate', 0,
    'topIndustries', '[]'::json,
    'avgCategoryConfidence', 0
  );
END;
$$;

-- C. get_student_dashboard_data
CREATE OR REPLACE FUNCTION public.get_student_dashboard_data(p_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_name TEXT;
BEGIN
  SELECT full_name INTO v_student_name FROM public.users WHERE user_id = p_user_id;

  RETURN json_build_object(
    'student_name', COALESCE(v_student_name, 'Student'),
    'profile_data', json_build_object(
      'interests', '[]'::json,
      'subject_grades', '[]'::json,
      'socioeconomic', '{}'::json,
      'academic_data', '{}'::json
    ),
    'recommendations', '[]'::json
  );
END;
$$;

-- D. get_student_profile
CREATE OR REPLACE FUNCTION public.get_student_profile(p_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_data json;
BEGIN
  SELECT json_build_object('full_name', full_name) 
  INTO v_user_data 
  FROM public.users WHERE user_id = p_user_id;

  RETURN json_build_object(
    'user', COALESCE(v_user_data, '{}'::json),
    'academic_data', null,
    'personal_interests', '[]'::json,
    'subject_grades', '[]'::json,
    'socioeconomic_indicators', null,
    'countries', '[]'::json,
    'available_subjects', '[]'::json
  );
END;
$$;

-- E. get_dashboard_summary 
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN '{}'::json;
END;
$$;

-- 1. Create the function
CREATE OR REPLACE FUNCTION public.create_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_id, is_admin, full_name) VALUES (
    NEW.id,
    false,
    -- Safely checks for either 'full_name' or 'first_name' in the auth metadata
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'first_name', '')
  );
  RETURN NEW;
END;
$$;

-- 2. Bind the function to the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user();