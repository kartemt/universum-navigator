
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, serviceKey);

// Simple hash function using Web Crypto API
async function simpleHash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Rate limiting storage (in-memory for demo, use Redis in production)
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

  // Reset if window expired
  if (now - entry.timestamp > RATE_WINDOW) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now });
    return true;
  }

  // Check if limit exceeded
  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  // Increment count
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('verify-admin function called');
    const { email, password, fingerprint } = await req.json();
    
    if (!email || !password) {
      console.log('Missing email or password');
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting based on fingerprint
    const rateLimitKey = fingerprint || req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(rateLimitKey)) {
      console.log('Rate limit exceeded for:', rateLimitKey);
      return new Response(JSON.stringify({ error: 'Too many attempts' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Looking up admin with email:', email);
    const { data, error } = await supabase
      .from('admins')
      .select('password_hash, ip_whitelist')
      .eq('email', email)
      .single();

    if (error || !data) {
      console.error('Admin not found or database error:', error);
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check IP whitelist if configured
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    if (data.ip_whitelist && data.ip_whitelist.length > 0 && clientIP) {
      if (!data.ip_whitelist.includes(clientIP)) {
        console.log('IP not in whitelist:', clientIP);
        return new Response(JSON.stringify({ error: 'Access denied from this IP' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Admin found, verifying password');
    console.log('Stored hash:', data.password_hash);
    
    // Hash the provided password and compare with stored hash
    const hashedPassword = await simpleHash(password);
    console.log('Hashed input password:', hashedPassword);
    
    const valid = hashedPassword === data.password_hash;
    
    console.log('Password verification result:', valid);
    
    if (!valid) {
      console.log('Password verification failed');
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Password verification successful');
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('verify-admin error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
