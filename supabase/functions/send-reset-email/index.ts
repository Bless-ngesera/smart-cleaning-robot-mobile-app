// supabase/functions/send-reset-email/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS });
    }

    try {
        const { email, redirectTo } = await req.json();

        if (!email) {
            return json({ error: 'email is required' }, 400);
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const resendKey   = Deno.env.get('RESEND_API_KEY');

        if (!supabaseUrl || !serviceKey) {
            console.error('[send-reset-email] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
            return json({ error: 'Server misconfiguration: missing Supabase credentials' }, 500);
        }
        if (!resendKey) {
            console.error('[send-reset-email] Missing RESEND_API_KEY secret');
            return json({ error: 'Server misconfiguration: RESEND_API_KEY not set — run: supabase secrets set RESEND_API_KEY=<your-key>' }, 500);
        }

        // Admin client — service role key stays server-side
        const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data, error: genError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: { redirectTo: redirectTo ?? '' },
        });

        if (genError) {
            console.error('[send-reset-email] generateLink error:', genError.message);
            const isNotFound = genError.message?.toLowerCase().includes('user not found');
            return json({
                error: genError.message,
                code: isNotFound ? 'USER_NOT_FOUND' : undefined,
            }, 400);
        }

        const resetLink = data.properties?.action_link;
        if (!resetLink) {
            console.error('[send-reset-email] No action_link in generateLink response');
            return json({ error: 'Failed to generate reset link' }, 500);
        }

        console.log('[send-reset-email] Sending reset email to:', email);

        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Smart Cleaner Pro <hello@smartcleanerpro.me>',
                to: [email],
                subject: 'Reset your Smart Cleaner Pro password',
                html: buildHtml(resetLink),
            }),
        });

        if (!resendRes.ok) {
            const resendErr = await resendRes.json();
            console.error('[send-reset-email] Resend error:', resendErr);
            return json({ error: 'Failed to send email via Resend', detail: resendErr }, 500);
        }

        console.log('[send-reset-email] Reset email sent successfully to:', email);
        return json({ success: true });

    } catch (err: any) {
        console.error('[send-reset-email] Unexpected error:', err.message);
        return json({ error: err.message ?? 'Unexpected error' }, 500);
    }
});

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    });
}

function buildHtml(resetLink: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;color:#1f2937;padding:24px}
  .shell{max-width:580px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
  .hdr{background:linear-gradient(135deg,#10B981,#059669);padding:32px 28px;text-align:center;color:#fff}
  .hdr h1{font-size:22px;font-weight:700;margin-bottom:4px}
  .hdr p{font-size:14px;opacity:.85}
  .body{background:#fff;padding:32px 28px}
  .body h2{font-size:18px;font-weight:700;margin-bottom:16px;color:#111827;text-align:center}
  .icon-wrap{width:80px;height:80px;border-radius:50%;background:rgba(16,185,129,.12);display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
  .btn{display:inline-block;background:#10B981;color:#fff!important;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;margin:24px 0;letter-spacing:.3px}
  .note{font-size:13px;color:#6b7280;line-height:1.65;margin-top:16px}
  .link-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-top:14px;word-break:break-all;font-size:11.5px;color:#374151;font-family:monospace}
  .divider{border:none;border-top:1px solid #f3f4f6;margin:24px 0}
  .ftr{background:#f3f4f6;padding:20px 28px;text-align:center;font-size:12px;color:#9ca3af}
  .ftr a{color:#10B981;text-decoration:none}
</style>
</head>
<body>
<div class="shell">
  <div class="hdr">
    <h1>Smart Cleaner Pro</h1>
    <p>Password Reset Request</p>
  </div>
  <div class="body">
    <div style="text-align:center">
      <div class="icon-wrap">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
    </div>
    <h2>Reset Your Password</h2>
    <p style="font-size:15px;line-height:1.65;color:#374151;text-align:center;margin-top:8px">
      We received a request to reset the password for your<br/>Smart Cleaner Pro account.
    </p>
    <div style="text-align:center">
      <a href="${resetLink}" class="btn">Reset Password</a>
    </div>
    <hr class="divider"/>
    <p class="note">
      ⏱ This link expires in <strong>1 hour</strong>. If you didn't request a password reset,
      you can safely ignore this email — your password won't change.
    </p>
    <p class="note" style="margin-top:18px">If the button doesn't work, paste this link into your browser:</p>
    <div class="link-box">${resetLink}</div>
  </div>
  <div class="ftr">
    <p>Smart Cleaner Pro &bull; <a href="mailto:hello@smartcleanerpro.me">hello@smartcleanerpro.me</a></p>
    <p style="margin-top:6px">&copy; 2026 Smart Cleaner Pro. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}
