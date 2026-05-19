// src/services/NotificationService.ts
// Client-side service: subscribes to Supabase Realtime robot_status changes
// and triggers Edge Function email notifications based on user preferences.

import { supabase } from './supabase';

type AlertType = 'offline' | 'low_battery' | 'critical';
type SessionNotifType = 'completed' | 'failed' | 'reminder';

interface RobotStatusRow {
    robot_id: string;
    status: string;
    battery_level?: number;
    is_online: boolean;
}

// In-memory dedup: avoid re-sending alert for the same robot within 10 min
const recentAlerts = new Map<string, number>();
const ALERT_DEDUP_MS = 10 * 60 * 1000;

function shouldSend(robotId: string, type: AlertType): boolean {
    const key = `${robotId}:${type}`;
    const last = recentAlerts.get(key) ?? 0;
    if (Date.now() - last < ALERT_DEDUP_MS) return false;
    recentAlerts.set(key, Date.now());
    return true;
}

async function callEdgeFunction(name: string, body: Record<string, unknown>): Promise<void> {
    try {
        const { error } = await supabase.functions.invoke(name, { body });
        if (error) console.warn(`[NotificationService] ${name} error:`, error.message);
    } catch (err: any) {
        console.warn(`[NotificationService] ${name} threw:`, err.message);
    }
}

class NotificationServiceClass {
    private subscription: ReturnType<typeof supabase.channel> | null = null;

    start(): void {
        if (this.subscription) return;

        this.subscription = supabase
            .channel('robot-status-notifications')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'robot_status' },
                (payload) => this.handleStatusChange(payload.new as RobotStatusRow, payload.old as RobotStatusRow)
            )
            .subscribe();
    }

    stop(): void {
        if (this.subscription) {
            supabase.removeChannel(this.subscription);
            this.subscription = null;
        }
    }

    private handleStatusChange(next: RobotStatusRow, prev: RobotStatusRow): void {
        if (!next?.robot_id) return;

        const wentOffline = prev?.is_online && !next.is_online;
        const lowBattery  = (next.battery_level ?? 100) <= 20 && (prev?.battery_level ?? 100) > 20;
        const isCritical  = next.status?.toLowerCase() === 'error';

        if (wentOffline && shouldSend(next.robot_id, 'offline')) {
            callEdgeFunction('send-robot-alert', { robotId: next.robot_id, alertType: 'offline' });
        } else if (isCritical && shouldSend(next.robot_id, 'critical')) {
            callEdgeFunction('send-robot-alert', { robotId: next.robot_id, alertType: 'critical' });
        } else if (lowBattery && shouldSend(next.robot_id, 'low_battery')) {
            callEdgeFunction('send-robot-alert', {
                robotId:   next.robot_id,
                alertType: 'low_battery',
                details:   `Battery at ${next.battery_level}%`,
            });
        }
    }

    // Called when a cleaning session is marked completed or failed in the DB
    async notifySessionComplete(sessionId: string): Promise<void> {
        await callEdgeFunction('send-session-notification', { sessionId, notifType: 'completed' });
    }

    async notifySessionFailed(sessionId: string): Promise<void> {
        await callEdgeFunction('send-session-notification', { sessionId, notifType: 'failed' });
    }

    async sendScheduleReminder(robotId: string, scheduledTime: string): Promise<void> {
        await callEdgeFunction('send-session-notification', {
            robotId,
            notifType:     'reminder',
            scheduledTime,
        });
    }

    async sendInviteEmail(robotId: string, inviteeEmail: string, role: 'viewer' | 'operator' | 'admin' = 'viewer'): Promise<{ success: boolean; token?: string; error?: string }> {
        try {
            const { data, error } = await supabase.functions.invoke('send-invite-email', {
                body: { robotId, inviteeEmail, role },
            });
            if (error) return { success: false, error: error.message };
            return { success: true, token: data?.token };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    async sendMaintenanceReminder(robotId: string, triggerReason?: '30_days' | '100_sessions' | 'manual'): Promise<void> {
        await callEdgeFunction('send-maintenance-reminder', { robotId, triggerReason: triggerReason ?? 'manual' });
    }
}

export const NotificationService = new NotificationServiceClass();
