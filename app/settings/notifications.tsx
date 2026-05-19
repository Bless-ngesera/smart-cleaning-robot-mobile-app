// app/settings/notifications.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Switch,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    useWindowDimensions,
    Platform,
    StatusBar,
    Animated,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppNavigation } from '@/hooks/useAppNavigation';

import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import { EmailService } from '@/src/services/EmailService';
import { supabase } from '@/src/services/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

interface ToastMessage {
    id: string;
    text: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

type NotifPrefs = {
    cleaning_complete: boolean;
    schedule_reminders: boolean;
    robot_offline: boolean;
    error_alerts: boolean;
    weekly_report: boolean;
    invite_received: boolean;
    maintenance_reminder: boolean;
    unsubscribed_all: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
    cleaning_complete:    true,
    schedule_reminders:   true,
    robot_offline:        true,
    error_alerts:         true,
    weekly_report:        false,
    invite_received:      true,
    maintenance_reminder: true,
    unsubscribed_all:     false,
};

type NotifItem = {
    key: keyof Omit<NotifPrefs, 'unsubscribed_all'>;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
};

const NOTIF_ITEMS: NotifItem[] = [
    { key: 'cleaning_complete',    title: 'Cleaning Complete',    subtitle: 'Notify when a cleaning session finishes',       icon: 'checkmark-circle-outline', color: '#10B981' },
    { key: 'schedule_reminders',   title: 'Schedule Reminders',   subtitle: 'Remind before a scheduled cleaning starts',     icon: 'calendar-outline',         color: '#3B82F6' },
    { key: 'robot_offline',        title: 'Robot Offline',        subtitle: 'Notify when the robot loses connection',        icon: 'wifi-outline',             color: '#EF4444' },
    { key: 'error_alerts',         title: 'Error Alerts',         subtitle: 'Alert when the robot encounters an error',      icon: 'warning-outline',          color: '#EF4444' },
    { key: 'invite_received',      title: 'Sharing Invitations',  subtitle: 'Notify when someone shares a robot with you',   icon: 'people-outline',           color: '#8B5CF6' },
    { key: 'maintenance_reminder', title: 'Maintenance Reminders',subtitle: 'Remind when robot maintenance is due',          icon: 'construct-outline',        color: '#F59E0B' },
    { key: 'weekly_report',        title: 'Weekly Report',        subtitle: 'Get a weekly summary of cleaning activity',     icon: 'bar-chart-outline',        color: '#6366F1' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
    const { back } = useAppNavigation();
    const { colors, darkMode } = useThemeContext();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const [prefs, setPrefs]             = useState<NotifPrefs>(DEFAULT_PREFS);
    const [loaded, setLoaded]           = useState(false);
    const [saving, setSaving]           = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [toasts, setToasts]           = useState<ToastMessage[]>([]);
    const toastAnimations               = useRef<{ [key: string]: Animated.Value }>({});

    const cardBg        = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder    = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary   = darkMode ? '#ffffff' : '#1a1a2e';
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor  = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    const successColor  = '#10B981';
    const errorColor    = '#EF4444';
    const warningColor  = '#F59E0B';
    const infoColor     = '#3B82F6';

    // ── Toast ────────────────────────────────────────────────────────────────

    const showToast = useCallback((text: string, type: ToastMessage['type']) => {
        const id        = Date.now().toString();
        const fadeAnim  = new Animated.Value(0);
        const slideAnim = new Animated.Value(-100);

        toastAnimations.current[id]             = fadeAnim;
        toastAnimations.current[`slide_${id}`]  = slideAnim;

        setToasts(prev => [...prev, { id, text, type }]);

        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
        ]).start();

        setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim,  { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
            ]).start(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
                delete toastAnimations.current[id];
                delete toastAnimations.current[`slide_${id}`];
            });
        }, 5000);
    }, []);

    // ── Load from Supabase ───────────────────────────────────────────────────

    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { setLoaded(true); return; }

                const { data, error } = await supabase
                    .from('email_preferences')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    setPrefs({
                        cleaning_complete:    data.cleaning_complete    ?? DEFAULT_PREFS.cleaning_complete,
                        schedule_reminders:   data.schedule_reminders   ?? DEFAULT_PREFS.schedule_reminders,
                        robot_offline:        data.robot_offline        ?? DEFAULT_PREFS.robot_offline,
                        error_alerts:         data.error_alerts         ?? DEFAULT_PREFS.error_alerts,
                        weekly_report:        data.weekly_report        ?? DEFAULT_PREFS.weekly_report,
                        invite_received:      data.invite_received      ?? DEFAULT_PREFS.invite_received,
                        maintenance_reminder: data.maintenance_reminder ?? DEFAULT_PREFS.maintenance_reminder,
                        unsubscribed_all:     data.unsubscribed_all     ?? DEFAULT_PREFS.unsubscribed_all,
                    });
                } else {
                    // Row not created yet — upsert defaults
                    await supabase.from('email_preferences').upsert({ user_id: user.id, ...DEFAULT_PREFS });
                }
            } catch (err: any) {
                console.error('[Notifications] load error:', err.message);
                showToast('Failed to load preferences', 'warning');
            } finally {
                setLoaded(true);
            }
        };
        loadPreferences();
    }, []);

    // ── Save to Supabase ─────────────────────────────────────────────────────

    const savePreferences = useCallback(async (newPrefs: NotifPrefs): Promise<boolean> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { error } = await supabase
                .from('email_preferences')
                .upsert({ user_id: user.id, ...newPrefs, updated_at: new Date().toISOString() });

            if (error) throw error;
            return true;
        } catch (err: any) {
            console.error('[Notifications] save error:', err.message);
            return false;
        }
    }, []);

    // ── Toggle ───────────────────────────────────────────────────────────────

    const toggle = useCallback(async (key: keyof NotifPrefs) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);

        setSaving(true);
        const saved = await savePreferences(updated);
        setSaving(false);

        if (saved) {
            const label = key === 'unsubscribed_all'
                ? (updated[key] ? 'All notifications disabled' : 'Notifications re-enabled')
                : `${NOTIF_ITEMS.find(i => i.key === key)?.title ?? key} ${updated[key] ? 'enabled' : 'disabled'}`;
            showToast(label, updated[key] ? 'success' : 'info');
        } else {
            setPrefs(prefs);
            showToast('Failed to save preferences', 'error');
        }
    }, [prefs, savePreferences, showToast]);

    // ── Bulk actions ─────────────────────────────────────────────────────────

    const enableAll = useCallback(async () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const all: NotifPrefs = { cleaning_complete: true, schedule_reminders: true, robot_offline: true, error_alerts: true, weekly_report: true, invite_received: true, maintenance_reminder: true, unsubscribed_all: false };
        setSaving(true);
        const saved = await savePreferences(all);
        if (saved) { setPrefs(all); showToast('All notifications enabled', 'success'); }
        else showToast('Failed to enable all notifications', 'error');
        setSaving(false);
    }, [savePreferences, showToast]);

    const disableAll = useCallback(async () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert('Disable All', 'Disable all notifications?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Disable All', style: 'destructive', onPress: async () => {
                const none: NotifPrefs = { cleaning_complete: false, schedule_reminders: false, robot_offline: false, error_alerts: false, weekly_report: false, invite_received: false, maintenance_reminder: false, unsubscribed_all: true };
                setSaving(true);
                const saved = await savePreferences(none);
                if (saved) { setPrefs(none); showToast('All notifications disabled', 'info'); }
                else showToast('Failed to disable all notifications', 'error');
                setSaving(false);
            }},
        ]);
    }, [savePreferences, showToast]);

    const resetToDefaults = useCallback(() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Reset Preferences', 'Reset all notification preferences to default values?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: async () => {
                setSaving(true);
                const saved = await savePreferences(DEFAULT_PREFS);
                if (saved) { setPrefs(DEFAULT_PREFS); showToast('All preferences reset to defaults', 'success'); }
                else showToast('Failed to reset preferences', 'error');
                setSaving(false);
            }},
        ]);
    }, [savePreferences, showToast]);

    // ── Test email ───────────────────────────────────────────────────────────

    const sendTestEmail = useCallback(async () => {
        if (testingEmail) return;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTestingEmail(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) { showToast('No email found – please log in', 'error'); return; }
            const name   = user.user_metadata?.full_name ?? user.email.split('@')[0];
            const result = await EmailService.sendWelcomeEmail(user.email, name);
            if (result.success) showToast(`Test email sent to ${user.email}`, 'success');
            else showToast(result.error ?? 'Failed to send test email', 'error');
        } catch (err: any) {
            showToast(err.message ?? 'Unexpected error', 'error');
        } finally {
            setTestingEmail(false);
        }
    }, [testingEmail, showToast]);

    // ── Derived ──────────────────────────────────────────────────────────────

    const enabledCount = NOTIF_ITEMS.filter(i => prefs[i.key]).length;
    const totalCount   = NOTIF_ITEMS.length;

    // ── Render toasts ────────────────────────────────────────────────────────

    const renderToasts = () => {
        const sbH = StatusBar.currentHeight || (Platform.OS === 'ios' ? 47 : 0);
        return toasts.map((toast, index) => {
            const color     = toast.type === 'success' ? successColor : toast.type === 'error' ? errorColor : toast.type === 'warning' ? warningColor : infoColor;
            const fadeAnim  = toastAnimations.current[toast.id]            || new Animated.Value(1);
            const slideAnim = toastAnimations.current[`slide_${toast.id}`] || new Animated.Value(0);

            return (
                <Animated.View
                    key={toast.id}
                    style={[
                        styles.toast,
                        {
                            backgroundColor: color,
                            top:   sbH + 10 + (index * 70),
                            left:  16,
                            right: 16,
                            opacity:   fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <Ionicons
                        name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'alert-circle' : toast.type === 'warning' ? 'warning' : 'information-circle'}
                        size={22}
                        color="#fff"
                    />
                    <AppText style={styles.toastText}>{toast.text}</AppText>
                    <TouchableOpacity
                        onPress={() => {
                            const fa = toastAnimations.current[toast.id];
                            const sa = toastAnimations.current[`slide_${toast.id}`];
                            if (fa) {
                                Animated.parallel([
                                    Animated.timing(fa, { toValue: 0, duration: 200, useNativeDriver: true }),
                                    ...(sa ? [Animated.timing(sa, { toValue: -100, duration: 200, useNativeDriver: true })] : []),
                                ]).start(() => {
                                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                                    delete toastAnimations.current[toast.id];
                                    delete toastAnimations.current[`slide_${toast.id}`];
                                });
                            }
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={18} color="rgba(255,255,255,0.9)" />
                    </TouchableOpacity>
                </Animated.View>
            );
        });
    };

    // ── Loading state ────────────────────────────────────────────────────────

    if (!loaded) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
                <View style={styles.loadingContainer}>
                    <AppText style={{ color: textSecondary }}>Loading preferences…</AppText>
                </View>
            </SafeAreaView>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

            {renderToasts()}

            <ScrollView
                contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                    {/* Back */}
                    <TouchableOpacity style={styles.backButton} onPress={() => back()} activeOpacity={0.7}>
                        <Ionicons name="chevron-back" size={28} color={colors.primary} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>Notifications</AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>Manage email alerts and reminders</AppText>
                    </View>

                    {/* Summary Card */}
                    <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.summaryContent}>
                            <View style={styles.summaryStats}>
                                <AppText style={[styles.summaryCount, { color: colors.primary }]}>{enabledCount}/{totalCount}</AppText>
                                <AppText style={[styles.summaryLabel, { color: textSecondary }]}>Notifications Enabled</AppText>
                            </View>
                            <View style={styles.summaryActions}>
                                <TouchableOpacity style={[styles.summaryBtn, { backgroundColor: `${successColor}15`, borderColor: successColor }]} onPress={enableAll} disabled={saving} activeOpacity={0.7}>
                                    <Ionicons name="checkmark-done" size={18} color={successColor} />
                                    <AppText style={[styles.summaryBtnText, { color: successColor }]}>Enable All</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.summaryBtn, { backgroundColor: `${errorColor}15`, borderColor: errorColor }]} onPress={disableAll} disabled={saving} activeOpacity={0.7}>
                                    <Ionicons name="close" size={18} color={errorColor} />
                                    <AppText style={[styles.summaryBtnText, { color: errorColor }]}>Disable All</AppText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Unsubscribe All toggle */}
                    <View style={[styles.card, { backgroundColor: prefs.unsubscribed_all ? `${errorColor}10` : cardBg, borderColor: prefs.unsubscribed_all ? errorColor : cardBorder }]}>
                        <View style={styles.row}>
                            <View style={[styles.iconContainer, { backgroundColor: `${errorColor}15` }]}>
                                <Ionicons name="notifications-off-outline" size={22} color={errorColor} />
                            </View>
                            <View style={styles.rowContent}>
                                <AppText style={[styles.rowTitle, { color: textPrimary }]}>Unsubscribe All</AppText>
                                <AppText style={[styles.rowSubtitle, { color: textSecondary }]}>Stop all Smart Cleaner Pro emails</AppText>
                            </View>
                            <Switch
                                value={prefs.unsubscribed_all}
                                onValueChange={() => toggle('unsubscribed_all')}
                                disabled={saving}
                                trackColor={{ false: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)', true: errorColor }}
                                thumbColor={Platform.OS === 'android' ? (prefs.unsubscribed_all ? errorColor : '#fff') : undefined}
                                ios_backgroundColor={darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}
                            />
                        </View>
                    </View>

                    {/* Notification Toggles */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder, opacity: prefs.unsubscribed_all ? 0.45 : 1 }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
                            <AppText style={[styles.cardTitle, { color: textPrimary }]}>Notification Types</AppText>
                        </View>

                        {NOTIF_ITEMS.map((item, index) => (
                            <View key={item.key}>
                                <View style={styles.row}>
                                    <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                                        <Ionicons name={item.icon} size={22} color={item.color} />
                                    </View>
                                    <View style={styles.rowContent}>
                                        <AppText style={[styles.rowTitle, { color: textPrimary }]}>{item.title}</AppText>
                                        <AppText style={[styles.rowSubtitle, { color: textSecondary }]}>{item.subtitle}</AppText>
                                    </View>
                                    <Switch
                                        value={prefs[item.key]}
                                        onValueChange={() => toggle(item.key)}
                                        disabled={saving || prefs.unsubscribed_all}
                                        trackColor={{ false: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)', true: colors.primary }}
                                        thumbColor={Platform.OS === 'android' ? (prefs[item.key] ? colors.primary : '#fff') : undefined}
                                        ios_backgroundColor={darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}
                                    />
                                </View>
                                {index < NOTIF_ITEMS.length - 1 && (
                                    <View style={[styles.divider, { backgroundColor: dividerColor }]} />
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Test Email */}
                    <TouchableOpacity
                        style={[styles.testBtn, { borderColor: infoColor, opacity: testingEmail ? 0.6 : 1 }]}
                        onPress={sendTestEmail}
                        disabled={testingEmail || saving}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="mail-outline" size={20} color={infoColor} />
                        <AppText style={[styles.actionBtnText, { color: infoColor }]}>
                            {testingEmail ? 'Sending…' : 'Send Test Email'}
                        </AppText>
                    </TouchableOpacity>

                    {/* Reset */}
                    <TouchableOpacity
                        style={[styles.resetBtn, { borderColor: errorColor }]}
                        onPress={resetToDefaults}
                        disabled={saving}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="refresh-outline" size={20} color={errorColor} />
                        <AppText style={[styles.actionBtnText, { color: errorColor }]}>Reset to Defaults</AppText>
                    </TouchableOpacity>

                    {/* Info */}
                    <View style={[styles.infoCard, { backgroundColor: `${infoColor}12`, borderColor: `${infoColor}30` }]}>
                        <Ionicons name="information-circle-outline" size={20} color={infoColor} />
                        <AppText style={[styles.infoText, { color: textSecondary }]}>
                            Email notifications are sent to your account email address. Preferences are saved to your account and sync across devices.
                        </AppText>
                    </View>
                </View>

                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container:            { flex: 1 },
    loadingContainer:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent:        { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
    scrollContentLarge:   { alignItems: 'center' },
    wrapper:              { width: '100%' },
    largeWrapper:         { maxWidth: 480 },
    backButton:           { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'flex-start', marginBottom: 16 },
    headerSection:        { marginBottom: 24 },
    headerTitle:          { fontSize: 35, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
    headerSubtitle:       { fontSize: 15, fontWeight: '400', letterSpacing: 0.1 },
    summaryCard:          { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 16 },
    summaryContent:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    summaryStats:         { alignItems: 'flex-start' },
    summaryCount:         { fontSize: 28, fontWeight: '800', marginBottom: 2 },
    summaryLabel:         { fontSize: 12, fontWeight: '500' },
    summaryActions:       { flexDirection: 'row', gap: 10 },
    summaryBtn:           { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    summaryBtnText:       { fontSize: 13, fontWeight: '600' },
    card:                 { borderRadius: 24, padding: 8, borderWidth: 1, marginBottom: 16 },
    cardHeader:           { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
    cardTitle:            { fontSize: 16, fontWeight: '700' },
    row:                  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    iconContainer:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowContent:           { flex: 1 },
    rowTitle:             { fontSize: 15, fontWeight: '600', marginBottom: 2 },
    rowSubtitle:          { fontSize: 12, fontWeight: '400', lineHeight: 17 },
    divider:              { height: 1, marginHorizontal: 16 },
    testBtn:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 12 },
    resetBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 20 },
    actionBtnText:        { fontSize: 15, fontWeight: '600' },
    infoCard:             { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
    infoText:             { flex: 1, fontSize: 13, lineHeight: 19 },
    footer:               { textAlign: 'center', marginTop: 32, fontSize: 12.5, opacity: 0.65, letterSpacing: 0.3 },
    toast:                { position: 'absolute', flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, gap: 12, zIndex: 9999, elevation: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
    toastText:            { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500', lineHeight: 20 },
});
