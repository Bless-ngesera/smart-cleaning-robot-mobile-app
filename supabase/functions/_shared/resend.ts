// supabase/functions/_shared/resend.ts
// Resend API wrapper with 3-attempt exponential back-off

const RESEND_URL = 'https://api.resend.com/emails';

export interface SendEmailParams {
    to: string | string[];
    subject: string;
    html: string;
    replyTo?: string;
}

export interface SendEmailResult {
    success: boolean;
    id?: string;
    error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
        console.error('[resend] RESEND_API_KEY not set');
        return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const body = {
        from: 'Smart Cleaner Pro <hello@smartcleanerpro.online>',
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    };

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(RESEND_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const json = await res.json().catch(() => ({}));

            if (res.ok) {
                console.log(`[resend] sent id=${json.id}`);
                return { success: true, id: json.id };
            }

            // 4xx — don't retry
            if (res.status >= 400 && res.status < 500) {
                const msg = json.message ?? json.error ?? `HTTP ${res.status}`;
                console.error(`[resend] client error (${res.status}):`, msg);
                return { success: false, error: msg };
            }

            // 5xx — retry after back-off
            console.warn(`[resend] attempt ${attempt} failed (${res.status}), retrying...`);
        } catch (err: any) {
            console.warn(`[resend] attempt ${attempt} threw:`, err.message);
        }

        if (attempt < 3) {
            await new Promise(r => setTimeout(r, 500 * 2 ** (attempt - 1)));
        }
    }

    return { success: false, error: 'Failed after 3 attempts' };
}
