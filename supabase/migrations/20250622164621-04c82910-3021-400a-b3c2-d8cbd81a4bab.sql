
-- Fix critical RLS policies - remove dangerous "USING (true)" policies
-- and implement proper admin authentication

-- First, drop the existing dangerous policies
DROP POLICY IF EXISTS "Admins can manage sections" ON public.sections;
DROP POLICY IF EXISTS "Admins can manage material types" ON public.material_types;
DROP POLICY IF EXISTS "Admins can manage posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can manage post sections" ON public.post_sections;
DROP POLICY IF EXISTS "Admins can manage post material types" ON public.post_material_types;
DROP POLICY IF EXISTS "Admins can manage admins" ON public.admins;

-- Create admin sessions table for secure session management
CREATE TABLE public.admin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES public.admins(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on admin sessions
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if current session is admin
CREATE OR REPLACE FUNCTION public.is_admin_session()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_sessions s
    JOIN public.admins a ON s.admin_id = a.id
    WHERE s.session_token = current_setting('request.headers', true)::json->>'authorization'
    AND s.expires_at > now()
  );
$$;

-- Create function to get current admin from session
CREATE OR REPLACE FUNCTION public.get_current_admin_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT s.admin_id
  FROM public.admin_sessions s
  WHERE s.session_token = current_setting('request.headers', true)::json->>'authorization'
  AND s.expires_at > now()
  LIMIT 1;
$$;

-- Create new secure RLS policies for admin operations
CREATE POLICY "Only admins can insert sections" ON public.sections
  FOR INSERT 
  WITH CHECK (public.is_admin_session());

CREATE POLICY "Only admins can update sections" ON public.sections
  FOR UPDATE 
  USING (public.is_admin_session());

CREATE POLICY "Only admins can delete sections" ON public.sections
  FOR DELETE 
  USING (public.is_admin_session());

CREATE POLICY "Only admins can insert material types" ON public.material_types
  FOR INSERT 
  WITH CHECK (public.is_admin_session());

CREATE POLICY "Only admins can update material types" ON public.material_types
  FOR UPDATE 
  USING (public.is_admin_session());

CREATE POLICY "Only admins can delete material types" ON public.material_types
  FOR DELETE 
  USING (public.is_admin_session());

CREATE POLICY "Only admins can insert posts" ON public.posts
  FOR INSERT 
  WITH CHECK (public.is_admin_session());

CREATE POLICY "Only admins can update posts" ON public.posts
  FOR UPDATE 
  USING (public.is_admin_session());

CREATE POLICY "Only admins can delete posts" ON public.posts
  FOR DELETE 
  USING (public.is_admin_session());

CREATE POLICY "Only admins can manage post sections" ON public.post_sections
  FOR ALL 
  USING (public.is_admin_session())
  WITH CHECK (public.is_admin_session());

CREATE POLICY "Only admins can manage post material types" ON public.post_material_types
  FOR ALL 
  USING (public.is_admin_session())
  WITH CHECK (public.is_admin_session());

-- Admin table policies
CREATE POLICY "Admins can view admin records" ON public.admins
  FOR SELECT 
  USING (public.is_admin_session());

CREATE POLICY "Admins can update admin records" ON public.admins
  FOR UPDATE 
  USING (public.is_admin_session());

-- Session policies
CREATE POLICY "Admins can view their sessions" ON public.admin_sessions
  FOR SELECT 
  USING (admin_id = public.get_current_admin_id());

CREATE POLICY "Admins can delete their sessions" ON public.admin_sessions
  FOR DELETE 
  USING (admin_id = public.get_current_admin_id());

-- Create admin activity log table for security monitoring
CREATE TABLE public.admin_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity log
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy for activity log (admins can view all logs)
CREATE POLICY "Admins can view activity logs" ON public.admin_activity_log
  FOR SELECT 
  USING (public.is_admin_session());

-- Add indexes for performance
CREATE INDEX idx_admin_sessions_token ON public.admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_expires ON public.admin_sessions(expires_at);
CREATE INDEX idx_admin_activity_log_created_at ON public.admin_activity_log(created_at DESC);

-- Update admin table to use better password hashing column name
ALTER TABLE public.admins ADD COLUMN password_hash_bcrypt TEXT;

-- Add failed login attempts tracking
ALTER TABLE public.admins ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE public.admins ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.admins ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
