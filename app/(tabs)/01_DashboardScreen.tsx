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

import Loader from '../../src/components/Loader';
import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

// === C++ BRIDGE / TYPE DEFINITIONS ===
// If using native modules for enhanced hardware integration (JNI/Obj-C++):
// declare module 'react-native' {
//   interface NativeModulesStatic {
//     RobotBridge: {
//       getRobotStatus(): Promise<RobotStatus>;
//       subscribeToStatusUpdates(callback: (status: RobotStatus) => void): Promise<void>;
//       unsubscribeFromStatusUpdates(): Promise<void>;
//     }
//   }
// }

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
    // e.g., currentSpeed, cleanedArea, sensorReadings, etc.
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { width } = Dimensions.get('window');
const isLargeScreen = width >= 768;

function formatLastCleaned(raw: string | null): string {
    if (!raw || raw === 'Never') return 'Never';
    try {
        const date = new Date(raw);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
            return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        }
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
    if (level >= 25) return 'battery-charging';
    return 'battery-dead';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Animated battery bar with smooth fill animation
 */
function BatteryBar({ level, color, darkMode }: { level: number; color: string; darkMode: boolean }) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(anim, {
            toValue: level / 100,
            duration: 800,
            useNativeDriver: false,
        }).start();
    }, [level, anim]);

    const animatedWidth = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={[
            batteryBarStyles.track,
            { backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
        ]}>
            <Animated.View
                style={[
                    batteryBarStyles.fill,
                    {
                        width: animatedWidth,
                        backgroundColor: color,
                    }
                ]}
            />
        </View>
    );
}

const batteryBarStyles = StyleSheet.create({
    track: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: 12,
    },
    fill: {
        height: '100%',
        borderRadius: 4,
    },
});

/**
 * Pulsing dot indicator for active/cleaning status
 */
function PulsingDot({ active }: { active: boolean }) {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!active) {
            scale.setValue(1);
            opacity.setValue(1);
            return;
        }

        const loop = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scale, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
                    Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(opacity, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
                ]),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [active, scale, opacity]);

    return (
        <Animated.View
            style={[
                pulseStyles.dot,
                {
                    backgroundColor: active ? '#22c55e' : '#94a3b8',
                    transform: [{ scale }],
                    opacity,
                },
            ]}
        />
    );
}

const pulseStyles = StyleSheet.create({
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
});

// ---------------------------------------------------------------------------
// Main Dashboard Screen
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
    const { colors, darkMode } = useThemeContext();

    const [status, setStatus] = useState<RobotStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Design tokens for consistent styling with LoginScreen
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    // === C++ BRIDGE / FETCH STATUS FROM SUPABASE ===
    const fetchStatus = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) {
                throw new Error('No authenticated user');
            }

            // === C++ INTEGRATION POINT ===
            // Replace Supabase call with native module:
            // const nativeStatus = await RobotBridge.getRobotStatus();
            // setStatus(nativeStatus);

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
                    errors: ['No robot data available'],
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
            Alert.alert('Connection Error', 'Unable to load robot status. Please try again.');
            setStatus({
                batteryLevel: 0,
                isCleaning: false,
                lastCleaned: 'Never',
                errors: ['Failed to load status'],
                status: 'Offline',
                connectionType: 'none',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Initial fetch only - no auto-refresh
    useEffect(() => {
        fetchStatus();

        // === C++ INTEGRATION POINT ===
        // Subscribe to real-time hardware updates:
        // RobotBridge.subscribeToStatusUpdates((newStatus) => {
        //   setStatus(newStatus);
        // });
        //
        // return () => {
        //   RobotBridge.unsubscribeFromStatusUpdates();
        // };
    }, [fetchStatus]);

    const onRefresh = useCallback(() => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setRefreshing(true);
        fetchStatus();
    }, [fetchStatus]);

    // Derived state
    const batteryLevel = status?.batteryLevel ?? 0;
    const isCleaning = status?.isCleaning ?? false;
    const isConnected = status?.connectionType !== 'none';
    const bColor = batteryColor(batteryLevel);

    if (loading && !status) {
        return <Loader message="Loading dashboard..." />;
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

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
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                    {/* Large Header - always visible, positioned higher */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Dashboard
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Monitor your Smart Cleaner Pro
                        </AppText>
                    </View>

                    {/* Robot Status Card - matches LoginScreen card styling */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.robotHeader}>
                            <View style={[
                                styles.robotAvatar,
                                {
                                    backgroundColor: isCleaning
                                        ? 'rgba(34,197,94,0.15)'
                                        : darkMode
                                            ? 'rgba(59,130,246,0.16)'
                                            : 'rgba(59,130,246,0.12)',
                                },
                            ]}>
                                <Ionicons
                                    name="hardware-chip"
                                    size={28}
                                    color={isCleaning ? '#22c55e' : colors.primary}
                                />
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
                                    if (Platform.OS === 'ios') {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }
                                    fetchStatus();
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                        {/* Battery Section */}
                        <View style={styles.batterySection}>
                            <View style={styles.batteryHeader}>
                                <View style={styles.batteryLabelRow}>
                                    <Ionicons name={batteryIcon(batteryLevel)} size={20} color={bColor} />
                                    <AppText style={[styles.fieldLabel, { color: textSecondary }]}>
                                        Battery Level
                                    </AppText>
                                </View>
                                <AppText style={[styles.batteryPercent, { color: bColor }]}>
                                    {batteryLevel}%
                                </AppText>
                            </View>
                            <BatteryBar level={batteryLevel} color={bColor} darkMode={darkMode} />
                        </View>

                        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                        {/* Connection Status */}
                        <View style={styles.connectionSection}>
                            <View style={styles.connectionRow}>
                                <View style={[
                                    styles.connectionDot,
                                    { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }
                                ]} />
                                <AppText style={[styles.connectionText, { color: textSecondary }]}>
                                    {isConnected
                                        ? `Connected via ${status?.connectionType.toUpperCase()}`
                                        : 'Not Connected'}
                                </AppText>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.connectionButton,
                                    {
                                        backgroundColor: darkMode
                                            ? 'rgba(59,130,246,0.16)'
                                            : 'rgba(59,130,246,0.12)',
                                    },
                                ]}
                                onPress={() => {
                                    // Navigate to Settings tab instead of non-existent route
                                    router.push('../settings/connection');
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="link-outline"
                                    size={18}
                                    color={colors.primary}
                                    style={{ marginRight: 10 }}
                                />
                                <AppText style={[styles.connectionButtonText, { color: colors.primary }]}>
                                    {isConnected ? 'Manage Connection' : 'Connect Robot'}
                                </AppText>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Quick Stats Row */}
                    <View style={styles.statsRow}>
                        {[
                            {
                                icon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap,
                                color: isCleaning ? '#22c55e' : '#94a3b8',
                                value: isCleaning ? 'Active' : 'Idle',
                                label: 'Status'
                            },
                            {
                                icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
                                color: '#a78bfa',
                                value: '2.4h',
                                label: 'Runtime'
                            },
                            {
                                icon: 'map-outline' as keyof typeof Ionicons.glyphMap,
                                color: '#fb923c',
                                value: '142m²',
                                label: 'This Week'
                            },
                        ].map((stat) => (
                            <View
                                key={stat.label}
                                style={[
                                    styles.statCard,
                                    { backgroundColor: cardBg, borderColor: cardBorder }
                                ]}
                            >
                                <Ionicons name={stat.icon} size={24} color={stat.color} />
                                <AppText style={[styles.statValue, { color: textPrimary }]}>
                                    {stat.value}
                                </AppText>
                                <AppText style={[styles.statLabel, { color: textSecondary }]}>
                                    {stat.label}
                                </AppText>
                            </View>
                        ))}
                    </View>

                    {/* Last Session Card */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons
                                name="calendar-outline"
                                size={18}
                                color={colors.primary}
                                style={{ marginRight: 8 }}
                            />
                            <AppText style={[styles.cardTitle, { color: textSecondary }]}>
                                Last Cleaning Session
                            </AppText>
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
                                <AppText style={styles.errorText}>
                                    {status.errors[0]}
                                </AppText>
                                {status.errors.length > 1 && (
                                    <AppText style={styles.errorCount}>
                                        +{status.errors.length - 1} more issue{status.errors.length - 1 !== 1 ? 's' : ''}
                                    </AppText>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Quick Actions Card */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons
                                name="flash-outline"
                                size={18}
                                color={colors.primary}
                                style={{ marginRight: 8 }}
                            />
                            <AppText style={[styles.cardTitle, { color: textSecondary }]}>
                                Quick Actions
                            </AppText>
                        </View>

                        <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: 16 }]} />

                        <View style={styles.actionsGrid}>
                            {[
                                {
                                    icon: 'game-controller-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Control',
                                    route: '/(tabs)/02_ControlScreen',
                                    color: '#6366f1'
                                },
                                {
                                    icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Schedule',
                                    route: '/(tabs)/04_ScheduleScreen',
                                    color: '#ec4899'
                                },
                                {
                                    icon: 'map-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Map',
                                    route: '/(tabs)/03_MapScreen',
                                    color: '#14b8a6'
                                },
                            ].map((action) => (
                                <TouchableOpacity
                                    key={action.label}
                                    style={[
                                        styles.actionButton,
                                        {
                                            backgroundColor: `${action.color}${darkMode ? '1a' : '12'}`,
                                            borderColor: `${action.color}30`,
                                        }
                                    ]}
                                    onPress={() => {
                                        if (Platform.OS === 'ios') {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }
                                        router.push(action.route);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={action.icon} size={24} color={action.color} />
                                    <AppText style={[styles.actionLabel, { color: textPrimary }]}>
                                        {action.label}
                                    </AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------------------
// Styles - Consistent with LoginScreen
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Scroll content
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 25, // Increased significantly so header sits higher / more premium spacing from top
        paddingBottom: 80,
    },
    scrollContentLarge: {
        alignItems: 'center',
    },

    wrapper: { width: '100%' },
    largeWrapper: { maxWidth: 480 },

    // Header section (large, always visible, positioned higher)
    headerSection: {
        marginBottom: 32, // Slightly more breathing room
    },
    headerTitle: {
        fontSize: 35,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0.1,
    },

    // Cards - matching LoginScreen styling
    card: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
    },

    // Robot status section
    robotHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    robotAvatar: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    robotInfo: {
        flex: 1,
    },
    robotName: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 6,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '500',
    },
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    divider: {
        height: 1,
        marginVertical: 20,
    },

    // Battery section
    batterySection: {
        marginBottom: 0,
    },
    batteryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    batteryLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    batteryPercent: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.2,
    },

    // Connection section
    connectionSection: {
        marginBottom: 0,
    },
    connectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    connectionDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    connectionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    connectionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: 14,
    },
    connectionButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },

    // Stats row
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        borderRadius: 18,
        paddingVertical: 20,
        paddingHorizontal: 8,
        alignItems: 'center',
        borderWidth: 1,
        gap: 8,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },

    // Card header
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    cardValue: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.2,
    },

    // Error banner
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(251,191,36,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.3)',
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
        gap: 12,
    },
    errorIconContainer: {
        marginTop: 2,
    },
    errorContent: {
        flex: 1,
    },
    errorText: {
        color: '#fbbf24',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    errorCount: {
        color: '#fbbf24',
        fontSize: 12,
        fontWeight: '400',
        opacity: 0.8,
    },

    // Actions grid
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 18,
        alignItems: 'center',
        gap: 10,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Footer
    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});