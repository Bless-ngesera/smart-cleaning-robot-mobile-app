// src/utils/emailScheduler.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/services/supabase';
import { EmailService, ReportData } from '@/src/services/EmailService';

const LAST_WEEKLY_KEY = 'lastWeeklyReportSent';
const WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseDurationToMinutes(duration: string): number {
    const h = duration.match(/(\d+)\s*h/);
    const m = duration.match(/(\d+)\s*m(?:in)?/);
    return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
}

function minutesToHours(mins: number): string {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── weekly stats ─────────────────────────────────────────────────────────────

async function calculateWeeklyStats(userId: string): Promise<Omit<ReportData, 'robotName'> | null> {
    try {
        const endDate = new Date();
        const startDate = new Date(Date.now() - WEEKLY_INTERVAL_MS);

        const { data: sessions } = await supabase
            .from('cleaning_sessions')
            .select('duration, area')
            .eq('user_id', userId)
            .gte('date', startDate.toISOString().split('T')[0]);

        if (!sessions || sessions.length === 0) return null;

        let totalMins = 0;
        let totalArea = 0;

        for (const s of sessions) {
            if (s.duration) totalMins += parseDurationToMinutes(s.duration);
            if (s.area) {
                const match = s.area.match(/(\d+(?:\.\d+)?)/);
                if (match) totalArea += parseFloat(match[1]);
            }
        }

        return {
            totalSessions: sessions.length,
            totalArea: Math.round(totalArea),
            cleaningDuration: minutesToHours(totalMins),
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
        };
    } catch (err) {
        console.error('[emailScheduler] calculateWeeklyStats:', err);
        return null;
    }
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Call this on app launch (e.g. from DashboardScreen's useEffect).
 * Sends a weekly report if 7+ days have passed since the last one AND
 * the user has weeklyReport notifications enabled.
 */
export async function checkAndSendWeeklyReport(weeklyReportEnabled: boolean): Promise<void> {
    if (!weeklyReportEnabled) return;

    try {
        const lastSentStr = await AsyncStorage.getItem(LAST_WEEKLY_KEY);
        const lastSent = lastSentStr ? parseInt(lastSentStr, 10) : 0;

        if (Date.now() - lastSent < WEEKLY_INTERVAL_MS) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email || !user?.id) return;

        const stats = await calculateWeeklyStats(user.id);
        if (!stats) return;

        // Fetch robot name
        const { data: robot } = await supabase
            .from('robots')
            .select('name')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const result = await EmailService.sendWeeklyReport(user.email, {
            robotName: robot?.name ?? 'Smart Cleaner Pro',
            ...stats,
        });

        if (result.success) {
            await AsyncStorage.setItem(LAST_WEEKLY_KEY, String(Date.now()));
            console.log('[emailScheduler] weekly report sent');
        }
    } catch (err) {
        console.error('[emailScheduler] checkAndSendWeeklyReport:', err);
    }
}
