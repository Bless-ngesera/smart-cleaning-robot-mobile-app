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
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Animated,
    Dimensions,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import Header from '../../src/components/Header';
import Loader from '../../src/components/Loader';
import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionType = 'wifi' | 'ble' | 'none';
type RobotStatusCode = 'Online' | 'Offline' | 'Charging' | 'Error';

type RobotStatus = {
    batteryLevel: number;       // 0–100
    isCleaning: boolean;
    lastCleaned: string;        // ISO date string or 'Never'
    errors: string[];
    status: RobotStatusCode;
    connectionType: ConnectionType;
    // === C++ INTEGRATION POINT ===
    // Add extra telemetry fields returned by RobotBridge here:
    // dustBinFull?: boolean;
    // signalStrength?: number;  // dBm
    // firmwareVersion?: string;
};

// ---------------------------------------------------------------------------
// Mock data layer – REPLACE with RobotBridge when native bridge is ready
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

const { width } = Dimensions.get('window');
const isLargeScreen = width >= 768;

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
    return 'battery-dead';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated battery fill bar */
function BatteryBar({ level, color, darkMode }: { level: number; color: string; darkMode: boolean }) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(anim, {
            toValue: level / 100,
            duration: 900,
            useNativeDriver: false,
        }).start();
    }, [level]);

    const animatedWidth = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={[
            batteryBarStyles.track,
            { backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
        ]}>
            <Animated.View style={[batteryBarStyles.fill, { width: animatedWidth, backgroundColor: color }]} />
        </View>
    );
}

const batteryBarStyles = StyleSheet.create({
    track: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 10,
    },
    fill: {
        height: '100%',
        borderRadius: 3,
    },
});

/** Pulsing dot – same visual weight as login's status indicators */
function PulsingDot({ active }: { active: boolean }) {
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!active) {
            scale.setValue(1);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(scale, { toValue: 1.6, duration: 700, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [active, scale]);

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

    const [status, setStatus]       = useState<RobotStatus | null>(null);
    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ── Design tokens mirrored from LoginScreen ───────────────────────────────
    const textPrimary   = darkMode ? '#ffffff'                : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.8)' : colors.textSecondary; // slightly darker for visibility
    const borderColor   = darkMode ? 'rgba(255,255,255,0.12)' : colors.border; // exact match to Login
    const dividerColor  = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    // ── Data fetching ─────────────────────────────────────────────────────────

    const fetchStatus = useCallback(async () => {
        setRefreshing(true);

        try {
            // === C++ INTEGRATION POINT ===
            // Replace MockRobotBridge with your real native module, e.g.:
            //   import RobotBridge from '@/src/native/RobotBridge';
            //   const liveData = await RobotBridge.getLiveStatus();
            const liveData = await MockRobotBridge.getLiveStatus();

            // Merge with Supabase (cloud-persisted history).
            // Safely ignored when the table doesn't exist yet (PGRST116).
            let dbData: Partial<RobotStatus> = {};
            try {
                const userId = (await supabase.auth.getUser()).data.user?.id;
                if (userId) {
                    const { data, error } = await supabase
                        .from('robot_status') // ← create this table when ready
                        .select('battery_level, is_cleaning, last_cleaned, errors, status')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (!error || error.code === 'PGRST116') {
                        dbData = {
                            batteryLevel: data?.battery_level,
                            isCleaning:   data?.is_cleaning,
                            lastCleaned:  data?.last_cleaned,
                            errors:       data?.errors,
                            status:       data?.status,
                        };
                    }
                }
            } catch {
                // DB not configured yet – silent fallback to live/mock data
            }

            // Live hardware data takes priority over cloud snapshot
            setStatus({
                batteryLevel:  liveData.batteryLevel  ?? dbData.batteryLevel  ?? 0,
                isCleaning:    liveData.isCleaning    ?? dbData.isCleaning    ?? false,
                lastCleaned:   liveData.lastCleaned   ?? dbData.lastCleaned   ?? 'Never',
                errors:        liveData.errors        ?? dbData.errors        ?? [],
                status:        liveData.status        ?? dbData.status        ?? 'Offline',
                connectionType: liveData.connectionType ?? 'none',
            });
        } catch (err: any) {
            console.error('[DashboardScreen] fetchStatus error:', err);
            Alert.alert('Connection Issue', 'Unable to load robot status. Pull to retry.');
            setStatus({
                batteryLevel:  0,
                isCleaning:    false,
                lastCleaned:   'Never',
                errors:        [],
                status:        'Offline',
                connectionType: 'none',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();

        // === C++ INTEGRATION POINT ===
        // Subscribe to hardware events for real-time telemetry:
        //   const sub = RobotBridge.onStatusChange((data) =>
        //       setStatus(prev => prev ? { ...prev, ...data } : null));
        //   return () => sub.remove();
        //
        // Or enable a timed poll as fallback:
        // const interval = setInterval(fetchStatus, 10_000);
        // return () => clearInterval(interval);
    }, [fetchStatus]);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        fetchStatus();
    }, [fetchStatus]);

    // ── Derived state ─────────────────────────────────────────────────────────

    const batteryLevel = status?.batteryLevel ?? 0;
    const isCleaning   = status?.isCleaning   ?? false;
    const isConnected  = status?.connectionType !== 'none';
    const bColor       = batteryColor(batteryLevel);

    // ── Loading state – same Loader component as LoginScreen ─────────────────

    if (loading && !status) {
        return <Loader message="Fetching robot status..." />;
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.scrollContentLarge,
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>

                    {/* ── Header – same component as LoginScreen ── */}
                    <Header
                        title="Dashboard"
                        subtitle="Monitor your Smart Cleaner Pro"
                    />

                    {/* HERO CARD – exact same card style as Login */}
                    <View style={[styles.card, { borderColor }]}>

                        {/* Robot identity */}
                        <View style={styles.robotRow}>
                            <View style={[
                                styles.robotAvatar,
                                { backgroundColor: isCleaning ? 'rgba(34,197,94,0.15)' : `${colors.primary}1a` },
                            ]}>
                                <Ionicons
                                    name="hardware-chip"
                                    size={32}
                                    color={isCleaning ? '#22c55e' : colors.primary}
                                />
                            </View>

                            <View style={styles.robotInfo}>
                                <AppText style={[styles.robotName, { color: textPrimary }]}>
                                    Smart Cleaner Pro
                                </AppText>
                                <View style={styles.statusBadge}>
                                    <PulsingDot active={isCleaning} />
                                    <AppText style={[styles.statusLabel, { color: textSecondary }]}>
                                        {isCleaning ? 'Cleaning in progress' : (status?.status ?? 'Offline')}
                                    </AppText>
                                </View>
                            </View>

                            {/* Refresh – same tap-target size as login's eye-toggle */}
                            <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    fetchStatus();
                                }}
                                accessibilityLabel="Refresh status"
                            >
                                <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Divider – same rgba as login OR divider */}
                        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                        {/* Battery */}
                        <View style={styles.batterySection}>
                            <View style={styles.batteryRow}>
                                <Ionicons name={batteryIcon(batteryLevel)} size={20} color={bColor} />
                                <AppText style={[styles.fieldLabel, { color: textSecondary }]}>
                                    Battery
                                </AppText>
                                <View style={styles.flex1} />
                                <AppText style={[styles.batteryPercent, { color: bColor }]}>
                                    {batteryLevel}%
                                </AppText>
                            </View>
                            <BatteryBar level={batteryLevel} color={bColor} darkMode={darkMode} />
                        </View>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                        {/* Connection status */}
                        <View style={styles.connectionRow}>
                            <View style={[styles.connDot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
                            <AppText style={[styles.connectionText, { color: textSecondary }]}>
                                {isConnected
                                    ? `Connected via ${status?.connectionType === 'wifi' ? 'Wi-Fi' : 'Bluetooth'}`
                                    : 'Disconnected'}
                            </AppText>
                        </View>

                        {/* Connect / Manage – styled as login's "Create New Account" secondary button */}
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                router.push('../settings/connection');
                            }}
                            accessibilityLabel={isConnected ? 'Manage connection' : 'Connect robot'}
                        >
                            <Ionicons
                                name={isConnected ? 'link-outline' : 'link-outline'}
                                size={20}
                                color={darkMode ? '#ffffff' : colors.primary}
                                style={styles.secondaryButtonIcon}
                            />
                            <AppText style={[styles.secondaryButtonText, { color: darkMode ? '#ffffff' : colors.primary }]}>
                                {isConnected ? 'Manage Connection' : 'Connect Robot'}
                            </AppText>
                        </TouchableOpacity>
                    </View>

                    {/* QUICK STATS – three mini-cards in a row */}
                    <View style={styles.statRow}>
                        {([
                            { icon: 'checkmark-circle-outline', color: '#22c55e', value: isCleaning ? 'Active' : 'Idle', label: 'Status'  },
                            { icon: 'time-outline',             color: '#a78bfa', value: '2.5 h',                        label: 'Runtime' },
                            { icon: 'map-outline',              color: '#fb923c', value: '127 m²',                       label: 'Cleaned' },
                        ] as const).map((tile) => (
                            <View
                                key={tile.label}
                                style={[styles.statTile, { borderColor }]}
                            >
                                <Ionicons name={tile.icon} size={26} color={tile.color} />
                                <AppText style={[styles.statValue, { color: textPrimary }]}>
                                    {tile.value}
                                </AppText>
                                <AppText style={[styles.statLabel, { color: textSecondary }]}>
                                    {tile.label}
                                </AppText>
                            </View>
                        ))}
                    </View>

                    {/* LAST SESSION */}
                    <View style={[styles.card, { borderColor }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} style={styles.cardHeaderIcon} />
                            <AppText style={[styles.cardLabel, { color: textSecondary }]}>
                                Last Session
                            </AppText>
                        </View>
                        <AppText style={[styles.cardValue, { color: textPrimary }]}>
                            {formatLastCleaned(status?.lastCleaned ?? 'Never')}
                        </AppText>
                    </View>

                    {/* ERROR BANNER */}
                    {(status?.errors ?? []).length > 0 && (
                        <View style={styles.errorBanner}>
                            <Ionicons name="warning-outline" size={20} color="#fbbf24" />
                            <AppText style={styles.errorBannerText}>
                                {status!.errors[0]}
                                {status!.errors.length > 1 ? ` (+${status!.errors.length - 1} more)` : ''}
                            </AppText>
                        </View>
                    )}

                    {/* QUICK ACTIONS */}
                    <View style={[styles.card, { borderColor }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="flash-outline" size={20} color={colors.primary} style={styles.cardHeaderIcon} />
                            <AppText style={[styles.cardLabel, { color: textSecondary }]}>
                                Quick Actions
                            </AppText>
                        </View>

                        {/* Divider above actions – mirrors login OR divider */}
                        <View style={[styles.divider, { backgroundColor: dividerColor, marginTop: 4, marginBottom: 20 }]} />

                        <View style={styles.actionsGrid}>
                            {([
                                { icon: 'game-controller-outline', label: 'Controls', route: '/(tabs)/02_ControlScreen',  accent: '#6366f1' },
                                { icon: 'calendar-outline',        label: 'Schedule', route: '/(tabs)/04_ScheduleScreen', accent: '#ec4899' },
                                { icon: 'map-outline',             label: 'Map',      route: '/(tabs)/03_MapScreen',      accent: '#14b8a6' },
                            ] as const).map((action) => (
                                <TouchableOpacity
                                    key={action.label}
                                    style={[
                                        styles.actionTile,
                                        { backgroundColor: `${action.accent}18`, borderColor: `${action.accent}30` },
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        router.push(action.route);
                                    }}
                                    accessibilityLabel={`Go to ${action.label}`}
                                >
                                    <Ionicons name={action.icon} size={24} color={action.accent} />
                                    <AppText style={[styles.actionLabel, { color: textPrimary }]}>
                                        {action.label}
                                    </AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                </View>

                {/* Footer – identical style to LoginScreen */}
                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------------------
// Styles – every value mirrors LoginScreen token-for-token
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

    // ── Layout ──────────────────────────────────────────────────────────────
    container: { flex: 1 },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 80,
    },

    scrollContentLarge: {
        alignItems: 'center',
    },

    wrapper: { width: '100%' },

    largeWrapper: { maxWidth: 480 },   // matches login largeWrapper

    flex1: { flex: 1 },

    // ── Card – token-for-token copy of login card ────────────────────────────
    card: {
        borderRadius: 24,              // login: borderRadius: 24
        padding: 28,                   // login: padding: 28
        borderWidth: 1,                // login: borderWidth: 1
        marginBottom: 20,
        // Flat premium – no shadow, no glow (same as login)
    },

    // ── Robot identity row ───────────────────────────────────────────────────
    robotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },

    robotAvatar: {
        width: 56,
        height: 56,
        borderRadius: 14,              // matches login input borderRadius: 14
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },

    robotInfo: { flex: 1 },

    robotName: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 4,
    },

    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    statusLabel: {
        fontSize: 14,                  // matches login label fontSize: 14
        fontWeight: '500',
    },

    // Icon button – same tap target as login's right-side eye toggle
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Divider – same rgba as login OR divider line ─────────────────────────
    divider: {
        height: 1,
        marginVertical: 20,
        borderRadius: 1,
    },

    // ── Battery ───────────────────────────────────────────────────────────────
    batterySection: { marginBottom: 0 },

    batteryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    fieldLabel: {
        fontSize: 14,                  // matches login label fontSize: 14
        fontWeight: '500',
    },

    batteryPercent: {
        fontSize: 16,
        fontWeight: '700',
    },

    // ── Connection ────────────────────────────────────────────────────────────
    connectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },

    connDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },

    connectionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },

    // Secondary button – identical to login "Create New Account" button
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,                    // login: height: 56
        borderRadius: 14,              // login: borderRadius: 14
        backgroundColor: 'rgba(59, 130, 246, 0.15)', // login: same rgba
    },

    secondaryButtonIcon: { marginRight: 12 }, // login: marginRight: 12

    secondaryButtonText: {
        fontSize: 16,                  // login: fontSize: 16
        fontWeight: '500',             // login: fontWeight: '500'
    },

    // ── Stat row ──────────────────────────────────────────────────────────────
    statRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },

    statTile: {
        flex: 1,
        borderRadius: 20,
        paddingVertical: 18,
        paddingHorizontal: 10,
        alignItems: 'center',
        borderWidth: 1,
        gap: 6,
    },

    statValue: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },

    statLabel: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // ── Card internals ────────────────────────────────────────────────────────
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },

    cardHeaderIcon: { marginRight: 8 },

    cardLabel: {
        fontSize: 14,                  // matches login label fontSize: 14
        fontWeight: '500',
    },

    cardValue: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },

    // ── Error banner ──────────────────────────────────────────────────────────
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
        borderRadius: 14,              // matches login input borderRadius: 14
        padding: 16,
        marginBottom: 20,
    },

    errorBannerText: {
        flex: 1,
        color: '#fbbf24',
        fontSize: 14,
        fontWeight: '500',
    },

    // ── Quick actions ─────────────────────────────────────────────────────────
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },

    actionTile: {
        flex: 1,
        borderRadius: 14,              // matches login input borderRadius: 14
        borderWidth: 1,
        paddingVertical: 20,
        alignItems: 'center',
        gap: 10,
    },

    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
    },

    // ── Footer – identical to LoginScreen ─────────────────────────────────────
    footer: {
        textAlign: 'center',
        marginTop: 32,                 // login: marginTop: 32
        fontSize: 12,                  // login: fontSize: 12
        opacity: 0.7,                  // login: opacity: 0.7
    },
});