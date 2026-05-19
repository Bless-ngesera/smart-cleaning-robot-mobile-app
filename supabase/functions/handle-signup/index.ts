// supabase/functions/handle-signup/index.ts
//
// Owns the entire signup flow server-side:
//   1. Create user via admin API (no Supabase email triggered)
//   2. Generate confirmation link via admin.generateLink
//   3. Send branded email via Resend
//
// This completely bypasses Supabase's built-in email service, eliminating
// the "unexpected_failure: Error sending confirmation email" error caused by
// Supabase's free-tier rate limits.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { logEmail } from '../_shared/logger.ts';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS });
    }

    try {
        const { email, password, fullName, redirectTo } = await req.json();

        if (!email || !password) {
            return json({ error: 'email and password are required' }, 400);
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const resendKey   = Deno.env.get('RESEND_API_KEY');

        if (!supabaseUrl || !serviceKey) {
            console.error('[handle-signup] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
            return json({ error: 'Server misconfiguration' }, 500);
        }
        if (!resendKey) {
            console.error('[handle-signup] Missing RESEND_API_KEY');
            return json({ error: 'Server misconfiguration: RESEND_API_KEY not set' }, 500);
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // ── Step 1: Create user via admin API (email_confirm: false = stays unconfirmed) ──
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: false,
            user_metadata: { full_name: fullName ?? '' },
        });

        let newlyCreated = true;

        if (createError) {
            const msg = createError.message?.toLowerCase() ?? '';
            const isAlreadyExists = msg.includes('already registered') || msg.includes('already been registered') || msg.includes('already exists') || msg.includes('duplicate');

            if (!isAlreadyExists) {
                console.error('[handle-signup] createUser error:', createError.message);
                return json({ error: createError.message, code: 'CREATE_FAILED' }, 400);
            }

            // User already exists — check if they're still unconfirmed.
            // If so, resend the confirmation link instead of rejecting.
            console.log('[handle-signup] User already exists, checking confirmation status for:', email);
            newlyCreated = false;
        }

        const user = userData?.user ?? null;
        if (newlyCreated) console.log('[handle-signup] User created:', user!.id);

        // ── Step 2: Generate confirmation link ──────────────────────────────────────────
        // For unconfirmed users this generates a fresh token.
        // For confirmed users this will fail → we return USER_EXISTS.
        const { data: linkData, error: genError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email,
            options: { redirectTo: redirectTo ?? '' },
        });

        if (genError || !linkData?.properties?.action_link) {
            if (!newlyCreated) {
                // generateLink failed for existing user → already confirmed
                console.log('[handle-signup] generateLink failed for existing user (confirmed):', genError?.message);
                return json({ error: 'Email already in use', code: 'USER_EXISTS' }, 400);
            }
            console.error('[handle-signup] generateLink error for new user:', genError?.message ?? 'no action_link');
            await supabaseAdmin.auth.admin.deleteUser(user!.id);
            return json({ error: 'Failed to generate confirmation link', code: 'LINK_FAILED' }, 500);
        }

        const confirmLink = linkData.properties.action_link;

        // ── Step 3: Send via Resend ────────────────────────────────────────────────────
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
            const resendErr = await resendRes.json().catch(() => ({}));
            console.error('[handle-signup] Resend error:', JSON.stringify(resendErr));
            // Only delete the user if WE created them — don't delete pre-existing users
            if (newlyCreated && user) await supabaseAdmin.auth.admin.deleteUser(user.id);
            await logEmail({
                userId:       user?.id ?? null,
                emailType:    'signup_confirmation',
                recipient:    email,
                status:       'failed',
                errorMessage: JSON.stringify(resendErr),
            });
            return json({ error: 'Failed to send confirmation email', detail: resendErr, code: 'EMAIL_FAILED' }, 500);
        }

        const isResent = !newlyCreated;
        console.log(`[handle-signup] ${isResent ? 'Resent' : 'Signup complete'}, confirmation email sent to:`, email);

        await logEmail({
            userId:    user?.id ?? null,
            emailType: isResent ? 'signup_resend' : 'signup_confirmation',
            recipient: email,
            status:    'sent',
        });

        return json({ success: true, userId: user?.id ?? null, resent: isResent });

    } catch (err: any) {
        console.error('[handle-signup] Unexpected error:', err.message);
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
    <h2 style="font-size:18px;font-weight:700;color:#111827;text-align:center;margin-bottom:16px">Confirm Your Email, ${firstName}!</h2>
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
