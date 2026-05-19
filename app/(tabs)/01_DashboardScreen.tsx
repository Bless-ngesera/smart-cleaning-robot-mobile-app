// app/(tabs)/01_DashboardScreen.tsx
//
// ============================================================
// C++ INTEGRATION OVERVIEW
// ------------------------------------------------------------
// This file fetches real data from Supabase.
// When you're ready to integrate real hardware via native C++ bridge:
//
//   1. Add a real-time subscription or polling to RobotBridge
//   2. Update the status fields in setStatus() with live hardware values
//   3. All C++ integration points are clearly marked below
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Animated,
    RefreshControl,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppNavigation } from '@/hooks/useAppNavigation';

import Loader from '../../src/components/Loader';
import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';
import { checkAndSendWeeklyReport } from '@/src/utils/emailScheduler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionType = 'wifi' | 'ble' | 'none';
type RobotStatusCode = 'Online' | 'Offline' | 'Charging' | 'Error';

interface RobotStatus {
    isCleaning: boolean;
    lastCleaned: string;
    errors: string[];
    status: RobotStatusCode;
    connectionType: ConnectionType;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLastCleaned(raw: string | null): string {
    if (!raw || raw === 'Never') return 'Never';
    try {
        const date = new Date(raw);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60)  return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7)   return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return 'Invalid date';
    }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PulsingDot({ active }: { active: boolean }) {
    const scale   = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!active) { scale.setValue(1); opacity.setValue(1); return; }
        const loop = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scale,   { toValue: 1.4, duration: 1000, useNativeDriver: true }),
                    Animated.timing(scale,   { toValue: 1,   duration: 1000, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(opacity, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 1,   duration: 1000, useNativeDriver: true }),
                ]),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [active, scale, opacity]);

    return (
        <Animated.View style={[
            pulseStyles.dot,
            { backgroundColor: active ? '#22c55e' : '#94a3b8', transform: [{ scale }], opacity },
        ]} />
    );
}

const pulseStyles = StyleSheet.create({
    dot: { width: 10, height: 10, borderRadius: 5 },
});

// ---------------------------------------------------------------------------
// Main Dashboard Screen
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
    const { push } = useAppNavigation();
    const { colors, darkMode } = useThemeContext();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const [status, setStatus]           = useState<RobotStatus | null>(null);
    const [loading, setLoading]         = useState(true);
    const [refreshing, setRefreshing]   = useState(false);
    const [weeklyRuntime, setWeeklyRuntime] = useState<string>('—');
    const [weeklyArea, setWeeklyArea]   = useState<string>('—');

    const cardBg        = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder    = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary   = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor  = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    const fetchWeeklyStats = useCallback(async (userId: string) => {
        try {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const isoWeekAgo = oneWeekAgo.toISOString().split('T')[0];

            const { data: sessions } = await supabase
                .from('cleaning_sessions')
                .select('duration, area')
                .eq('user_id', userId)
                .gte('date', isoWeekAgo);

            if (!sessions || sessions.length === 0) return;

            let totalMins = 0;
            for (const s of sessions) {
                if (!s.duration) continue;
                const hMatch = s.duration.match(/(\d+)\s*h/);
                const mMatch = s.duration.match(/(\d+)\s*m(?:in)?/);
                totalMins += (hMatch ? parseInt(hMatch[1]) * 60 : 0) + (mMatch ? parseInt(mMatch[1]) : 0);
            }
            setWeeklyRuntime(`${(totalMins / 60).toFixed(1)}h`);

            let totalArea = 0;
            for (const s of sessions) {
                if (!s.area) continue;
                const aMatch = s.area.match(/(\d+(?:\.\d+)?)/);
                if (aMatch) totalArea += parseFloat(aMatch[1]);
            }
            setWeeklyArea(`${Math.round(totalArea)}m²`);
        } catch (err) {
            console.error('[DashboardScreen] fetchWeeklyStats error:', err);
        }
    }, []);

    const fetchStatus = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('No authenticated user');

            fetchWeeklyStats(user.id);

            const { data, error } = await supabase
                .from('robots')
                .select('*')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;

            if (!data) {
                setStatus({
                    isCleaning: false, lastCleaned: 'Never',
                    errors: ['No robot data available'], status: 'Offline', connectionType: 'none',
                });
                return;
            }

            const normalizedStatus = data.status?.toLowerCase() ?? '';
            const displayStatus = normalizedStatus
                ? ((normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)) as RobotStatusCode)
                : 'Offline';
            setStatus({
                isCleaning:     normalizedStatus === 'cleaning',
                lastCleaned:    data.updated_at ?? 'Never',
                errors:         [],
                status:         displayStatus,
                connectionType: data.is_online
                    ? ((data.connection_type as ConnectionType) || 'wifi')
                    : 'none',
            });
        } catch (err: any) {
            console.error('[DashboardScreen] fetchStatus error:', err);
            Alert.alert('Connection Error', 'Unable to load robot status. Please try again.');
            setStatus({
                isCleaning: false, lastCleaned: 'Never',
                errors: ['Failed to load status'], status: 'Offline', connectionType: 'none',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fetchWeeklyStats]);

    useEffect(() => {
        fetchStatus();
        // Fire-and-forget: sends weekly report email if 7 days have elapsed
        // and the user has that preference on.
        AsyncStorage.getItem('notificationPreferences').then(raw => {
            const prefs = raw ? JSON.parse(raw) : {};
            checkAndSendWeeklyReport(prefs.weeklyReport === true).catch(() => {});
        }).catch(() => {});
    }, [fetchStatus]);

    const onRefresh = useCallback(() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        fetchStatus();
    }, [fetchStatus]);

    const isCleaning   = status?.isCleaning ?? false;
    const isConnected  = status?.connectionType !== 'none';

    if (loading && !status) return <Loader message="Loading dashboard..." />;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>

                    {/* Header */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Dashboard
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Monitor your Smart Cleaner Pro
                        </AppText>
                    </View>

                    {/* Robot Status Card */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.robotHeader}>
                            <View style={[
                                styles.robotAvatar,
                                { backgroundColor: isCleaning ? 'rgba(34,197,94,0.15)' : darkMode ? 'rgba(59,130,246,0.16)' : 'rgba(59,130,246,0.12)' },
                            ]}>
                                <Ionicons name="hardware-chip" size={28} color={isCleaning ? '#22c55e' : colors.primary} />
                            </View>
                            <View style={styles.robotInfo}>
                                <AppText style={[styles.robotName, { color: textPrimary }]}>
                                    Smart Cleaner Pro
                                </AppText>
                                <View style={styles.statusRow}>
                                    <PulsingDot active={isCleaning} />
                                    <AppText style={[styles.statusText, { color: textSecondary }]}>
                                        {isCleaning ? 'Cleaning in progress' : status?.status ?? 'Offline'}
                                    </AppText>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    fetchStatus();
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                        {/* Connection */}
                        <View style={styles.connectionSection}>
                            <View style={styles.connectionRow}>
                                <View style={[styles.connectionDot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
                                <AppText style={[styles.connectionText, { color: textSecondary }]}>
                                    {isConnected ? `Connected via ${status?.connectionType.toUpperCase()}` : 'Not Connected'}
                                </AppText>
                            </View>
                            <TouchableOpacity
                                style={[styles.connectionButton, { backgroundColor: darkMode ? 'rgba(59,130,246,0.16)' : 'rgba(59,130,246,0.12)' }]}
                                onPress={() => push('../settings/connection')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="link-outline" size={18} color={colors.primary} style={{ marginRight: 10 }} />
                                <AppText style={[styles.connectionButtonText, { color: colors.primary }]}>
                                    {isConnected ? 'Manage Connection' : 'Connect Robot'}
                                </AppText>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Quick Stats Row */}
                    <View style={styles.statsRow}>
                        {[
                            { icon: 'checkmark-circle-outline' as const, color: isCleaning ? '#22c55e' : '#94a3b8', value: isCleaning ? 'Active' : 'Idle',  label: 'Status'    },
                            { icon: 'time-outline'              as const, color: '#a78bfa',                           value: weeklyRuntime,                   label: 'Runtime'   },
                            { icon: 'map-outline'               as const, color: '#fb923c',                           value: weeklyArea,                      label: 'This Week' },
                        ].map(stat => (
                            <View key={stat.label} style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                <Ionicons name={stat.icon} size={24} color={stat.color} />
                                <AppText style={[styles.statValue, { color: textPrimary }]}>{stat.value}</AppText>
                                <AppText style={[styles.statLabel, { color: textSecondary }]}>{stat.label}</AppText>
                            </View>
                        ))}
                    </View>

                    {/* Last Session Card */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                            <AppText style={[styles.cardTitle, { color: textSecondary }]}>Last Cleaning Session</AppText>
                        </View>
                        <AppText style={[styles.cardValue, { color: textPrimary }]}>
                            {formatLastCleaned(status?.lastCleaned ?? 'Never')}
                        </AppText>
                    </View>

                    {/* Error Banner */}
                    {status?.errors && status.errors.length > 0 && (
                        <View style={styles.errorBanner}>
                            <View style={styles.errorIconContainer}>
                                <Ionicons name="warning-outline" size={20} color="#fbbf24" />
                            </View>
                            <View style={styles.errorContent}>
                                <AppText style={styles.errorText}>{status.errors[0]}</AppText>
                                {status.errors.length > 1 && (
                                    <AppText style={styles.errorCount}>
                                        +{status.errors.length - 1} more issue{status.errors.length - 1 !== 1 ? 's' : ''}
                                    </AppText>
                                )}
                            </View>
                        </View>
                    )}
                </View>
                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------------------
// Styles
// NOTE: No fontFamily anywhere — React Native's default cross-platform font
// is immune to the phone's font-type accessibility setting. If you add a custom
// font, load it via expo-font and add its name to LOADED_FONTS in AppText.tsx.
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container: { flex: 1 },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 25,
        paddingBottom: 80,
    },
    scrollContentLarge: { alignItems: 'center' },

    wrapper:      { width: '100%' },
    largeWrapper: { maxWidth: 480 },

    headerSection: { marginBottom: 32 },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 6,
        // ✗ NO fontFamily — removed 'SF-Pro-Display-Bold' which caused Android fallback
    },
    headerSubtitle: {
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0.1,
    },

    card: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
    },

    robotHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    robotAvatar: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    robotInfo:   { flex: 1 },
    robotName:   { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 6 },
    statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusText:  { fontSize: 14, fontWeight: '500' },
    refreshButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    divider: { height: 1, marginVertical: 20 },

    connectionSection:    {},
    connectionRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    connectionDot:        { width: 10, height: 10, borderRadius: 5 },
    connectionText:       { flex: 1, fontSize: 14, fontWeight: '500' },
    connectionButton:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14 },
    connectionButtonText: { fontSize: 15, fontWeight: '600' },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    statCard:  { flex: 1, borderRadius: 18, paddingVertical: 20, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, gap: 8 },
    statValue: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
    statLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.6 },

    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardTitle:  { fontSize: 14, fontWeight: '500' },
    cardValue:  { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },

    errorBanner:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', borderRadius: 14, padding: 16, marginBottom: 20, gap: 12 },
    errorIconContainer: { marginTop: 2 },
    errorContent:     { flex: 1 },
    errorText:        { color: '#fbbf24', fontSize: 14, fontWeight: '500', marginBottom: 4 },
    errorCount:       { color: '#fbbf24', fontSize: 12, fontWeight: '400', opacity: 0.8 },

    actionsGrid:  { flexDirection: 'row', gap: 12 },
    actionButton: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 18, alignItems: 'center', gap: 10 },
    actionLabel:  { fontSize: 13, fontWeight: '600' },

    footer: { textAlign: 'center', marginTop: 32, fontSize: 12.5, opacity: 0.65, letterSpacing: 0.3 },
});