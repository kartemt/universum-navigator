
-- Fix the search_path security vulnerability in get_current_admin_id function
CREATE OR REPLACE FUNCTION public.get_current_admin_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT s.admin_id
  FROM public.admin_sessions s
  WHERE s.session_token = current_setting('request.headers', true)::json->>'authorization'
  AND s.expires_at > now()
  LIMIT 1;
$$;

-- Also fix the is_admin_session function for consistency and security
CREATE OR REPLACE FUNCTION public.is_admin_session()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_sessions s
    JOIN public.admins a ON s.admin_id = a.id
    WHERE s.session_token = current_setting('request.headers', true)::json->>'authorization'
    AND s.expires_at > now()
  );
$$;
