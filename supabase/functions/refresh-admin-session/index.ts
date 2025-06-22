import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Credentials': 'true',
};

const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

const allHeaders = { ...corsHeaders, ...securityHeaders };

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, serviceKey);

function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('admin_session='));
  
  return sessionCookie ? sessionCookie.split('=')[1] : null;
}

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function createSecureCookie(sessionToken: string, expiresAt: Date): string {
  const expires = expiresAt.toUTCString();
  return `admin_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=${expires}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: allHeaders });
  }

  try {
    const cookieHeader = req.headers.get('cookie');
    const currentSessionToken = parseSessionCookie(cookieHeader);
    
    if (!currentSessionToken) {
      return new Response(JSON.stringify({ error: 'No session to refresh' }), {
        status: 401,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify current session
    const { data: currentSession } = await supabase
      .from('admin_sessions')
      .select('admin_id, admins(*)')
      .eq('session_token', currentSessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!currentSession) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate new session token
    const newSessionToken = generateSessionToken();
    const newExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    // Delete old session and create new one
    await supabase
      .from('admin_sessions')
      .delete()
      .eq('session_token', currentSessionToken);

    const { error: sessionError } = await supabase
      .from('admin_sessions')
      .insert({
        admin_id: currentSession.admin_id,
        session_token: newSessionToken,
        expires_at: newExpiresAt.toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      });

    if (sessionError) {
      console.error('Session refresh error:', sessionError);
      return new Response(JSON.stringify({ error: 'Failed to refresh session' }), {
        status: 500,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set new secure cookie
    const cookie = createSecureCookie(newSessionToken, newExpiresAt);

    return new Response(JSON.stringify({ 
      session: {
        sessionToken: newSessionToken,
        expiresAt: newExpiresAt.toISOString(),
        admin: {
          id: currentSession.admins.id,
          email: currentSession.admins.email
        }
      }
    }), {
      headers: { 
        ...allHeaders, 
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      },
    });

  } catch (error) {
    console.error('Session refresh error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...allHeaders, 'Content-Type': 'application/json' },
    });
  }
});
