// supabase/functions/send-confirmation-email/index.ts
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
        const { email, redirectTo, fullName } = await req.json();

        if (!email) {
            return json({ error: 'email is required' }, 400);
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const resendKey   = Deno.env.get('RESEND_API_KEY');

        if (!supabaseUrl || !serviceKey) {
            console.error('[send-confirmation-email] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
            return json({ error: 'Server misconfiguration: missing Supabase credentials' }, 500);
        }
        if (!resendKey) {
            console.error('[send-confirmation-email] Missing RESEND_API_KEY');
            return json({ error: 'Server misconfiguration: RESEND_API_KEY not set' }, 500);
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // Generate a fresh confirmation link for the (already-created) user
        const { data, error: genError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email,
            options: { redirectTo: redirectTo ?? '' },
        });

        if (genError) {
            console.error('[send-confirmation-email] generateLink error:', genError.message);
            return json({ error: genError.message }, 400);
        }

        const confirmLink = data.properties?.action_link;
        if (!confirmLink) {
            console.error('[send-confirmation-email] No action_link in generateLink response');
            return json({ error: 'Failed to generate confirmation link' }, 500);
        }

        console.log('[send-confirmation-email] Sending confirmation email to:', email);

        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Smart Cleaner Pro <hello@smartcleanerpro.online>',
                to: [email],
                subject: 'Confirm your Smart Cleaner Pro account',
                html: buildHtml(confirmLink, fullName ?? email.split('@')[0]),
            }),
        });

        if (!resendRes.ok) {
            const resendErr = await resendRes.json();
            console.error('[send-confirmation-email] Resend error:', resendErr);
            return json({ error: 'Failed to send email via Resend', detail: resendErr }, 500);
        }

        console.log('[send-confirmation-email] Confirmation email sent successfully to:', email);
        return json({ success: true });

    } catch (err: any) {
        console.error('[send-confirmation-email] Unexpected error:', err.message);
        return json({ error: err.message ?? 'Unexpected error' }, 500);
    }
});

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    });
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildHtml(confirmLink: string, name: string): string {
    const firstName = escapeHtml(name.split(' ')[0]);
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
  .body h2{font-size:18px;font-weight:700;margin-bottom:16px;color:#111827}
  .icon-wrap{width:80px;height:80px;border-radius:50%;background:rgba(16,185,129,.12);display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
  .btn{display:inline-block;background:#10B981;color:#fff!important;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;margin:24px 0;letter-spacing:.3px}
  .note{font-size:13px;color:#6b7280;line-height:1.65;margin-top:16px}
  .link-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-top:14px;word-break:break-all;font-size:11.5px;color:#374151;font-family:monospace}
  .steps{background:#f9fafb;border-radius:10px;padding:16px;margin-top:20px}
  .step{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}
  .step-num{width:24px;height:24px;border-radius:50%;background:#10B981;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .divider{border:none;border-top:1px solid #f3f4f6;margin:24px 0}
  .ftr{background:#f3f4f6;padding:20px 28px;text-align:center;font-size:12px;color:#9ca3af}
  .ftr a{color:#10B981;text-decoration:none}
</style>
</head>
<body>
<div class="shell">
  <div class="hdr">
    <h1>Smart Cleaner Pro</h1>
    <p>Welcome aboard!</p>
  </div>
  <div class="body">
    <div style="text-align:center">
      <div class="icon-wrap">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
    </div>
    <h2 style="text-align:center">Confirm Your Email, ${firstName}!</h2>
    <p style="font-size:15px;line-height:1.65;color:#374151;text-align:center;margin-top:8px">
      You're one step away from taking control of your smart cleaning robot.
      Tap the button below to verify your email address.
    </p>
    <div style="text-align:center">
      <a href="${confirmLink}" class="btn">Confirm My Account</a>
    </div>
    <hr class="divider"/>
    <div class="steps">
      <p style="font-size:13px;font-weight:600;color:#374151;margin-bottom:12px">After confirming, you'll be able to:</p>
      <div class="step">
        <div class="step-num">1</div>
        <p style="font-size:13px;color:#374151;line-height:1.5">Connect your robot via Bluetooth or Wi-Fi</p>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <p style="font-size:13px;color:#374151;line-height:1.5">Start cleaning sessions and track progress</p>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <p style="font-size:13px;color:#374151;line-height:1.5">Receive weekly cleaning reports by email</p>
      </div>
    </div>
    <p class="note">
      ⏱ This link expires in <strong>24 hours</strong>. If you didn't create an account,
      you can safely ignore this email.
    </p>
    <p class="note" style="margin-top:18px">If the button doesn't work, paste this link into your browser:</p>
    <div class="link-box">${confirmLink}</div>
  </div>
  <div class="ftr">
    <p>Smart Cleaner Pro &bull; <a href="mailto:hello@smartcleanerpro.online">hello@smartcleanerpro.online</a></p>
    <p style="margin-top:6px">&copy; 2026 Smart Cleaner Pro. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}
