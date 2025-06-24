
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

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'universum_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password against both old SHA-256 and new hashed passwords
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Try new hash format first
  const newHash = await hashPassword(password);
  if (newHash === storedHash) {
    return true;
  }
  
  // Try old SHA-256 format
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
    const { currentPassword, newPassword } = await req.json();
    
    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'Missing current or new password' }), {
        status: 400,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate password requirements
    if (newPassword.length < 12) {
      return new Response(JSON.stringify({ error: 'Password must be at least 12 characters long' }), {
        status: 400,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(newPassword)) {
      return new Response(JSON.stringify({ error: 'Password must contain uppercase, lowercase, number, and special character' }), {
        status: 400,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Password change request received');

    // Get session token from cookie or Authorization header
    const authCookie = req.headers.get('Cookie')?.split(';')
      .find(c => c.trim().startsWith('admin_session='))?.split('=')[1];
    
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    const sessionToken = authCookie || authHeader;

    if (!sessionToken) {
      console.log('No session token found');
      return new Response(JSON.stringify({ error: 'No authentication token provided' }), {
        status: 401,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify session
    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .select('admin_id, expires_at')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) {
      console.log('Invalid session token');
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (new Date(session.expires_at) <= new Date()) {
      console.log('Session expired');
      return new Response(JSON.stringify({ error: 'Session expired' }), {
        status: 401,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get admin record
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('id', session.admin_id)
      .single();

    if (adminError || !admin) {
      console.log('Admin not found');
      return new Response(JSON.stringify({ error: 'Admin not found' }), {
        status: 404,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify current password
    let currentPasswordValid = false;
    
    if (admin.password_hash_bcrypt) {
      currentPasswordValid = await verifyPassword(currentPassword, admin.password_hash_bcrypt);
    } else if (admin.password_hash) {
      currentPasswordValid = await verifyPassword(currentPassword, admin.password_hash);
    }

    if (!currentPasswordValid) {
      console.log('Current password is incorrect');
      return new Response(JSON.stringify({ error: 'Current password is incorrect' }), {
        status: 400,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const { error: updateError } = await supabase
      .from('admins')
      .update({ 
        password_hash_bcrypt: newPasswordHash,
        password_hash: null // Clear old hash
      })
      .eq('id', admin.id);

    if (updateError) {
      console.error('Password update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update password' }), {
        status: 500,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Password changed successfully for admin:', admin.email);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...allHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Password change error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...allHeaders, 'Content-Type': 'application/json' },
    });
  }
});
