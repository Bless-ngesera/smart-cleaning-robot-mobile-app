// supabase/functions/send-low-battery/index.ts
// Dedicated low-battery alert with 6-hour per-robot rate limiting.
// Called by DB trigger on_robot_low_battery when battery_level crosses < 20 %.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendEmail } from '../_shared/resend.ts';
import { logEmail } from '../_shared/logger.ts';
import { baseTemplate, escapeHtml, FOOTER } from '../_shared/templates.ts';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT_HOURS = 6;

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

    try {
        const { robotId, batteryLevel } = await req.json() as {
            robotId: string;
            batteryLevel?: number;
        };

        if (!robotId) return json({ error: 'robotId is required' }, 400);

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        if (!supabaseUrl || !serviceKey) {
            console.error('[send-low-battery] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
            return json({ error: 'Server misconfiguration' }, 500);
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // Fetch robot
        const { data: robot, error: robotErr } = await supabase
            .from('robots')
            .select('id, name, user_id')
            .eq('id', robotId)
            .single();

        if (robotErr || !robot) {
            console.error(`[send-low-battery] Robot not found: ${robotId}`);
            return json({ error: 'Robot not found', code: 'ROBOT_NOT_FOUND' }, 404);
        }

        // Resolve live battery level if caller didn't provide it
        let battery = batteryLevel;
        if (battery === undefined || battery === null) {
            const { data: status } = await supabase
                .from('robot_status')
                .select('battery_level')
                .eq('robot_id', robotId)
                .single();
            battery = status?.battery_level ?? 0;
        }

        // Fetch owner profile
        const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(robot.user_id);
        if (userErr || !user?.email) {
            console.error(`[send-low-battery] Owner not found for robot ${robotId}`);
            return json({ error: 'Owner not found', code: 'USER_NOT_FOUND' }, 404);
        }

        // Check email preferences — use error_alerts pref for battery warnings
        const { data: prefs } = await supabase
            .from('email_preferences')
            .select('error_alerts, unsubscribed_all')
            .eq('user_id', robot.user_id)
            .maybeSingle();

        if (prefs?.unsubscribed_all) {
            console.log(`[send-low-battery] Skipping — user unsubscribed (robot ${robotId})`);
            await logEmail({
                userId:    robot.user_id,
                emailType: 'low_battery',
                recipient: user.email,
                status:    'skipped',
                metadata:  { reason: 'unsubscribed_all', robotId },
            });
            return json({ success: true, skipped: true });
        }

        if (prefs?.error_alerts === false) {
            console.log(`[send-low-battery] Skipping — error_alerts disabled (robot ${robotId})`);
            await logEmail({
                userId:    robot.user_id,
                emailType: 'low_battery',
                recipient: user.email,
                status:    'skipped',
                metadata:  { reason: 'preference_disabled', robotId },
            });
            return json({ success: true, skipped: true });
        }

        // 6-hour per-robot rate limit — check email_logs for this robot
        const cutoff = new Date(Date.now() - RATE_LIMIT_HOURS * 3_600_000).toISOString();
        const { count, error: countErr } = await supabase
            .from('email_logs')
            .select('id', { count: 'exact', head: true })
            .eq('email_type', 'low_battery')
            .eq('status', 'sent')
            .gte('created_at', cutoff)
            .filter('metadata->>robotId', 'eq', robotId);

        if (!countErr && (count ?? 0) > 0) {
            console.log(`[send-low-battery] Rate limited: robot ${robotId} already alerted within ${RATE_LIMIT_HOURS}h`);
            return json({ success: true, skipped: true, reason: 'rate_limited' });
        }

        const robotName = escapeHtml(robot.name ?? 'Your Robot');
        const firstName = escapeHtml(
            (user.user_metadata?.full_name ?? user.email.split('@')[0]).split(' ')[0]
        );
        const batteryPct = Math.round(battery as number);
        const deepLink   = `smartcleanerpro://robot-details?id=${robot.id}`;

        console.log(`[send-low-battery] Sending to ${user.email}: robot="${robotName}", battery=${batteryPct}%`);

        const result = await sendEmail({
            to:      user.email,
            subject: `${robotName} battery is low — ${batteryPct}% remaining`,
            html:    buildHtml(firstName, robotName, batteryPct, deepLink),
        });

        await logEmail({
            userId:       robot.user_id,
            emailType:    'low_battery',
            recipient:    user.email,
            status:       result.success ? 'sent' : 'failed',
            resendId:     result.id,
            errorMessage: result.error,
            metadata:     { robotId, batteryLevel: batteryPct },
        });

        if (!result.success) {
            console.error(`[send-low-battery] Send failed for robot ${robotId}:`, result.error);
            return json({ error: result.error, code: 'EMAIL_FAILED' }, 500);
        }

        console.log(`[send-low-battery] Sent successfully for robot ${robotId}`);
        return json({ success: true });

    } catch (err: any) {
        console.error('[send-low-battery] Unexpected error:', err.message);
        return json({ error: err.message ?? 'Unexpected error' }, 500);
    }
});

function buildHtml(firstName: string, robotName: string, batteryPct: number, deepLink: string): string {
    const barWidth  = Math.max(4, batteryPct);
    const barColor  = batteryPct <= 10 ? '#EF4444' : '#F59E0B';

    return baseTemplate(`
  <div class="hdr amber">
    <h1>Smart Cleaner Pro</h1>
    <p>Battery level is low</p>
  </div>
  <div class="body">
    <div style="text-align:center">
      <div class="icon-wrap" style="background:rgba(245,158,11,.12)">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/>
        </svg>
      </div>
    </div>
    <h2 style="text-align:center">Low Battery Warning</h2>
    <p style="text-align:center;margin-top:8px">Hi ${firstName},</p>
    <div class="warn-box" style="margin-top:20px">
      <strong>${robotName}</strong> is running low on battery and needs charging soon.
    </div>

    <!-- Battery level indicator -->
    <div style="margin:24px 0">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:13px;color:#6b7280;font-weight:600">Battery Level</span>
        <span style="font-size:15px;font-weight:800;color:${barColor}">${batteryPct}%</span>
      </div>
      <div style="background:#f3f4f6;border-radius:8px;height:12px;overflow:hidden">
        <div style="background:${barColor};height:100%;width:${barWidth}%;border-radius:8px;transition:width .3s"></div>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin-top:6px">
        ${batteryPct <= 10 ? 'Critical — robot may stop soon without charging.' : 'Charge your robot to keep cleaning uninterrupted.'}
      </p>
    </div>

    <div style="text-align:center">
      <a href="${deepLink}" class="btn" style="background:#F59E0B">View Robot</a>
    </div>
    <p class="note" style="margin-top:24px">
      You will not receive another low-battery alert for this robot for ${RATE_LIMIT_HOURS} hours.
      Adjust battery alerts in Settings → Notifications.
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
