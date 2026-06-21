-- Remove the problematic policy that exposes all users' data to any authenticated user
DROP POLICY IF EXISTS "Authenticated users can view basic user info" ON public.users;

-- The existing policies already handle proper access control:
-- "Users can view their own data" - allows users to see only their own information
-- "Users can update their own data" - allows users to update only their own information

-- These existing policies are sufficient and secure, ensuring users can only access their own data