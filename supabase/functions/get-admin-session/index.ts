
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cookie',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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
  console.log('Raw cookie header:', cookieHeader);
  
  if (!cookieHeader) {
    console.log('No cookie header found');
    return null;
  }
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  console.log('Parsed cookies:', cookies);
  
  const sessionCookie = cookies.find(c => c.startsWith('admin_session='));
  console.log('Session cookie found:', sessionCookie);
  
  return sessionCookie ? sessionCookie.split('=')[1] : null;
}

serve(async (req) => {
  console.log('=== GET SESSION REQUEST ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight for get-session handled');
    return new Response(null, { headers: allHeaders });
  }

  try {
    console.log('Processing get admin session request...');
    
    // Детальное логирование всех заголовков
    const headers = Object.fromEntries(req.headers.entries());
    console.log('All request headers:', headers);
    
    const cookieHeader = req.headers.get('cookie');
    const sessionToken = parseSessionCookie(cookieHeader);
    
    console.log('Session token extracted:', !!sessionToken);
    
    if (!sessionToken) {
      console.log('No session token in cookies - returning 401');
      return new Response(JSON.stringify({ error: 'No session found' }), {
        status: 401,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Проверяем сессию
    console.log('Checking session in database...');
    let session;
    try {
      const { data, error: sessionError } = await supabase
        .from('admin_sessions')
        .select('admin_id, expires_at')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .single();

      console.log('Session query result:', { data: !!data, error: sessionError?.message });

      if (sessionError || !data) {
        console.log('Invalid or expired session:', sessionError?.message);
        return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
          status: 401,
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        });
      }

      session = data;
      console.log('Valid session found for admin_id:', session.admin_id);
    } catch (error) {
      console.error('Session query error:', error);
      return new Response(JSON.stringify({ error: 'Session verification failed' }), {
        status: 500,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Получаем данные админа
    console.log('Fetching admin data...');
    let admin;
    try {
      const { data, error: adminError } = await supabase
        .from('admins')
        .select('id, email')
        .eq('id', session.admin_id)
        .single();

      if (adminError || !data) {
        console.log('Admin not found:', adminError?.message);
        return new Response(JSON.stringify({ error: 'Admin not found' }), {
          status: 404,
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        });
      }

      admin = data;
      console.log('Admin found:', admin.email);
    } catch (error) {
      console.error('Admin query error:', error);
      return new Response(JSON.stringify({ error: 'Admin lookup failed' }), {
        status: 500,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Session successfully restored for:', admin.email);
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
