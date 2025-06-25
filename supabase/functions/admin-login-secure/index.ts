
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

// Простое хеширование SHA-256 для обратной совместимости
async function hashPasswordSimple(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Улучшенное хеширование с солью
async function hashPasswordEnhanced(password: string, userId?: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = userId ? `universum_${userId}_salt_2024` : 'universum_salt_2024';
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Функция верификации пароля с детальным логированием
async function verifyPassword(password: string, storedHash: string, userId?: string): Promise<boolean> {
  try {
    console.log('Starting password verification...');
    
    // Пробуем простой SHA-256 хеш (для существующих паролей)
    const simpleHash = await hashPasswordSimple(password);
    console.log('Generated simple hash, checking match...');
    if (simpleHash === storedHash) {
      console.log('Simple hash matched!');
      return true;
    }
    
    // Пробуем улучшенный хеш с общей солью
    const enhancedHash = await hashPasswordEnhanced(password);
    console.log('Generated enhanced hash, checking match...');
    if (enhancedHash === storedHash) {
      console.log('Enhanced hash matched!');
      return true;
    }
    
    // Пробуем хеш с уникальной солью пользователя
    if (userId) {
      const userSpecificHash = await hashPasswordEnhanced(password, userId);
      console.log('Generated user-specific hash, checking match...');
      if (userSpecificHash === storedHash) {
        console.log('User-specific hash matched!');
        return true;
      }
    }
    
    console.log('No hash variants matched');
    return false;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: allHeaders });
  }

  try {
    console.log('Secure login request received');
    
    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { email, password } = body;
    
    if (!email || !password) {
      console.log('Missing email or password');
      return new Response(JSON.stringify({ error: 'Missing email or password' }), {
        status: 400,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Login attempt for email:', email);

    // Получаем запись админа
    let admin;
    try {
      const { data, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (adminError || !data) {
        console.log('Admin not found or error:', adminError?.message);
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      admin = data;
      console.log('Admin found:', admin.email);
    } catch (error) {
      console.error('Database query error:', error);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Проверяем блокировку аккаунта
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      console.log('Account is locked until:', admin.locked_until);
      return new Response(JSON.stringify({ 
        error: 'Account is temporarily locked due to too many failed attempts' 
      }), {
        status: 423,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Проверяем пароль
    const passwordValid = await verifyPassword(password, admin.password_hash, admin.id);

    if (!passwordValid) {
      console.log('Invalid password for admin:', admin.email);
      
      try {
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
      } catch (error) {
        console.error('Failed to update failed login attempts:', error);
      }
      
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Password verified for admin:', admin.email);

    // Генерируем токен сессии
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 час

    // Извлекаем IP клиента
    const clientIP = extractClientIP(req);
    console.log('Client IP extracted:', clientIP);

    // Создаем сессию в базе данных
    try {
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
    } catch (error) {
      console.error('Session creation failed:', error);
      return new Response(JSON.stringify({ error: 'Login failed' }), {
        status: 500,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Session created successfully');

    // Сбрасываем неудачные попытки и обновляем данные входа
    try {
      const updates: any = { 
        failed_login_attempts: 0, 
        locked_until: null,
        last_login_at: new Date().toISOString()
      };

      // Обновляем до улучшенного хеша если это простой SHA-256
      const simpleHash = await hashPasswordSimple(password);
      if (simpleHash === admin.password_hash) {
        const enhancedHash = await hashPasswordEnhanced(password, admin.id);
        updates.password_hash = enhancedHash;
        console.log('Password hash upgraded for admin:', admin.email);
      }

      await supabase
        .from('admins')
        .update(updates)
        .eq('id', admin.id);
    } catch (error) {
      console.error('Failed to update admin record:', error);
      // Не возвращаем ошибку, так как основная операция входа успешна
    }

    // Создаем безопасное httpOnly куки и возвращаем данные сессии
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
