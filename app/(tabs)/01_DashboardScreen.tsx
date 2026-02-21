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
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Animated,
    Dimensions,
    RefreshControl,
    Platform,
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

interface RobotStatus {
    batteryLevel: number;
    isCleaning: boolean;
    lastCleaned: string;
    errors: string[];
    status: RobotStatusCode;
    connectionType: ConnectionType;
    // === C++ INTEGRATION POINT ===
    // Add extra telemetry fields returned by RobotBridge here
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { width } = Dimensions.get('window');
const isLargeScreen = width >= 768;

function formatLastCleaned(raw: string | null): string {
    if (!raw) return 'Never';
    try {
        return new Date(raw).toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch {
        return 'Invalid date';
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
// Sub-components (unchanged)
// ---------------------------------------------------------------------------

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
                Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
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
// Main screen – now using REAL Supabase data
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
    const { colors, darkMode } = useThemeContext();

    const [status, setStatus] = useState<RobotStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Animation values for collapsing/pinning the header
    const scrollY = useRef(new Animated.Value(0)).current;
    const headerTranslate = scrollY.interpolate({
        inputRange: [0, 160],
        outputRange: [0, -160],
        extrapolate: 'clamp',
    });

    // ── Design tokens ─────────────────────────────────────────────────────────
    const textPrimary   = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.8)' : colors.textSecondary;
    const borderColor   = darkMode ? 'rgba(255,255,255,0.12)' : colors.border;
    const dividerColor  = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    // ── Fetch real data from Supabase ─────────────────────────────────────────

    const fetchStatus = useCallback(async () => {
        setRefreshing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) {
                throw new Error('No authenticated user');
            }

            const { data, error } = await supabase
                .from('robot_status')
                .select('battery_level, is_cleaning, last_cleaned, errors, status, connection_type')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (!data) {
                // No record yet – show fallback values
                setStatus({
                    batteryLevel: 0,
                    isCleaning: false,
                    lastCleaned: 'Never',
                    errors: ['No robot data recorded yet'],
                    status: 'Offline',
                    connectionType: 'none',
                });
                return;
            }

            setStatus({
                batteryLevel: data.battery_level ?? 0,
                isCleaning: data.is_cleaning ?? false,
                lastCleaned: data.last_cleaned ?? 'Never',
                errors: data.errors ?? [],
                status: (data.status as RobotStatusCode) ?? 'Offline',
                connectionType: (data.connection_type as ConnectionType) ?? 'none',
            });
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
    }, []);

    useEffect(() => {
        fetchStatus();

        // Real-time polling (replace with Supabase realtime or C++ listener later)
        const interval = setInterval(fetchStatus, 15000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        fetchStatus();
    }, [fetchStatus]);

    // ── Derived state ─────────────────────────────────────────────────────────

    const batteryLevel = status?.batteryLevel ?? 0;
    const isCleaning = status?.isCleaning ?? false;
    const isConnected = status?.connectionType !== 'none';
    const bColor = batteryColor(batteryLevel);

    if (loading && !status) {
        return <Loader message="Fetching robot status..." />;
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Collapsing / pinned header */}
            <Animated.View
                style={[
                    styles.stickyHeaderContainer,
                    { transform: [{ translateY: headerTranslate }] },
                ]}
            >
                <View style={[styles.stickyHeaderInner, { backgroundColor: colors.background }]}>
                    <AppText style={styles.stickyTitle}>
                        Dashboard
                    </AppText>
                </View>
            </Animated.View>

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
                onScroll={(e) => scrollY.setValue(e.nativeEvent.contentOffset.y)}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                {/* Placeholder to prevent content jump */}
                <View style={{ height: 160 }} />

                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                    {/* Full header at top */}
                    <Header
                        title="Dashboard"
                        subtitle="Monitor your Smart Cleaner Pro"
                    />

                    {/* Hero card */}
                    <View style={[styles.card, { borderColor }]}>
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

                            <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    fetchStatus();
                                }}
                            >
                                <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

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

                        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                        <View style={styles.connectionRow}>
                            <View style={[styles.connDot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
                            <AppText style={[styles.connectionText, { color: textSecondary }]}>
                                {isConnected
                                    ? `Connected via ${status?.connectionType.toUpperCase()}`
                                    : 'Not Connected'}
                            </AppText>
                        </View>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => router.push('/(tabs)/settings/connection')}
                        >
                            <Ionicons name="link-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
                            <AppText style={[styles.secondaryButtonText, { color: colors.primary }]}>
                                {isConnected ? 'Manage Connection' : 'Connect Robot'}
                            </AppText>
                        </TouchableOpacity>
                    </View>

                    {/* Quick stats */}
                    <View style={styles.statRow}>
                        {([
                            { icon: 'checkmark-circle-outline', color: '#22c55e', value: isCleaning ? 'Active' : 'Idle', label: 'Status' },
                            { icon: 'time-outline', color: '#a78bfa', value: '2.4 h', label: 'Avg Runtime' },
                            { icon: 'map-outline', color: '#fb923c', value: '142 m²', label: 'This Week' },
                        ] as const).map((item) => (
                            <View key={item.label} style={[styles.statTile, { borderColor }]}>
                                <Ionicons name={item.icon} size={26} color={item.color} />
                                <AppText style={[styles.statValue, { color: textPrimary }]}>{item.value}</AppText>
                                <AppText style={[styles.statLabel, { color: textSecondary }]}>{item.label}</AppText>
                            </View>
                        ))}
                    </View>

                    {/* Last session */}
                    <View style={[styles.card, { borderColor }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                            <AppText style={[styles.cardLabel, { color: textSecondary }]}>Last Session</AppText>
                        </View>
                        <AppText style={[styles.cardValue, { color: textPrimary }]}>
                            {formatLastCleaned(status?.lastCleaned)}
                        </AppText>
                    </View>

                    {/* Error banner */}
                    {status?.errors?.length ? (
                        <View style={styles.errorBanner}>
                            <Ionicons name="warning-outline" size={20} color="#fbbf24" />
                            <AppText style={styles.errorBannerText}>
                                {status.errors[0]}
                                {status.errors.length > 1 && ` (+${status.errors.length - 1})`}
                            </AppText>
                        </View>
                    ) : null}

                    {/* Quick actions */}
                    <View style={[styles.card, { borderColor }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="flash-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                            <AppText style={[styles.cardLabel, { color: textSecondary }]}>Quick Actions</AppText>
                        </View>

                        <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: 12 }]} />

                        <View style={styles.actionsGrid}>
                            {[
                                { icon: 'game-controller-outline', label: 'Control', route: '/(tabs)/02_ControlScreen', color: '#6366f1' },
                                { icon: 'calendar-outline', label: 'Schedule', route: '/(tabs)/04_ScheduleScreen', color: '#ec4899' },
                                { icon: 'map-outline', label: 'Map View', route: '/(tabs)/03_MapScreen', color: '#14b8a6' },
                            ].map((action) => (
                                <TouchableOpacity
                                    key={action.label}
                                    style={[styles.actionTile, { backgroundColor: `${action.color}12`, borderColor: `${action.color}30` }]}
                                    onPress={() => router.push(action.route)}
                                >
                                    <Ionicons name={action.icon} size={26} color={action.color} />
                                    <AppText style={[styles.actionLabel, { color: textPrimary }]}>{action.label}</AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------------------
// Styles – consistent with auth screens
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container: { flex: 1 },

    stickyHeaderContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        overflow: 'hidden',
    },
    stickyHeaderInner: {
        paddingTop: Platform.OS === 'ios' ? 44 : 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        alignItems: 'flex-start',
    },
    stickyTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },

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
    largeWrapper: { maxWidth: 480 },

    flex1: { flex: 1 },

    card: {
        borderRadius: 24,
        padding: 28,
        borderWidth: 1,
        marginBottom: 20,
    },

    robotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    robotAvatar: {
        width: 56,
        height: 56,
        borderRadius: 14,
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
        fontSize: 14,
        fontWeight: '500',
    },

    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },

    divider: {
        height: 1,
        marginVertical: 20,
    },

    batterySection: { marginBottom: 0 },
    batteryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    batteryPercent: {
        fontSize: 16,
        fontWeight: '700',
    },

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

    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 14,
        backgroundColor: 'rgba(59,130,246,0.15)',
    },
    secondaryButtonIcon: { marginRight: 12 },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },

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

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardHeaderIcon: { marginRight: 8 },
    cardLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    cardValue: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },

    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
    },
    errorBannerText: {
        flex: 1,
        color: '#fbbf24',
        fontSize: 14,
        fontWeight: '500',
    },

    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionTile: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 20,
        alignItems: 'center',
        gap: 10,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12,
        opacity: 0.7,
    },
});