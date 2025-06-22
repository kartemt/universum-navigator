
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, serviceKey);

// Rate limiting storage (use Redis in production)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 5; // Max 5 attempts per 15 minutes
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now });
    return true;
  }

  if (now - entry.timestamp > RATE_WINDOW) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function logActivity(adminId: string, action: string, ipAddress: string | null, userAgent: string | null) {
  try {
    await supabase
      .from('admin_activity_log')
      .insert({
        admin_id: adminId,
        action: action,
        ip_address: ipAddress,
        user_agent: userAgent
      });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Missing email or password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `${email}_${clientIP}`;
    
    if (!checkRateLimit(rateLimitKey)) {
      return new Response(JSON.stringify({ error: 'Too many login attempts. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get admin record
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (adminError || !admin) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if account is locked
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return new Response(JSON.stringify({ 
        error: 'Account is temporarily locked due to too many failed attempts' 
      }), {
        status: 423,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check IP whitelist if configured
    if (admin.ip_whitelist && admin.ip_whitelist.length > 0 && clientIP !== 'unknown') {
      if (!admin.ip_whitelist.includes(clientIP)) {
        await logActivity(admin.id, 'failed_login_ip_blocked', clientIP, req.headers.get('user-agent'));
        return new Response(JSON.stringify({ error: 'Access denied from this IP address' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Verify password (check both bcrypt and legacy SHA-256)
    let passwordValid = false;
    
    if (admin.password_hash_bcrypt) {
      // Use bcrypt if available
      passwordValid = await bcrypt.compare(password, admin.password_hash_bcrypt);
    } else if (admin.password_hash) {
      // Fallback to legacy SHA-256 (for migration)
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      passwordValid = hashedPassword === admin.password_hash;
      
      // If legacy password is valid, upgrade to bcrypt
      if (passwordValid) {
        const bcryptHash = await bcrypt.hash(password, 12);
        await supabase
          .from('admins')
          .update({ password_hash_bcrypt: bcryptHash })
          .eq('id', admin.id);
      }
    }

    if (!passwordValid) {
      // Increment failed attempts
      const newFailedAttempts = (admin.failed_login_attempts || 0) + 1;
      const updates: any = { failed_login_attempts: newFailedAttempts };
      
      // Lock account after 5 failed attempts
      if (newFailedAttempts >= 5) {
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
      }
      
      await supabase
        .from('admins')
        .update(updates)
        .eq('id', admin.id);

      await logActivity(admin.id, 'failed_login_invalid_password', clientIP, req.headers.get('user-agent'));
      
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    // Create session
    const { error: sessionError } = await supabase
      .from('admin_sessions')
      .insert({
        admin_id: admin.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent')
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(JSON.stringify({ error: 'Login failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Reset failed attempts and update last login
    await supabase
      .from('admins')
      .update({ 
        failed_login_attempts: 0, 
        locked_until: null,
        last_login_at: new Date().toISOString()
      })
      .eq('id', admin.id);

    // Log successful login
    await logActivity(admin.id, 'successful_login', clientIP, req.headers.get('user-agent'));

    return new Response(JSON.stringify({ 
      success: true, 
      sessionToken: sessionToken,
      expiresAt: expiresAt.toISOString(),
      admin: {
        id: admin.id,
        email: admin.email
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
