// supabase/functions/send-robot-alert/index.ts
// Sends robot status alert emails: offline | low_battery | critical
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendEmail } from '../_shared/resend.ts';
import { logEmail } from '../_shared/logger.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';
import { baseTemplate, escapeHtml, FOOTER } from '../_shared/templates.ts';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AlertType = 'offline' | 'low_battery' | 'critical';

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

    try {
        const { robotId, alertType, details } = await req.json() as {
            robotId: string;
            alertType: AlertType;
            details?: string;
        };

        if (!robotId || !alertType) return json({ error: 'robotId and alertType are required' }, 400);

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const supabase = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // Fetch robot + owner
        const { data: robot, error: robotErr } = await supabase
            .from('robots')
            .select('id, name, user_id, is_online, connection_type')
            .eq('id', robotId)
            .single();

        if (robotErr || !robot) {
            return json({ error: 'Robot not found', code: 'ROBOT_NOT_FOUND' }, 404);
        }

        // Fetch owner profile
        const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(robot.user_id);
        if (userErr || !user?.email) {
            return json({ error: 'Owner not found', code: 'USER_NOT_FOUND' }, 404);
        }

        // Check email preferences
        const { data: prefs } = await supabase
            .from('email_preferences')
            .select('robot_offline, error_alerts, unsubscribed_all')
            .eq('user_id', robot.user_id)
            .maybeSingle();

        if (prefs?.unsubscribed_all) {
            await logEmail({ userId: robot.user_id, emailType: `robot_alert_${alertType}`, recipient: user.email, status: 'skipped', metadata: { reason: 'unsubscribed_all' } });
            return json({ success: true, skipped: true });
        }

        const prefKey = alertType === 'offline' ? 'robot_offline' : 'error_alerts';
        if (prefs && prefs[prefKey] === false) {
            await logEmail({ userId: robot.user_id, emailType: `robot_alert_${alertType}`, recipient: user.email, status: 'skipped', metadata: { reason: 'preference_disabled' } });
            return json({ success: true, skipped: true });
        }

        // Rate limit: max 5 robot alerts / hour
        const allowed = await checkRateLimit(robot.user_id, `robot_alert_${alertType}`);
        if (!allowed) {
            return json({ error: 'Rate limit reached', code: 'RATE_LIMITED' }, 429);
        }

        const firstName = escapeHtml((user.user_metadata?.full_name ?? user.email.split('@')[0]).split(' ')[0]);
        const robotName = escapeHtml(robot.name ?? 'Your Robot');
        const deepLink  = `smartcleanerpro://robot-details?id=${robot.id}`;

        const html = buildAlertHtml(firstName, robotName, alertType, details, deepLink);
        const subject = getSubject(robotName, alertType);

        const result = await sendEmail({ to: user.email, subject, html });

        await logEmail({
            userId:       robot.user_id,
            emailType:    `robot_alert_${alertType}`,
            recipient:    user.email,
            status:       result.success ? 'sent' : 'failed',
            resendId:     result.id,
            errorMessage: result.error,
            metadata:     { robotId, alertType, details },
        });

        // Record incident
        await supabase.from('robot_incidents').insert({
            robot_id:      robotId,
            severity:      alertType === 'critical' ? 'critical' : alertType === 'offline' ? 'warning' : 'info',
            incident_type: alertType,
            description:   details ?? getDefaultDescription(alertType, robotName),
            email_sent:    result.success,
        });

        if (!result.success) return json({ error: result.error, code: 'EMAIL_FAILED' }, 500);

        return json({ success: true });

    } catch (err: any) {
        console.error('[send-robot-alert] Unexpected error:', err.message);
        return json({ error: err.message ?? 'Unexpected error' }, 500);
    }
});

function getSubject(robotName: string, type: AlertType): string {
    if (type === 'offline')     return `${robotName} went offline`;
    if (type === 'low_battery') return `${robotName} has low battery`;
    return `${robotName} needs immediate attention`;
}

function getDefaultDescription(type: AlertType, robotName: string): string {
    if (type === 'offline')     return `${robotName} lost connection`;
    if (type === 'low_battery') return `${robotName} battery is low`;
    return `${robotName} encountered a critical error`;
}

function buildAlertHtml(firstName: string, robotName: string, type: AlertType, details: string | undefined, deepLink: string): string {
    const isOffline  = type === 'offline';
    const isBattery  = type === 'low_battery';
    const isCritical = type === 'critical';

    const hdrClass  = isCritical ? 'hdr red' : isBattery ? 'hdr amber' : 'hdr red';
    const hdrTitle  = isCritical ? 'Critical Alert' : isBattery ? 'Low Battery Warning' : 'Robot Offline';
    const hdrSub    = isCritical ? 'Immediate attention required' : isBattery ? 'Charge your robot soon' : 'Robot lost connection';
    const boxClass  = isBattery ? 'warn-box' : 'alert-box';
    const btnClass  = isBattery ? 'btn' : 'btn red';
    const icon      = isBattery
        ? `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${isBattery ? '#F59E0B' : '#EF4444'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/></svg>`
        : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

    const iconBg    = isBattery ? 'rgba(245,158,11,.12)' : 'rgba(239,68,68,.12)';
    const detailHtml = details ? `<p style="margin-top:8px;font-size:14px;color:#991b1b"><strong>Details:</strong> ${escapeHtml(details)}</p>` : '';

    return baseTemplate(`
  <div class="${hdrClass}">
    <h1>Smart Cleaner Pro</h1>
    <p>${hdrSub}</p>
  </div>
  <div class="body">
    <div style="text-align:center">
      <div class="icon-wrap" style="background:${iconBg}">${icon}</div>
    </div>
    <h2 style="text-align:center">${hdrTitle}</h2>
    <p style="text-align:center;margin-top:8px">Hi ${firstName}, your robot needs attention.</p>
    <div class="${boxClass}" style="margin-top:20px">
      <strong>${robotName}</strong> ${isOffline ? 'has gone offline and is no longer reachable.' : isBattery ? 'has a low battery level. Please charge it soon to avoid interruptions.' : 'has encountered a critical error and requires immediate attention.'}
      ${detailHtml}
    </div>
    <div style="text-align:center">
      <a href="${deepLink}" class="${btnClass}">View Robot Status</a>
    </div>
    <p class="note" style="margin-top:24px">
      If the button doesn't open the app, make sure Smart Cleaner Pro is installed on your device.
    </p>
  </div>
  ${FOOTER}`);
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    });
}
