
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('update-admin-password function called');
    const { email, passwordHash } = await req.json();
    
    if (!email || !passwordHash) {
      console.log('Missing email or passwordHash');
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Updating password for email:', email);

    // First try to update existing record
    const { data: updateData, error: updateError } = await supabase
      .from('admins')
      .update({ password_hash: passwordHash })
      .eq('email', email)
      .select();

    if (updateError) {
      console.error('Update error:', updateError);
      
      // If update failed, try to insert (might be first time setup)
      console.log('Update failed, attempting insert...');
      const { error: insertError } = await supabase
        .from('admins')
        .insert({ email, password_hash: passwordHash });

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to update password' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (!updateData || updateData.length === 0) {
      // No rows were updated, admin doesn't exist, create new one
      console.log('No admin found, creating new admin record...');
      const { error: insertError } = await supabase
        .from('admins')
        .insert({ email, password_hash: passwordHash });

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to create admin' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Password updated successfully');
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('update-admin-password error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
