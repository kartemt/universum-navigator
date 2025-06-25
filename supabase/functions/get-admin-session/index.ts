
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

// Проверяем environment переменные
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceKey) {
  console.error('Missing required environment variables');
  throw new Error('Server configuration error');
}

const supabase = createClient(supabaseUrl, serviceKey);

function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('admin_session='));
  
  return sessionCookie ? sessionCookie.split('=')[1] : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: allHeaders });
  }

  try {
    console.log('Get admin session request received');
    
    const cookieHeader = req.headers.get('cookie');
    const sessionToken = parseSessionCookie(cookieHeader);
    
    console.log('Session token found:', !!sessionToken);
    
    if (!sessionToken) {
      console.log('No session token in cookies');
      return new Response(JSON.stringify({ error: 'No session found' }), {
        status: 401,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Сначала проверяем сессию
    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .select('admin_id, expires_at')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      console.log('Invalid or expired session:', sessionError?.message);
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Valid session found for admin_id:', session.admin_id);

    // Теперь получаем данные админа отдельным запросом
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, email')
      .eq('id', session.admin_id)
      .single();

    if (adminError || !admin) {
      console.log('Admin not found:', adminError?.message);
      return new Response(JSON.stringify({ error: 'Admin not found' }), {
        status: 404,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Admin found:', admin.email);

    return new Response(JSON.stringify({ 
      session: {
        sessionToken: sessionToken,
        expiresAt: session.expires_at,
        admin: {
          id: admin.id,
          email: admin.email
        }
      }
    }), {
      headers: { ...allHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Get session error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...allHeaders, 'Content-Type': 'application/json' },
    });
  }
});
