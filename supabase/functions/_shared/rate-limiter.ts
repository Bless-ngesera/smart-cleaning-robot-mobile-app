// supabase/functions/_shared/rate-limiter.ts
// DB-backed rate limiter: max 5 emails per user per type per hour

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_PER_HOUR = 5;

export async function checkRateLimit(userId: string, emailType: string): Promise<boolean> {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) return true; // fail open if misconfigured

    const client = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();

    const { count, error } = await client
        .from('email_rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('email_type', emailType)
        .gte('sent_at', oneHourAgo);

    if (error) {
        console.warn('[rate-limiter] count query failed:', error.message);
        return true; // fail open
    }

    if ((count ?? 0) >= MAX_PER_HOUR) {
        console.warn(`[rate-limiter] rate limit hit for user=${userId} type=${emailType}`);
        return false;
    }

    // Record this send
    const { error: insertErr } = await client.from('email_rate_limits').insert({
        user_id:    userId,
        email_type: emailType,
    });

    if (insertErr) {
        console.warn('[rate-limiter] insert failed:', insertErr.message);
    }

    return true;
}
