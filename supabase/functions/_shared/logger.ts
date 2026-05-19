// supabase/functions/_shared/logger.ts
// Writes email send results to the email_logs table

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface LogEmailParams {
    userId: string | null;
    emailType: string;
    recipient: string;
    status: 'sent' | 'failed' | 'skipped';
    resendId?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
}

export async function logEmail(params: LogEmailParams): Promise<void> {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
        console.warn('[logger] Missing Supabase env vars — skipping log');
        return;
    }

    const client = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await client.from('email_logs').insert({
        user_id:       params.userId,
        email_type:    params.emailType,
        recipient:     params.recipient,
        status:        params.status,
        resend_id:     params.resendId ?? null,
        error_message: params.errorMessage ?? null,
        metadata:      params.metadata ?? {},
    });

    if (error) {
        console.warn('[logger] Failed to write email log:', error.message);
    }
}
