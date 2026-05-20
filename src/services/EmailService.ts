// src/services/EmailService.ts
const API_KEY   = process.env.EXPO_PUBLIC_RESEND_API_KEY ?? '';
const FROM      = `${process.env.EXPO_PUBLIC_RESEND_FROM_NAME ?? 'Smart Cleaner Pro'} <${process.env.EXPO_PUBLIC_RESEND_FROM_EMAIL ?? 'hello@smartcleanerpro.online'}>`;
const API_URL   = 'https://api.resend.com/emails';
const MAX_RETRY = 3;

// ── types ────────────────────────────────────────────────────────────────────

export interface EmailData {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export interface ReportData {
    robotName: string;
    totalArea: number;
    totalSessions: number;
    cleaningDuration: string;
    startDate: string;
    endDate: string;
}

export interface IncidentAlertPayload {
    robotId: string;
    robotName: string;
    userEmail: string;
    userName: string;
    severity: 'critical' | 'warning' | 'info';
    incidentType: string;
    description: string;
    occurredAt: string;
}

export interface SessionCompletionPayload {
    sessionId: string;
    robotId: string;
    robotName: string;
    userEmail: string;
    userName: string;
    areaCleaned: number;
    duration: string;
    completedAt: string;
}

export interface LowBatteryPayload {
    robotId: string;
    robotName: string;
    userEmail: string;
    userName: string;
    batteryLevel: number;
}

// ── simple in-memory rate limiter (max 5 sends / 60 s) ───────────────────────

const sendTimestamps: number[] = [];
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT     = 5;

function checkRateLimit(): boolean {
    const now = Date.now();
    const windowStart = now - RATE_WINDOW_MS;
    while (sendTimestamps.length && sendTimestamps[0] < windowStart) sendTimestamps.shift();
    if (sendTimestamps.length >= RATE_LIMIT) return false;
    sendTimestamps.push(now);
    return true;
}

// ── shared HTML wrapper ───────────────────────────────────────────────────────

function wrap(content: string): string {
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
  .stats{display:flex;gap:12px;margin:24px 0}
  .stat{flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px;text-align:center}
  .stat-num{font-size:26px;font-weight:800;color:#10B981}
  .stat-lbl{font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
  .alert-box{background:#FEF2F2;border-left:4px solid #EF4444;border-radius:8px;padding:18px;margin:20px 0}
  .success-box{background:#ECFDF5;border-left:4px solid #10B981;border-radius:8px;padding:18px;margin:20px 0}
  .btn{display:inline-block;background:#10B981;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin-top:20px}
  .tips{background:#f9fafb;border-radius:10px;padding:16px;margin-top:24px;font-size:13px;color:#6b7280;line-height:1.7}
  .ftr{background:#f3f4f6;padding:20px 28px;text-align:center;font-size:12px;color:#9ca3af}
  .ftr a{color:#10B981;text-decoration:none}
  ul{padding-left:18px;margin-top:8px}
  li{margin-bottom:6px;font-size:14px;color:#374151}
</style>
</head>
<body>
<div class="shell">${content}</div>
</body>
</html>`;
}

// ── EmailService class ────────────────────────────────────────────────────────

class EmailServiceClass {

    // Core send with retry + exponential back-off
    async sendEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
        if (!API_KEY) {
            console.warn('[EmailService] EXPO_PUBLIC_RESEND_API_KEY not set');
            return { success: false, error: 'API key not configured' };
        }
        if (!checkRateLimit()) {
            console.warn('[EmailService] rate limit reached');
            return { success: false, error: 'Rate limit reached – try again in a minute' };
        }

        for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: FROM,
                        to: [data.to],
                        subject: data.subject,
                        html: data.html,
                        text: data.text ?? data.html.replace(/<[^>]*>/g, ''),
                    }),
                });

                const json = await res.json();

                if (res.ok) {
                    console.log(`[EmailService] sent (${json.id})`);
                    return { success: true };
                }

                // 4xx → don't retry
                if (res.status >= 400 && res.status < 500) {
                    console.error('[EmailService] client error:', json);
                    return { success: false, error: json.message ?? 'Email rejected' };
                }

                // 5xx → retry after back-off
                console.warn(`[EmailService] attempt ${attempt} failed (${res.status}), retrying...`);
            } catch (err: any) {
                console.warn(`[EmailService] attempt ${attempt} threw:`, err.message);
            }

            if (attempt < MAX_RETRY) {
                await new Promise(r => setTimeout(r, 500 * 2 ** (attempt - 1)));
            }
        }

        return { success: false, error: 'Failed after 3 attempts' };
    }

    // ── Welcome email ─────────────────────────────────────────────────────────

    sendWelcomeEmail(userEmail: string, userName: string) {
        const firstName = userName.split(' ')[0];
        return this.sendEmail({
            to: userEmail,
            subject: 'Welcome to Smart Cleaner Pro!',
            html: wrap(`
              <div class="hdr">
                <h1>Smart Cleaner Pro</h1>
                <p>Your smart robot vacuum, connected.</p>
              </div>
              <div class="body">
                <h2>Welcome, ${firstName}! 👋</h2>
                <p style="font-size:15px;line-height:1.6;color:#374151">
                  Your account is ready. Here's how to get started:
                </p>
                <ul style="margin-top:16px">
                  <li>Open the app and go to <strong>Settings → Connection</strong></li>
                  <li>Enter your robot's serial number to register it</li>
                  <li>Head to <strong>Control</strong> to start your first cleaning session</li>
                </ul>
                <div class="tips">
                  💡 <strong>Tip:</strong> Enable weekly email reports in
                  Settings → Notifications to get a cleaning summary every week.
                </div>
              </div>
              <div class="ftr">
                <p>Smart Cleaner Pro &bull; <a href="mailto:hello@smartcleanerpro.online">hello@smartcleanerpro.online</a></p>
                <p style="margin-top:6px">&copy; 2026 Smart Cleaner Pro. All rights reserved.</p>
              </div>`),
        });
    }

    // ── Cleaning complete ─────────────────────────────────────────────────────

    sendCleaningComplete(userEmail: string, robotName: string, areaCleaned: number, duration: string) {
        return this.sendEmail({
            to: userEmail,
            subject: `Cleaning complete – ${robotName}`,
            html: wrap(`
              <div class="hdr">
                <h1>Smart Cleaner Pro</h1>
                <p>Cleaning session finished</p>
              </div>
              <div class="body">
                <h2>Cleaning Complete ✅</h2>
                <div class="success-box">
                  <strong>${robotName}</strong> just finished a cleaning session.
                </div>
                <div class="stats">
                  <div class="stat">
                    <div class="stat-num">${areaCleaned}m²</div>
                    <div class="stat-lbl">Area Cleaned</div>
                  </div>
                  <div class="stat">
                    <div class="stat-num">${duration}</div>
                    <div class="stat-lbl">Duration</div>
                  </div>
                </div>
                <p style="font-size:14px;color:#6b7280">Your floors are sparkling clean ✨</p>
              </div>
              <div class="ftr">
                <p>Smart Cleaner Pro &bull; <a href="mailto:hello@smartcleanerpro.online">hello@smartcleanerpro.online</a></p>
                <p style="margin-top:6px">&copy; 2026 Smart Cleaner Pro. All rights reserved.</p>
              </div>`),
        });
    }

    // ── Error alert ───────────────────────────────────────────────────────────

    sendErrorAlert(userEmail: string, robotName: string, errorMessage: string) {
        return this.sendEmail({
            to: userEmail,
            subject: `Robot alert – ${robotName}`,
            html: wrap(`
              <div class="hdr" style="background:linear-gradient(135deg,#EF4444,#DC2626)">
                <h1>Smart Cleaner Pro</h1>
                <p>Robot requires attention</p>
              </div>
              <div class="body">
                <h2>⚠️ Robot Alert</h2>
                <div class="alert-box">
                  <strong>${robotName}</strong> encountered an issue:<br/>
                  <span style="color:#991b1b;margin-top:6px;display:block">${errorMessage}</span>
                </div>
                <p style="font-size:14px;color:#374151">
                  Please check your robot and open the app for more details.
                </p>
              </div>
              <div class="ftr">
                <p>Smart Cleaner Pro &bull; <a href="mailto:hello@smartcleanerpro.online">hello@smartcleanerpro.online</a></p>
                <p style="margin-top:6px">&copy; 2026 Smart Cleaner Pro. All rights reserved.</p>
              </div>`),
        });
    }

    // ── Weekly report ─────────────────────────────────────────────────────────

    sendWeeklyReport(userEmail: string, report: ReportData) {
        return this.sendEmail({
            to: userEmail,
            subject: `Your weekly cleaning report – ${report.startDate} to ${report.endDate}`,
            html: wrap(`
              <div class="hdr">
                <h1>Smart Cleaner Pro</h1>
                <p>Weekly Cleaning Report</p>
              </div>
              <div class="body">
                <h2>Hello ${userEmail.split('@')[0]}! 👋</h2>
                <p style="font-size:14px;color:#6b7280">
                  Here's <strong>${report.robotName}</strong>'s performance for
                  ${report.startDate} – ${report.endDate}:
                </p>
                <div class="stats">
                  <div class="stat">
                    <div class="stat-num">${report.totalSessions}</div>
                    <div class="stat-lbl">Sessions</div>
                  </div>
                  <div class="stat">
                    <div class="stat-num">${report.totalArea}m²</div>
                    <div class="stat-lbl">Area Cleaned</div>
                  </div>
                  <div class="stat">
                    <div class="stat-num">${report.cleaningDuration}</div>
                    <div class="stat-lbl">Total Time</div>
                  </div>
                </div>
                <div class="tips">
                  📊 <strong>Pro Tips:</strong><br/>
                  • Regular cleaning keeps your floors spotless<br/>
                  • Check the app for real-time robot status
                </div>
              </div>
              <div class="ftr">
                <p>Smart Cleaner Pro &bull; <a href="mailto:hello@smartcleanerpro.online">hello@smartcleanerpro.online</a></p>
                <p style="margin-top:6px">&copy; 2026 Smart Cleaner Pro. All rights reserved.</p>
              </div>`),
        });
    }

    // ── Robot incident alert ───────────────────────────────────────────────────

    sendIncidentAlert(payload: IncidentAlertPayload) {
        const ts = new Date().toISOString();
        console.log(`[EmailService] Sending incident alert at ${ts}: type=${payload.incidentType}, severity=${payload.severity}, robot=${payload.robotName}, recipient=${payload.userEmail}`);
        const deepLink  = `smartcleanerpro://robot-details?id=${payload.robotId}`;
        const firstName = payload.userName.split(' ')[0];
        const isCritical = payload.severity === 'critical';
        const hdrGradient = isCritical
            ? 'linear-gradient(135deg,#EF4444,#DC2626)'
            : 'linear-gradient(135deg,#F59E0B,#D97706)';
        const boxBg    = isCritical ? '#FEF2F2' : '#FFFBEB';
        const boxBdr   = isCritical ? '#EF4444' : '#F59E0B';
        const btnBg    = isCritical ? '#EF4444' : '#F59E0B';

        return this.sendEmail({
            to: payload.userEmail,
            subject: `${isCritical ? '🚨 Critical Alert' : '⚠️ Warning'} – ${payload.robotName}`,
            html: wrap(`
              <div class="hdr" style="background:${hdrGradient}">
                <h1>Smart Cleaner Pro</h1>
                <p>${isCritical ? 'Immediate attention required' : 'Robot warning'}</p>
              </div>
              <div class="body">
                <h2>${isCritical ? '🚨 Critical Alert' : '⚠️ Warning'}</h2>
                <p>Hi ${firstName},</p>
                <div class="alert-box" style="border-left-color:${boxBdr};background:${boxBg};margin-top:16px">
                  <strong>${payload.robotName}</strong> has a <strong>${payload.severity}</strong>
                  <em>${payload.incidentType}</em> incident.<br/>
                  <span style="margin-top:8px;display:block;color:#991b1b">${payload.description}</span>
                  <span style="margin-top:4px;display:block;font-size:12px;color:#9ca3af">
                    ${new Date(payload.occurredAt).toLocaleString()}
                  </span>
                </div>
                <div style="text-align:center;margin-top:24px">
                  <a href="${deepLink}" class="btn" style="background:${btnBg}">View Robot Status</a>
                </div>
                <p class="note" style="margin-top:20px">
                  If the button doesn't open the app, ensure Smart Cleaner Pro is installed on your device.
                </p>
              </div>
              <div class="ftr">
                <p>Smart Cleaner Pro &bull; <a href="mailto:hello@smartcleanerpro.online">hello@smartcleanerpro.online</a></p>
                <p style="margin-top:6px">&copy; 2026 Smart Cleaner Pro. All rights reserved.</p>
              </div>`),
        });
    }

    // ── Cleaning completion notification ──────────────────────────────────────

    sendCleaningCompletionNotification(payload: SessionCompletionPayload) {
        const ts = new Date().toISOString();
        console.log(`[EmailService] Sending session completion at ${ts}: session=${payload.sessionId}, robot=${payload.robotName}, recipient=${payload.userEmail}`);
        const deepLink  = `smartcleanerpro://session-details?id=${payload.sessionId}`;
        const firstName = payload.userName.split(' ')[0];
        const completedStr = new Date(payload.completedAt).toLocaleString();

        return this.sendEmail({
            to: payload.userEmail,
            subject: `Cleaning complete – ${payload.robotName}`,
            html: wrap(`
              <div class="hdr">
                <h1>Smart Cleaner Pro</h1>
                <p>Cleaning session finished</p>
              </div>
              <div class="body">
                <h2>Cleaning Complete ✅</h2>
                <p>Hi ${firstName}!</p>
                <div class="success-box" style="margin-top:16px">
                  <strong>${payload.robotName}</strong> finished a cleaning session on ${completedStr}.
                </div>
                <div class="stats">
                  <div class="stat">
                    <div class="stat-num">${payload.areaCleaned}m²</div>
                    <div class="stat-lbl">Area Cleaned</div>
                  </div>
                  <div class="stat">
                    <div class="stat-num">${payload.duration}</div>
                    <div class="stat-lbl">Duration</div>
                  </div>
                </div>
                <p style="font-size:14px;color:#6b7280;text-align:center">Your floors are sparkling clean ✨</p>
                <div style="text-align:center;margin-top:20px">
                  <a href="${deepLink}" class="btn">View Session Details</a>
                </div>
              </div>
              <div class="ftr">
                <p>Smart Cleaner Pro &bull; <a href="mailto:hello@smartcleanerpro.online">hello@smartcleanerpro.online</a></p>
                <p style="margin-top:6px">&copy; 2026 Smart Cleaner Pro. All rights reserved.</p>
              </div>`),
        });
    }

    // ── Low battery warning ────────────────────────────────────────────────────

    sendLowBatteryWarning(payload: LowBatteryPayload) {
        const ts = new Date().toISOString();
        console.log(`[EmailService] Sending low battery warning at ${ts}: robot=${payload.robotName}, battery=${payload.batteryLevel}%, recipient=${payload.userEmail}`);
        const deepLink  = `smartcleanerpro://robot-details?id=${payload.robotId}`;
        const firstName = payload.userName.split(' ')[0];

        return this.sendEmail({
            to: payload.userEmail,
            subject: `🔋 Low battery – ${payload.robotName} (${payload.batteryLevel}%)`,
            html: wrap(`
              <div class="hdr" style="background:linear-gradient(135deg,#F59E0B,#D97706)">
                <h1>Smart Cleaner Pro</h1>
                <p>Battery level is low</p>
              </div>
              <div class="body">
                <h2>🔋 Low Battery Warning</h2>
                <p>Hi ${firstName},</p>
                <div class="alert-box" style="border-left-color:#F59E0B;background:#FFFBEB;margin-top:16px">
                  <strong>${payload.robotName}</strong> has a low battery level of
                  <strong style="color:#D97706">${payload.batteryLevel}%</strong>.
                  Please charge your robot soon to avoid interruptions.
                </div>
                <div style="text-align:center;margin-top:24px">
                  <a href="${deepLink}" class="btn" style="background:#F59E0B">View Robot</a>
                </div>
              </div>
              <div class="ftr">
                <p>Smart Cleaner Pro &bull; <a href="mailto:hello@smartcleanerpro.online">hello@smartcleanerpro.online</a></p>
                <p style="margin-top:6px">&copy; 2026 Smart Cleaner Pro. All rights reserved.</p>
              </div>`),
        });
    }

    // ── DB-backed: send alerts for pending critical robot incidents ────────────
    // Queries robot_incidents WHERE severity='critical' AND email_sent=false
    // for the current authenticated user's robots, then sends alert emails.

    async triggerPendingIncidentAlerts(supabaseClient: any): Promise<{ sent: number; errors: string[] }> {
        const result = { sent: 0, errors: [] as string[] };
        const ts = new Date().toISOString();

        try {
            const { data: { user }, error: userErr } = await supabaseClient.auth.getUser();
            if (userErr || !user?.email) {
                console.warn('[EmailService] triggerPendingIncidentAlerts: not authenticated');
                return result;
            }

            console.log(`[EmailService] triggerPendingIncidentAlerts at ${ts}: querying for user ${user.email}`);

            const { data: incidents, error: queryErr } = await supabaseClient
                .from('robot_incidents')
                .select('id, robot_id, severity, incident_type, description, created_at, email_sent, robots(id, name)')
                .eq('severity', 'critical')
                .eq('email_sent', false)
                .order('created_at', { ascending: false })
                .limit(20);

            if (queryErr) {
                console.error('[EmailService] triggerPendingIncidentAlerts query error:', queryErr.message);
                result.errors.push(queryErr.message);
                return result;
            }

            if (!incidents?.length) {
                console.log('[EmailService] triggerPendingIncidentAlerts: no pending critical incidents');
                return result;
            }

            console.log(`[EmailService] triggerPendingIncidentAlerts: found ${incidents.length} pending incidents`);

            for (const incident of incidents) {
                const robot = incident.robots as any;
                const payload: IncidentAlertPayload = {
                    robotId:      incident.robot_id,
                    robotName:    robot?.name ?? 'Your Robot',
                    userEmail:    user.email,
                    userName:     user.user_metadata?.full_name ?? user.email.split('@')[0],
                    severity:     incident.severity,
                    incidentType: incident.incident_type,
                    description:  incident.description,
                    occurredAt:   incident.created_at,
                };

                const res = await this.sendIncidentAlert(payload);
                if (res.success) {
                    result.sent++;
                    await supabaseClient
                        .from('robot_incidents')
                        .update({ email_sent: true })
                        .eq('id', incident.id);
                    console.log(`[EmailService] Incident alert sent: robot="${payload.robotName}", id=${incident.id}`);
                } else {
                    result.errors.push(`Incident ${incident.id}: ${res.error}`);
                    console.error(`[EmailService] Failed to send incident alert ${incident.id}:`, res.error);
                }
            }
        } catch (err: any) {
            console.error('[EmailService] triggerPendingIncidentAlerts error:', err.message);
            result.errors.push(err.message);
        }

        return result;
    }

    // ── DB-backed: send notifications for completed sessions with no email ─────
    // Queries cleaning_sessions WHERE status='completed' AND email_sent=false

    async triggerPendingSessionNotifications(supabaseClient: any): Promise<{ sent: number; errors: string[] }> {
        const result = { sent: 0, errors: [] as string[] };
        const ts = new Date().toISOString();

        try {
            const { data: { user }, error: userErr } = await supabaseClient.auth.getUser();
            if (userErr || !user?.email) {
                console.warn('[EmailService] triggerPendingSessionNotifications: not authenticated');
                return result;
            }

            console.log(`[EmailService] triggerPendingSessionNotifications at ${ts}: querying for user ${user.email}`);

            const { data: sessions, error: queryErr } = await supabaseClient
                .from('cleaning_sessions')
                .select('id, robot_id, area_cleaned, duration, ended_at, email_sent, robots(id, name)')
                .eq('status', 'completed')
                .eq('email_sent', false)
                .order('ended_at', { ascending: false })
                .limit(20);

            if (queryErr) {
                console.error('[EmailService] triggerPendingSessionNotifications query error:', queryErr.message);
                result.errors.push(queryErr.message);
                return result;
            }

            if (!sessions?.length) {
                console.log('[EmailService] triggerPendingSessionNotifications: no pending sessions');
                return result;
            }

            console.log(`[EmailService] triggerPendingSessionNotifications: found ${sessions.length} pending sessions`);

            for (const session of sessions) {
                const robot = session.robots as any;
                const payload: SessionCompletionPayload = {
                    sessionId:   session.id,
                    robotId:     session.robot_id,
                    robotName:   robot?.name ?? 'Your Robot',
                    userEmail:   user.email,
                    userName:    user.user_metadata?.full_name ?? user.email.split('@')[0],
                    areaCleaned: session.area_cleaned ?? 0,
                    duration:    session.duration ?? '—',
                    completedAt: session.ended_at ?? new Date().toISOString(),
                };

                const res = await this.sendCleaningCompletionNotification(payload);
                if (res.success) {
                    result.sent++;
                    await supabaseClient
                        .from('cleaning_sessions')
                        .update({ email_sent: true })
                        .eq('id', session.id);
                    console.log(`[EmailService] Session completion email sent: robot="${payload.robotName}", session=${session.id}`);
                } else {
                    result.errors.push(`Session ${session.id}: ${res.error}`);
                    console.error(`[EmailService] Failed to send session notification ${session.id}:`, res.error);
                }
            }
        } catch (err: any) {
            console.error('[EmailService] triggerPendingSessionNotifications error:', err.message);
            result.errors.push(err.message);
        }

        return result;
    }

    // ── DB-backed: send low battery warnings for current user's robots ─────────
    // Queries robot_status WHERE battery_level < 20 for the user's active robots

    async triggerLowBatteryWarnings(supabaseClient: any): Promise<{ sent: number; errors: string[] }> {
        const result = { sent: 0, errors: [] as string[] };
        const ts = new Date().toISOString();

        try {
            const { data: { user }, error: userErr } = await supabaseClient.auth.getUser();
            if (userErr || !user?.email) {
                console.warn('[EmailService] triggerLowBatteryWarnings: not authenticated');
                return result;
            }

            console.log(`[EmailService] triggerLowBatteryWarnings at ${ts}: querying for user ${user.email}`);

            // Get the current user's robot IDs first (RLS filters by user_id)
            const { data: robots, error: robotErr } = await supabaseClient
                .from('robots')
                .select('id, name');

            if (robotErr || !robots?.length) {
                console.log('[EmailService] triggerLowBatteryWarnings: no robots found');
                return result;
            }

            const robotIds = robots.map((r: any) => r.id);

            // Query robot_status for low battery robots owned by this user
            const { data: statuses, error: statusErr } = await supabaseClient
                .from('robot_status')
                .select('robot_id, battery_level, is_online')
                .in('robot_id', robotIds)
                .lt('battery_level', 20)
                .eq('is_online', true);

            if (statusErr) {
                console.error('[EmailService] triggerLowBatteryWarnings status query error:', statusErr.message);
                result.errors.push(statusErr.message);
                return result;
            }

            if (!statuses?.length) {
                console.log('[EmailService] triggerLowBatteryWarnings: no low-battery robots online');
                return result;
            }

            console.log(`[EmailService] triggerLowBatteryWarnings: found ${statuses.length} robots with low battery`);

            const robotNameMap: Record<string, string> = {};
            for (const r of robots) robotNameMap[r.id] = r.name;

            for (const status of statuses) {
                const payload: LowBatteryPayload = {
                    robotId:      status.robot_id,
                    robotName:    robotNameMap[status.robot_id] ?? 'Your Robot',
                    userEmail:    user.email,
                    userName:     user.user_metadata?.full_name ?? user.email.split('@')[0],
                    batteryLevel: status.battery_level ?? 0,
                };

                const res = await this.sendLowBatteryWarning(payload);
                if (res.success) {
                    result.sent++;
                    console.log(`[EmailService] Low battery warning sent: robot="${payload.robotName}", battery=${payload.batteryLevel}%`);
                } else {
                    result.errors.push(`Robot ${status.robot_id}: ${res.error}`);
                    console.error(`[EmailService] Failed to send low battery warning for ${status.robot_id}:`, res.error);
                }
            }
        } catch (err: any) {
            console.error('[EmailService] triggerLowBatteryWarnings error:', err.message);
            result.errors.push(err.message);
        }

        return result;
    }
}

export const EmailService = new EmailServiceClass();
