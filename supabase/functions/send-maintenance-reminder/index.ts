// supabase/functions/send-maintenance-reminder/index.ts
// Sends maintenance reminder emails (30-day or 100-session trigger)
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

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

    try {
        const { robotId, triggerReason } = await req.json() as {
            robotId: string;
            triggerReason?: '30_days' | '100_sessions' | 'manual';
        };

        if (!robotId) return json({ error: 'robotId is required' }, 400);

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const supabase = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: robot, error: robotErr } = await supabase
            .from('robots')
            .select('id, name, user_id, firmware_version, total_sessions_since_maintenance, last_maintenance_date')
            .eq('id', robotId)
            .single();

        if (robotErr || !robot) return json({ error: 'Robot not found' }, 404);

        const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(robot.user_id);
        if (userErr || !user?.email) return json({ error: 'Owner not found' }, 404);

        // Preferences
        const { data: prefs } = await supabase
            .from('email_preferences')
            .select('maintenance_reminder, unsubscribed_all')
            .eq('user_id', robot.user_id)
            .maybeSingle();

        if (prefs?.unsubscribed_all || prefs?.maintenance_reminder === false) {
            await logEmail({ userId: robot.user_id, emailType: 'maintenance_reminder', recipient: user.email, status: 'skipped', metadata: { reason: 'preference_disabled' } });
            return json({ success: true, skipped: true });
        }

        const allowed = await checkRateLimit(robot.user_id, 'maintenance_reminder');
        if (!allowed) return json({ error: 'Rate limit reached', code: 'RATE_LIMITED' }, 429);

        const firstName   = escapeHtml((user.user_metadata?.full_name ?? user.email.split('@')[0]).split(' ')[0]);
        const robotName   = escapeHtml(robot.name ?? 'Your Robot');
        const lastMaint   = robot.last_maintenance_date ? formatDate(robot.last_maintenance_date) : 'Never';
        const sessions    = robot.total_sessions_since_maintenance ?? 0;
        const firmware    = robot.firmware_version ? escapeHtml(robot.firmware_version) : 'Unknown';
        const deepLink    = `smartcleanerpro://maintenance?robot_id=${robot.id}`;
        const reason      = triggerReason ?? 'manual';

        const html    = buildMaintenanceHtml(firstName, robotName, lastMaint, sessions, firmware, reason, deepLink);
        const subject = `${robotName} is due for maintenance`;

        const result = await sendEmail({ to: user.email, subject, html });

        await logEmail({
            userId:       robot.user_id,
            emailType:    'maintenance_reminder',
            recipient:    user.email,
            status:       result.success ? 'sent' : 'failed',
            resendId:     result.id,
            errorMessage: result.error,
            metadata:     { robotId, triggerReason: reason },
        });

        if (!result.success) return json({ error: result.error, code: 'EMAIL_FAILED' }, 500);

        return json({ success: true });

    } catch (err: any) {
        console.error('[send-maintenance-reminder] Unexpected error:', err.message);
        return json({ error: err.message ?? 'Unexpected error' }, 500);
    }
});

function buildMaintenanceHtml(firstName: string, robotName: string, lastMaint: string, sessions: number, firmware: string, reason: string, deepLink: string): string {
    const reasonText = reason === '30_days'
        ? 'It has been over 30 days since the last maintenance check.'
        : reason === '100_sessions'
            ? `${robotName} has completed ${sessions} cleaning sessions since the last maintenance.`
            : 'A manual maintenance reminder was triggered.';

    return baseTemplate(`
  <div class="hdr amber">
    <h1>Smart Cleaner Pro</h1>
    <p>Maintenance reminder</p>
  </div>
  <div class="body">
    <h2>🔧 Maintenance Due</h2>
    <p>Hi ${firstName}! It's time to give <strong>${robotName}</strong> some TLC.</p>
    <div class="warn-box" style="margin-top:20px">
      ${reasonText}
    </div>
    <div class="stats">
      <div class="stat">
        <div class="stat-num">${sessions}</div>
        <div class="stat-lbl">Sessions Since Maint.</div>
      </div>
      <div class="stat">
        <div class="stat-num" style="font-size:16px">${lastMaint}</div>
        <div class="stat-lbl">Last Maintenance</div>
      </div>
    </div>
    <p style="font-size:14px;color:#374151;margin-top:4px">
      <strong>Firmware:</strong> ${firmware}
    </p>
    <div style="margin-top:20px">
      <p style="font-size:13px;font-weight:600;color:#374151;margin-bottom:10px">Recommended maintenance tasks:</p>
      <ul>
        <li>Clean the dustbin and filter</li>
        <li>Check and clean the brushes</li>
        <li>Inspect wheels for debris</li>
        <li>Wipe sensors with a dry cloth</li>
        <li>Check for firmware updates</li>
      </ul>
    </div>
    <div style="text-align:center">
      <a href="${deepLink}" class="btn">View Maintenance Guide</a>
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
