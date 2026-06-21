-- Enable RLS on all public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socioeconomic_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.degree_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.degree_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_indicator_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view their own data" ON public.users
FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own data" ON public.users
FOR UPDATE USING (auth.uid() = auth_id);

-- Allow authenticated users to see basic user info (for display purposes)
CREATE POLICY "Authenticated users can view basic user info" ON public.users
FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for student_profiles table
CREATE POLICY "Students can view their own profile" ON public.student_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.user_id = student_profiles.user_id 
    AND users.auth_id = auth.uid()
  )
);

CREATE POLICY "Students can insert their own profile" ON public.student_profiles
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.user_id = student_profiles.user_id 
    AND users.auth_id = auth.uid()
  )
);

CREATE POLICY "Students can update their own profile" ON public.student_profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.user_id = student_profiles.user_id 
    AND users.auth_id = auth.uid()
  )
);

-- Policies for academic_data table
CREATE POLICY "Students can view their own academic data" ON public.academic_data
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE sp.academic_data_id = academic_data.academic_data_id
    AND u.auth_id = auth.uid()
  )
);

CREATE POLICY "Students can insert their own academic data" ON public.academic_data
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Students can update their own academic data" ON public.academic_data
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE sp.academic_data_id = academic_data.academic_data_id
    AND u.auth_id = auth.uid()
  )
);

-- Policies for personal_interests table
CREATE POLICY "Students can view their own interests" ON public.personal_interests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE sp.profile_id = personal_interests.profile_id
    AND u.auth_id = auth.uid()
  )
);

CREATE POLICY "Students can insert their own interests" ON public.personal_interests
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE sp.profile_id = personal_interests.profile_id
    AND u.auth_id = auth.uid()
  )
);

CREATE POLICY "Students can update their own interests" ON public.personal_interests
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE sp.profile_id = personal_interests.profile_id
    AND u.auth_id = auth.uid()
  )
);

CREATE POLICY "Students can delete their own interests" ON public.personal_interests
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE sp.profile_id = personal_interests.profile_id
    AND u.auth_id = auth.uid()
  )
);

-- Policies for socioeconomic_indicators table
CREATE POLICY "Students can view their own socioeconomic data" ON public.socioeconomic_indicators
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE sp.profile_id = socioeconomic_indicators.profile_id
    AND u.auth_id = auth.uid()
  )
);

CREATE POLICY "Students can insert their own socioeconomic data" ON public.socioeconomic_indicators
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE sp.profile_id = socioeconomic_indicators.profile_id
    AND u.auth_id = auth.uid()
  )
);

CREATE POLICY "Students can update their own socioeconomic data" ON public.socioeconomic_indicators
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE sp.profile_id = socioeconomic_indicators.profile_id
    AND u.auth_id = auth.uid()
  )
);

-- Policies for subject_grades table
CREATE POLICY "Students can view their own grades" ON public.subject_grades
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.academic_data ad
    JOIN public.student_profiles sp ON sp.academic_data_id = ad.academic_data_id
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE ad.academic_data_id = subject_grades.academic_data_id
    AND u.auth_id = auth.uid()
  )
);

CREATE POLICY "Students can insert their own grades" ON public.subject_grades
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.academic_data ad
    JOIN public.student_profiles sp ON sp.academic_data_id = ad.academic_data_id
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE ad.academic_data_id = subject_grades.academic_data_id
    AND u.auth_id = auth.uid()
  )
);

CREATE POLICY "Students can update their own grades" ON public.subject_grades
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.academic_data ad
    JOIN public.student_profiles sp ON sp.academic_data_id = ad.academic_data_id
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE ad.academic_data_id = subject_grades.academic_data_id
    AND u.auth_id = auth.uid()
  )
);

CREATE POLICY "Students can delete their own grades" ON public.subject_grades
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.academic_data ad
    JOIN public.student_profiles sp ON sp.academic_data_id = ad.academic_data_id
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE ad.academic_data_id = subject_grades.academic_data_id
    AND u.auth_id = auth.uid()
  )
);

-- Policies for recommendations table
CREATE POLICY "Students can view their own recommendations" ON public.recommendations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.users u ON u.user_id = sp.user_id
    WHERE sp.profile_id = recommendations.profile_id
    AND u.auth_id = auth.uid()
  )
);

-- Admins can manage recommendations
CREATE POLICY "Admins can view all recommendations" ON public.recommendations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.is_admin = true
  )
);

CREATE POLICY "Admins can insert recommendations" ON public.recommendations
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.is_admin = true
  )
);

CREATE POLICY "Admins can update recommendations" ON public.recommendations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.is_admin = true
  )
);

-- Public read-only tables (for browsing degrees and reference data)
-- These are intentionally public as they contain catalog data

-- Degree programs - public read for browsing
CREATE POLICY "Anyone can view degree programs" ON public.degree_programs
FOR SELECT USING (true);

-- Admins can manage degree programs
CREATE POLICY "Admins can insert degree programs" ON public.degree_programs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.is_admin = true
  )
);

CREATE POLICY "Admins can update degree programs" ON public.degree_programs
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.is_admin = true
  )
);

CREATE POLICY "Admins can delete degree programs" ON public.degree_programs
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.is_admin = true
  )
);

-- Industries - public read for reference
CREATE POLICY "Anyone can view industries" ON public.industries
FOR SELECT USING (true);

-- Degree industries relationship - public read
CREATE POLICY "Anyone can view degree industries" ON public.degree_industries
FOR SELECT USING (true);

-- Subjects - public read for reference
CREATE POLICY "Anyone can view subjects" ON public.subjects
FOR SELECT USING (true);

-- Subject requirements - public read
CREATE POLICY "Anyone can view subject requirements" ON public.subject_requirements
FOR SELECT USING (true);

-- Countries - public read for reference
CREATE POLICY "Anyone can view countries" ON public.countries
FOR SELECT USING (true);

-- Indicator types - public read for reference
CREATE POLICY "Anyone can view indicator types" ON public.indicator_types
FOR SELECT USING (true);

-- Market indicator values - public read for reference
CREATE POLICY "Anyone can view market indicators" ON public.market_indicator_values
FOR SELECT USING (true);

-- Reports - admin only
CREATE POLICY "Admins can view reports" ON public.reports
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.is_admin = true
  )
);

CREATE POLICY "Admins can insert reports" ON public.reports
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.is_admin = true
  )
);

CREATE POLICY "Admins can update reports" ON public.reports
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.is_admin = true
  )
);

CREATE POLICY "Admins can delete reports" ON public.reports
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.is_admin = true
  )
);

-- Fix the create_user function to have proper search_path
CREATE OR REPLACE FUNCTION public.create_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_id, is_admin, full_name) VALUES(
    NEW.id,
    false,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'first_name', '')
  );
  RETURN NEW;
END;
$$;