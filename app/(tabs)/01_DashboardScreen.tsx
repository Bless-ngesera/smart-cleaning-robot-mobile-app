// app/(tabs)/01_DashboardScreen.tsx
//
// ============================================================
// C++ INTEGRATION OVERVIEW
// ------------------------------------------------------------
// This file uses a mock data layer (MockRobotBridge) as a
// stand-in for real hardware communication. When you're ready
// to wire in the native C++ bridge:
//
//   1. Replace every call to `MockRobotBridge.*` with the
//      corresponding `RobotBridge.*` call from your native module.
//   2. Keep the same TypeScript types so nothing else changes.
//   3. All C++ hooks are marked with:
//        // === C++ INTEGRATION POINT ===
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    Alert,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionType = 'wifi' | 'ble' | 'none';
type RobotStatusCode = 'Online' | 'Offline' | 'Charging' | 'Error';

type RobotStatus = {
    batteryLevel: number;        // 0–100
    isCleaning: boolean;
    lastCleaned: string;         // ISO date string or 'Never'
    errors: string[];
    status: RobotStatusCode;
    connectionType: ConnectionType;
    // === C++ INTEGRATION POINT ===
    // Add extra telemetry fields returned by RobotBridge here:
    // dustBinFull?: boolean;
    // signalStrength?: number;   // dBm
    // firmwareVersion?: string;
};

// ---------------------------------------------------------------------------
// Mock data layer – DELETE when native bridge is ready
// ---------------------------------------------------------------------------
const MockRobotBridge = {
    getLiveStatus: async (): Promise<Partial<RobotStatus>> => ({
        batteryLevel: 78,
        isCleaning: false,
        lastCleaned: new Date(Date.now() - 3_600_000 * 5).toISOString(),
        errors: [],
        status: 'Online',
        connectionType: 'wifi',
    }),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatLastCleaned(raw: string): string {
    if (!raw || raw === 'Never') return 'Never';
    try {
        return new Date(raw).toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch {
        return raw;
    }
}

function batteryColor(level: number): string {
    if (level >= 60) return '#22c55e';
    if (level >= 30) return '#f59e0b';
    return '#ef4444';
}

function batteryIcon(level: number): keyof typeof Ionicons.glyphMap {
    if (level >= 75) return 'battery-full';
    if (level >= 50) return 'battery-half';
    if (level >= 20) return 'battery-dead';
    return 'battery-dead';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated battery bar */
function BatteryBar({ level, color }: { level: number; color: string }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, {
            toValue: level / 100,
            duration: 900,
            useNativeDriver: false,
        }).start();
    }, [level]);
    const width = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });
    return (
        <View style={batteryBarStyles.track}>
            <Animated.View style={[batteryBarStyles.fill, { width, backgroundColor: color }]} />
        </View>
    );
}

const batteryBarStyles = StyleSheet.create({
    track: {
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        marginTop: 8,
    },
    fill: {
        height: '100%',
        borderRadius: 4,
    },
});

/** Pulsing dot shown when robot is active */
function PulsingDot({ active }: { active: boolean }) {
    const scale = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (!active) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(scale, { toValue: 1.5, duration: 600, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1, duration: 600, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [active]);
    return (
        <Animated.View
            style={[
                pulseStyles.dot,
                {
                    backgroundColor: active ? '#22c55e' : '#64748b',
                    transform: [{ scale }],
                },
            ]}
        />
    );
}

const pulseStyles = StyleSheet.create({
    dot: { width: 10, height: 10, borderRadius: 5 },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
    const { colors, darkMode } = useThemeContext();

    const [status, setStatus] = useState<RobotStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Entrance animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    const animateIn = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    // -----------------------------------------------------------------------
    // Data fetching
    // -----------------------------------------------------------------------

    const fetchStatus = useCallback(async () => {
        setRefreshing(true);

        try {
            // === C++ INTEGRATION POINT ===
            // Step 1 – fetch live hardware data.
            // Replace MockRobotBridge with your real native module, e.g.:
            //   import RobotBridge from '@/src/native/RobotBridge';
            //   const liveData = await RobotBridge.getLiveStatus();
            const liveData = await MockRobotBridge.getLiveStatus();

            // Step 2 – optionally merge with Supabase for cloud-persisted fields
            // (last_cleaned, historical errors, etc.). If your DB has no table yet
            // the .single() will return a PGRST116 error which we safely ignore.
            let dbData: Partial<RobotStatus> = {};
            try {
                const userId = (await supabase.auth.getUser()).data.user?.id;
                if (userId) {
                    const { data, error } = await supabase
                        .from('robot_status') // Create this table when ready
                        .select('battery_level, is_cleaning, last_cleaned, errors, status')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (!error || error.code === 'PGRST116') {
                        dbData = {
                            batteryLevel: data?.battery_level,
                            isCleaning: data?.is_cleaning,
                            lastCleaned: data?.last_cleaned,
                            errors: data?.errors,
                            status: data?.status,
                        };
                    }
                }
            } catch {
                // DB not set up yet – silent fallback
            }

            // Live hardware data takes priority over cloud snapshot
            setStatus({
                batteryLevel: liveData.batteryLevel ?? dbData.batteryLevel ?? 0,
                isCleaning: liveData.isCleaning ?? dbData.isCleaning ?? false,
                lastCleaned: liveData.lastCleaned ?? dbData.lastCleaned ?? 'Never',
                errors: liveData.errors ?? dbData.errors ?? [],
                status: liveData.status ?? dbData.status ?? 'Offline',
                connectionType: liveData.connectionType ?? 'none',
            });

            animateIn();
        } catch (err: any) {
            console.error('[DashboardScreen] fetchStatus error:', err);
            Alert.alert('Connection Issue', 'Unable to load robot status. Pull to retry.');
            setStatus({
                batteryLevel: 0,
                isCleaning: false,
                lastCleaned: 'Never',
                errors: [],
                status: 'Offline',
                connectionType: 'none',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [animateIn]);

    useEffect(() => {
        fetchStatus();

        // === C++ INTEGRATION POINT ===
        // For real-time telemetry, subscribe to hardware events instead of polling:
        //   const sub = RobotBridge.onStatusChange((data) => setStatus(prev => ({ ...prev, ...data })));
        //   return () => sub.remove();
        //
        // Or use a 10-second poll as a fallback:
        // const interval = setInterval(fetchStatus, 10_000);
        // return () => clearInterval(interval);
    }, [fetchStatus]);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        fetchStatus();
    }, [fetchStatus]);

    // -----------------------------------------------------------------------
    // Derived state
    // -----------------------------------------------------------------------

    const batteryLevel = status?.batteryLevel ?? 0;
    const isCleaning = status?.isCleaning ?? false;
    const isConnected = status?.connectionType !== 'none';
    const bColor = batteryColor(batteryLevel);

    // Theme-aware surface colors
    const surfaceBg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
    const surfaceBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const textPrimary = darkMode ? '#f1f5f9' : '#0f172a';
    const textSecondary = darkMode ? '#94a3b8' : '#64748b';

    // -----------------------------------------------------------------------
    // Loading skeleton
    // -----------------------------------------------------------------------

    if (loading && !status) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: darkMode ? '#0a0f1e' : '#f8faff' }]}>
                <View style={styles.loadingContainer}>
                    <Ionicons name="hardware-chip" size={48} color={colors.primary} />
                    <Text style={[styles.loadingText, { color: textSecondary }]}>
                        Connecting to robot…
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: darkMode ? '#0a0f1e' : '#f0f4ff' }]}>
            <ScrollView
                contentContainerStyle={styles.scroll}
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
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    {/* ── PAGE HEADER ───────────────────────────────────────── */}
                    <View style={styles.pageHeader}>
                        <View>
                            <Text style={[styles.pageTitle, { color: textPrimary }]}>Dashboard</Text>
                            <Text style={[styles.pageSubtitle, { color: textSecondary }]}>
                                Smart Cleaner Pro
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.iconBtn, { backgroundColor: surfaceBg, borderColor: surfaceBorder }]}
                            onPress={fetchStatus}
                            accessibilityLabel="Refresh status"
                        >
                            <Ionicons name="refresh" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* ── HERO CARD ─────────────────────────────────────────── */}
                    <LinearGradient
                        colors={
                            isCleaning
                                ? ['#064e3b', '#065f46']
                                : darkMode
                                    ? ['#1e1b4b', '#1e3a5f']
                                    : ['#2563eb', '#1d4ed8']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        {/* Top row */}
                        <View style={styles.heroTopRow}>
                            <View style={styles.heroAvatarWrapper}>
                                <Ionicons name="hardware-chip" size={32} color="#fff" />
                            </View>
                            <View style={styles.heroTitleBlock}>
                                <Text style={styles.heroRobotName}>Smart Cleaner Pro</Text>
                                <View style={styles.statusRow}>
                                    <PulsingDot active={isCleaning} />
                                    <Text style={styles.heroStatusText}>
                                        {isCleaning ? 'Cleaning in progress' : status?.status ?? 'Offline'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={styles.heroDivider} />

                        {/* Battery */}
                        <View style={styles.heroBatteryRow}>
                            <Ionicons name={batteryIcon(batteryLevel)} size={18} color={bColor} />
                            <Text style={styles.heroBatteryLabel}>Battery</Text>
                            <View style={{ flex: 1 }} />
                            <Text style={[styles.heroBatteryValue, { color: bColor }]}>
                                {batteryLevel}%
                            </Text>
                        </View>
                        <BatteryBar level={batteryLevel} color={bColor} />

                        {/* Connection */}
                        <View style={styles.heroConnectionRow}>
                            <View
                                style={[
                                    styles.connDot,
                                    { backgroundColor: isConnected ? '#22c55e' : '#ef4444' },
                                ]}
                            />
                            <Text style={styles.heroConnectionText}>
                                {isConnected
                                    ? `Connected via ${status?.connectionType === 'wifi' ? 'Wi-Fi' : 'Bluetooth'}`
                                    : 'Disconnected – tap to connect'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    router.push('../settings/connection');
                                }}
                                accessibilityLabel="Manage connection"
                            >
                                <Text style={styles.heroConnectionLink}>
                                    {isConnected ? 'Manage' : 'Connect'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {/* ── STAT TILES ────────────────────────────────────────── */}
                    <View style={styles.statRow}>
                        {[
                            {
                                icon: 'checkmark-circle' as const,
                                iconColor: '#22c55e',
                                value: isCleaning ? 'Active' : 'Idle',
                                label: 'Status',
                            },
                            {
                                icon: 'time' as const,
                                iconColor: '#a78bfa',
                                value: '2.5 h',
                                label: 'Runtime',
                            },
                            {
                                icon: 'map' as const,
                                iconColor: '#fb923c',
                                value: '127 m²',
                                label: 'Cleaned',
                            },
                        ].map((tile) => (
                            <View
                                key={tile.label}
                                style={[styles.statTile, { backgroundColor: surfaceBg, borderColor: surfaceBorder }]}
                            >
                                <Ionicons name={tile.icon} size={26} color={tile.iconColor} />
                                <Text style={[styles.statValue, { color: textPrimary }]}>{tile.value}</Text>
                                <Text style={[styles.statLabel, { color: textSecondary }]}>{tile.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* ── LAST SESSION ──────────────────────────────────────── */}
                    <View style={[styles.card, { backgroundColor: surfaceBg, borderColor: surfaceBorder }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconWrapper, { backgroundColor: `${colors.primary}1a` }]}>
                                <Ionicons name="calendar" size={18} color={colors.primary} />
                            </View>
                            <Text style={[styles.cardTitle, { color: textPrimary }]}>Last Session</Text>
                        </View>
                        <Text style={[styles.cardBody, { color: textSecondary }]}>
                            {formatLastCleaned(status?.lastCleaned ?? 'Never')}
                        </Text>
                    </View>

                    {/* ── ERROR BANNER (only shown when there are errors) ────── */}
                    {(status?.errors ?? []).length > 0 && (
                        <View style={styles.errorBanner}>
                            <Ionicons name="warning" size={18} color="#fbbf24" />
                            <Text style={styles.errorText}>
                                {status!.errors[0]}
                                {status!.errors.length > 1 ? ` (+${status!.errors.length - 1} more)` : ''}
                            </Text>
                        </View>
                    )}

                    {/* ── QUICK ACTIONS ─────────────────────────────────────── */}
                    <View style={[styles.card, { backgroundColor: surfaceBg, borderColor: surfaceBorder }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconWrapper, { backgroundColor: `${colors.primary}1a` }]}>
                                <Ionicons name="flash" size={18} color={colors.primary} />
                            </View>
                            <Text style={[styles.cardTitle, { color: textPrimary }]}>Quick Actions</Text>
                        </View>

                        <View style={styles.actionsGrid}>
                            {[
                                {
                                    icon: 'game-controller' as const,
                                    label: 'Controls',
                                    color: '#6366f1',
                                    route: '/(tabs)/02_ControlScreen',
                                },
                                {
                                    icon: 'calendar' as const,
                                    label: 'Schedule',
                                    color: '#ec4899',
                                    route: '/(tabs)/04_ScheduleScreen',
                                },
                                {
                                    icon: 'map' as const,
                                    label: 'Map',
                                    color: '#14b8a6',
                                    route: '/(tabs)/03_MapScreen',
                                },
                            ].map((action) => (
                                <TouchableOpacity
                                    key={action.label}
                                    style={[
                                        styles.actionTile,
                                        { backgroundColor: `${action.color}14`, borderColor: `${action.color}25` },
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        router.push(action.route);
                                    }}
                                    accessibilityLabel={`Go to ${action.label}`}
                                >
                                    <View style={[styles.actionIconRing, { backgroundColor: `${action.color}22` }]}>
                                        <Ionicons name={action.icon} size={24} color={action.color} />
                                    </View>
                                    <Text style={[styles.actionLabel, { color: textPrimary }]}>{action.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* ── FOOTER ────────────────────────────────────────────── */}
                    <Text style={[styles.footer, { color: textSecondary }]}>
                        v1.0.0 · Smart Cleaner Pro © 2026
                    </Text>

                    {/*
                     * === C++ INTEGRATION POINT ===
                     * Insert real-time telemetry cards here once RobotBridge is ready.
                     * Example card to add:
                     *
                     * <View style={[styles.card, { ... }]}>
                     *   <Text>Dust Bin: {status?.dustBinFull ? 'Full' : 'OK'}</Text>
                     *   <Text>Signal: {status?.signalStrength} dBm</Text>
                     * </View>
                     */}
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },

    scroll: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 100,
    },

    // ── Loading ──
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 15,
        fontWeight: '500',
    },

    // ── Page header ──
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 8,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    pageSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 2,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Hero card ──
    heroCard: {
        borderRadius: 24,
        padding: 22,
        marginBottom: 16,
        // Shadow
        ...Platform.select({
            ios: { shadowColor: '#2563eb', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20 },
            android: { elevation: 12 },
        }),
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 18,
    },
    heroAvatarWrapper: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroTitleBlock: {
        flex: 1,
    },
    heroRobotName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.3,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    heroStatusText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: '500',
    },
    heroDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginBottom: 16,
    },
    heroBatteryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    heroBatteryLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '500',
    },
    heroBatteryValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    heroConnectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
    },
    connDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    heroConnectionText: {
        flex: 1,
        color: 'rgba(255,255,255,0.65)',
        fontSize: 13,
    },
    heroConnectionLink: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },

    // ── Stat tiles ──
    statRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    statTile: {
        flex: 1,
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 10,
        alignItems: 'center',
        borderWidth: 1,
        gap: 6,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // ── Generic card ──
    card: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    cardIconWrapper: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    cardBody: {
        fontSize: 15,
        fontWeight: '500',
    },

    // ── Error banner ──
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#451a0380',
        borderWidth: 1,
        borderColor: '#92400e',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
    },
    errorText: {
        flex: 1,
        color: '#fbbf24',
        fontSize: 13,
        fontWeight: '500',
    },

    // ── Quick actions ──
    actionsGrid: {
        flexDirection: 'row',
        gap: 10,
    },
    actionTile: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 18,
        alignItems: 'center',
        gap: 10,
    },
    actionIconRing: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '600',
    },

    // ── Footer ──
    footer: {
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '400',
        marginTop: 8,
        marginBottom: 16,
        opacity: 0.5,
    },
});