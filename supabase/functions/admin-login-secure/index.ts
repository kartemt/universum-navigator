import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

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
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Missing email or password' }), {
        status: 400,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get admin record (reusing existing logic from admin-login)
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (adminError || !admin) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if account is locked
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return new Response(JSON.stringify({ 
        error: 'Account is temporarily locked due to too many failed attempts' 
      }), {
        status: 423,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify password
    let passwordValid = false;
    
    if (admin.password_hash_bcrypt) {
      passwordValid = await bcrypt.compare(password, admin.password_hash_bcrypt);
    } else if (admin.password_hash) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      passwordValid = hashedPassword === admin.password_hash;
      
      if (passwordValid) {
        const bcryptHash = await bcrypt.hash(password, 12);
        await supabase
          .from('admins')
          .update({ password_hash_bcrypt: bcryptHash })
          .eq('id', admin.id);
      }
    }

    if (!passwordValid) {
      const newFailedAttempts = (admin.failed_login_attempts || 0) + 1;
      const updates: any = { failed_login_attempts: newFailedAttempts };
      
      if (newFailedAttempts >= 5) {
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      }
      
      await supabase
        .from('admins')
        .update(updates)
        .eq('id', admin.id);
      
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    // Create session in database
    const { error: sessionError } = await supabase
      .from('admin_sessions')
      .insert({
        admin_id: admin.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(JSON.stringify({ error: 'Login failed' }), {
        status: 500,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Reset failed attempts
    await supabase
      .from('admins')
      .update({ 
        failed_login_attempts: 0, 
        locked_until: null,
        last_login_at: new Date().toISOString()
      })
      .eq('id', admin.id);

    // Set secure httpOnly cookie and return session data
    const cookie = createSecureCookie(sessionToken, expiresAt);
    
    return new Response(JSON.stringify({ 
      success: true,
      session: {
        sessionToken: sessionToken,
        expiresAt: expiresAt.toISOString(),
        admin: {
          id: admin.id,
          email: admin.email
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
    console.error('Secure login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...allHeaders, 'Content-Type': 'application/json' },
    });
  }
});
