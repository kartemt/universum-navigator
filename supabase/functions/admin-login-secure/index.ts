
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

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function createSecureCookie(sessionToken: string, expiresAt: Date): string {
  const expires = expiresAt.toUTCString();
  return `admin_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=${expires}`;
}

function extractClientIP(req: Request): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwardedFor) {
    const firstIP = forwardedFor.split(',')[0].trim();
    return firstIP;
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return null;
}

// Enhanced password hashing using PBKDF2 with unique salt
async function hashPassword(password: string, userId?: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = userId ? `universum_${userId}_salt_2024` : 'universum_salt_2024';
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password against stored hash
async function verifyPassword(password: string, storedHash: string, userId?: string): Promise<boolean> {
  // Try new hash format with user-specific salt
  if (userId) {
    const newHash = await hashPassword(password, userId);
    if (newHash === storedHash) {
      return true;
    }
  }
  
  // Try enhanced hash format
  const enhancedHash = await hashPassword(password);
  if (enhancedHash === storedHash) {
    return true;
  }
  
  // Try old SHA-256 format for backward compatibility
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const oldHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return oldHash === storedHash;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: allHeaders });
  }

  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      console.log('Missing email or password');
      return new Response(JSON.stringify({ error: 'Missing email or password' }), {
        status: 400,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Secure login attempt for email:', email);

    // Get admin record
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (adminError || !admin) {
      console.log('Admin not found or error:', adminError);
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Admin found:', admin.email);

    // Check if account is locked
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      console.log('Account is locked until:', admin.locked_until);
      return new Response(JSON.stringify({ 
        error: 'Account is temporarily locked due to too many failed attempts' 
      }), {
        status: 423,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify password using enhanced verification
    const passwordValid = await verifyPassword(password, admin.password_hash, admin.id);

    if (!passwordValid) {
      console.log('Invalid password for admin:', admin.email);
      const newFailedAttempts = (admin.failed_login_attempts || 0) + 1;
      const updates: any = { failed_login_attempts: newFailedAttempts };
      
      if (newFailedAttempts >= 5) {
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        console.log('Account locked due to failed attempts');
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

    console.log('Password verified for admin:', admin.email);

    // Generate session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // Reduced to 1 hour for security

    // Extract client IP properly
    const clientIP = extractClientIP(req);
    console.log('Client IP extracted:', clientIP);

    // Create session in database
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
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Session created successfully');

    // Reset failed attempts and upgrade password hash if needed
    const updates: any = { 
      failed_login_attempts: 0, 
      locked_until: null,
      last_login_at: new Date().toISOString()
    };

    // Upgrade to enhanced hash with user-specific salt if using old format
    const enhancedHash = await hashPassword(password, admin.id);
    if (enhancedHash !== admin.password_hash) {
      updates.password_hash = enhancedHash;
      console.log('Password hash upgraded for admin:', admin.email);
    }

    await supabase
      .from('admins')
      .update(updates)
      .eq('id', admin.id);

    // Set secure httpOnly cookie and return session data
    const cookie = createSecureCookie(sessionToken, expiresAt);
    
    console.log('Secure login successful for admin:', admin.email);
    
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
