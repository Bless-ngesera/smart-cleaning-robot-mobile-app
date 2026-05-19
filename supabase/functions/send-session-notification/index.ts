// supabase/functions/send-session-notification/index.ts
// Sends cleaning session emails: completed | failed | reminder
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendEmail } from '../_shared/resend.ts';
import { logEmail } from '../_shared/logger.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';
import { baseTemplate, escapeHtml, formatDate, FOOTER } from '../_shared/templates.ts';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SessionNotifType = 'completed' | 'failed' | 'reminder';

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

    try {
        const { sessionId, notifType, robotId, scheduledTime } = await req.json() as {
            sessionId?: string;
            notifType: SessionNotifType;
            robotId?: string;
            scheduledTime?: string;
        };

        if (!notifType) return json({ error: 'notifType is required' }, 400);
        if (notifType !== 'reminder' && !sessionId) return json({ error: 'sessionId required for completed/failed' }, 400);
        if (notifType === 'reminder' && !robotId) return json({ error: 'robotId required for reminder' }, 400);

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const supabase = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        let ownerId: string;
        let sessionData: any = null;
        let robot: any = null;

        if (notifType === 'reminder') {
            const { data: r, error } = await supabase
                .from('robots')
                .select('id, name, user_id')
                .eq('id', robotId!)
                .single();
            if (error || !r) return json({ error: 'Robot not found' }, 404);
            robot   = r;
            ownerId = r.user_id;
        } else {
            const { data: session, error: sessErr } = await supabase
                .from('cleaning_sessions')
                .select('id, robot_id, area_cleaned, duration, started_at, ended_at, failure_reason, robots(id, name, user_id)')
                .eq('id', sessionId!)
                .single();
            if (sessErr || !session) return json({ error: 'Session not found' }, 404);
            sessionData = session;
            robot       = (session as any).robots;
            ownerId     = robot?.user_id;
        }

        if (!ownerId) return json({ error: 'Could not resolve owner' }, 500);

        // Fetch owner
        const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(ownerId);
        if (userErr || !user?.email) return json({ error: 'Owner not found' }, 404);

        // Preferences
        const { data: prefs } = await supabase
            .from('email_preferences')
            .select('cleaning_complete, schedule_reminders, unsubscribed_all')
            .eq('user_id', ownerId)
            .maybeSingle();

        if (prefs?.unsubscribed_all) {
            await logEmail({ userId: ownerId, emailType: `session_${notifType}`, recipient: user.email, status: 'skipped', metadata: { reason: 'unsubscribed_all' } });
            return json({ success: true, skipped: true });
        }

        const prefKey = notifType === 'reminder' ? 'schedule_reminders' : 'cleaning_complete';
        if (prefs && prefs[prefKey] === false) {
            await logEmail({ userId: ownerId, emailType: `session_${notifType}`, recipient: user.email, status: 'skipped', metadata: { reason: 'preference_disabled' } });
            return json({ success: true, skipped: true });
        }

        // Rate limit
        const allowed = await checkRateLimit(ownerId, `session_${notifType}`);
        if (!allowed) return json({ error: 'Rate limit reached', code: 'RATE_LIMITED' }, 429);

        const firstName = escapeHtml((user.user_metadata?.full_name ?? user.email.split('@')[0]).split(' ')[0]);
        const robotName = escapeHtml(robot?.name ?? 'Your Robot');

        let html: string;
        let subject: string;

        if (notifType === 'completed') {
            const area     = sessionData?.area_cleaned ?? 0;
            const duration = sessionData?.duration ?? '—';
            const sessionLink = `smartcleanerpro://session-details?id=${sessionId}`;
            html    = buildCompletedHtml(firstName, robotName, area, duration, formatDate(sessionData?.ended_at ?? new Date().toISOString()), sessionLink);
            subject = `Cleaning complete – ${robotName}`;
        } else if (notifType === 'failed') {
            const reason = sessionData?.failure_reason ?? 'Unknown error';
            const robotLink = `smartcleanerpro://robot-details?id=${robot?.id}`;
            html    = buildFailedHtml(firstName, robotName, escapeHtml(reason), robotLink);
            subject = `Cleaning session failed – ${robotName}`;
        } else {
            const time = scheduledTime ? formatDate(scheduledTime) : 'soon';
            const schedLink = `smartcleanerpro://schedule?robot_id=${robot?.id}`;
            html    = buildReminderHtml(firstName, robotName, time, schedLink);
            subject = `Cleaning reminder – ${robotName}`;
        }

        const result = await sendEmail({ to: user.email, subject, html });

        await logEmail({
            userId:       ownerId,
            emailType:    `session_${notifType}`,
            recipient:    user.email,
            status:       result.success ? 'sent' : 'failed',
            resendId:     result.id,
            errorMessage: result.error,
            metadata:     { sessionId, notifType, robotId: robot?.id },
        });

        // Mark session email_sent
        if (sessionId && result.success) {
            await supabase.from('cleaning_sessions').update({ email_sent: true }).eq('id', sessionId);
        }

        if (!result.success) return json({ error: result.error, code: 'EMAIL_FAILED' }, 500);

        return json({ success: true });

    } catch (err: any) {
        console.error('[send-session-notification] Unexpected error:', err.message);
        return json({ error: err.message ?? 'Unexpected error' }, 500);
    }
});

function buildCompletedHtml(firstName: string, robotName: string, area: number, duration: string, date: string, deepLink: string): string {
    return baseTemplate(`
  <div class="hdr">
    <h1>Smart Cleaner Pro</h1>
    <p>Cleaning session finished</p>
  </div>
  <div class="body">
    <h2>Cleaning Complete ✅</h2>
    <p>Hi ${firstName}! <strong>${robotName}</strong> just finished a cleaning session on ${date}.</p>
    <div class="success-box" style="margin-top:20px">
      Your floors are sparkling clean ✨
    </div>
    <div class="stats">
      <div class="stat">
        <div class="stat-num">${area}m²</div>
        <div class="stat-lbl">Area Cleaned</div>
      </div>
      <div class="stat">
        <div class="stat-num">${escapeHtml(String(duration))}</div>
        <div class="stat-lbl">Duration</div>
      </div>
    </div>
    <div style="text-align:center">
      <a href="${deepLink}" class="btn">View Session Details</a>
    </div>
  </div>
  ${FOOTER}`);
}

function buildFailedHtml(firstName: string, robotName: string, reason: string, deepLink: string): string {
    return baseTemplate(`
  <div class="hdr red">
    <h1>Smart Cleaner Pro</h1>
    <p>Cleaning session failed</p>
  </div>
  <div class="body">
    <h2>Session Failed ⚠️</h2>
    <p>Hi ${firstName}, a cleaning session for <strong>${robotName}</strong> did not complete.</p>
    <div class="alert-box" style="margin-top:20px">
      <strong>Reason:</strong> ${reason}
    </div>
    <p style="margin-top:16px;font-size:14px;color:#374151">
      Please check your robot and try starting a new session from the app.
    </p>
    <div style="text-align:center">
      <a href="${deepLink}" class="btn red">Check Robot Status</a>
    </div>
  </div>
  ${FOOTER}`);
}

function buildReminderHtml(firstName: string, robotName: string, scheduledTime: string, deepLink: string): string {
    return baseTemplate(`
  <div class="hdr blue">
    <h1>Smart Cleaner Pro</h1>
    <p>Upcoming cleaning reminder</p>
  </div>
  <div class="body">
    <h2>Cleaning Reminder 📅</h2>
    <p>Hi ${firstName}! <strong>${robotName}</strong> has a scheduled cleaning session coming up.</p>
    <div class="info-box" style="margin-top:20px">
      <strong>Scheduled for:</strong> ${scheduledTime}
    </div>
    <p style="margin-top:16px;font-size:14px;color:#374151">
      Make sure your robot is charged and the cleaning path is clear.
    </p>
    <div style="text-align:center">
      <a href="${deepLink}" class="btn blue">View Schedule</a>
    </div>
  </div>
  ${FOOTER}`);
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    });
}
