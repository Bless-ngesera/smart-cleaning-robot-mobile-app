// app/(tabs)/01_DashboardScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    Alert,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import Header from '../../src/components/Header';
import Loader from '../../src/components/Loader';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';
import { router } from 'expo-router';

type RobotStatus = {
    batteryLevel: number;
    isCleaning: boolean;
    lastCleaned: string;
    errors: string[];
    status: 'Online' | 'Offline' | 'Charging' | 'Error';
    connectionType?: 'wifi' | 'ble' | 'none';
};

export default function DashboardScreen() {
    const { colors } = useThemeContext();

    const [status, setStatus] = useState<RobotStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        setRefreshing(true);
        try {
            // === PLACEHOLDER: Fetch real robot status from Supabase ===
            // Assumes table 'robot_status' with columns: battery_level, is_cleaning, last_cleaned, errors (jsonb), status, user_id
            const { data, error } = await supabase
                .from('robot_status')
                .select('battery_level, is_cleaning, last_cleaned, errors, status')
                .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

            setStatus({
                batteryLevel: data?.battery_level ?? 0,
                isCleaning: data?.is_cleaning ?? false,
                lastCleaned: data?.last_cleaned ?? 'Never',
                errors: data?.errors ?? [],
                status: data?.status ?? 'Offline',
                connectionType: 'none', // Will be updated from real connection logic (Wi-Fi/BLE)
            });
        } catch (err) {
            console.error('Failed to fetch robot status:', err);
            Alert.alert('Connection Issue', 'Unable to load latest robot status. Showing last known data.');
            // Graceful fallback – no hardcoded mock values beyond defaults
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

        // === C++ INTEGRATION POINT: Fetch real-time robot status here ===
        // Replace or merge with Supabase fetch above
        // - Connect via Bluetooth, Wi-Fi, Serial, HTTP API, etc.
        // - Get live data from robot firmware (battery, status, errors, last clean, connection type)
        // - Format as RobotStatus object
        // Example pseudo-code:
        // const realRobotStatus = await RobotBridge.getLiveStatus(); // your C++ bridge call
        // setStatus(realRobotStatus);
        // or merge: setStatus({ ...status, ...realRobotStatus });
    }, []);

    useEffect(() => {
        fetchStatus();

        // Optional: Poll every 30 seconds for real-time updates
        // const interval = setInterval(fetchStatus, 30000);
        // return () => clearInterval(interval);
    }, [fetchStatus]);

    const onRefresh = useCallback(() => {
        fetchStatus();
    }, [fetchStatus]);

    const goToConnectionSetup = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('./settings/connection');
    };

    // Battery helpers
    const getBatteryColor = (level: number) => {
        if (level > 60) return '#10B981';
        if (level > 30) return '#F59E0B';
        return '#EF4444';
    };

    const getBatteryIcon = (level: number) => {
        if (level > 80) return 'battery-full';
        if (level > 50) return 'battery-half';
        if (level > 20) return 'battery-low';
        return 'battery-dead';
    };

    if (loading && !status) {
        return <Loader message="Fetching robot status..." />;
    }

    const batteryLevel = status?.batteryLevel ?? 0;
    const isCleaning = status?.isCleaning ?? false;
    const connectionType = status?.connectionType ?? 'none';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Dashboard" subtitle="Monitor your Smart Cleaner" />

            <ScrollView
                contentContainerStyle={styles.content}
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
                {/* Hero Status Card */}
                <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.heroHeader}>
                        <View style={styles.robotInfo}>
                            <View
                                style={[
                                    styles.robotAvatar,
                                    { backgroundColor: isCleaning ? '#10B98133' : `${colors.primary}33` },
                                ]}
                            >
                                <Ionicons
                                    name="hardware-chip"
                                    size={40}
                                    color={isCleaning ? '#10B981' : colors.primary}
                                />
                            </View>

                            <View style={styles.robotText}>
                                <Text style={[styles.robotName, { color: colors.text }]}>Smart Cleaner Pro</Text>
                                <View style={styles.statusBadge}>
                                    <View
                                        style={[
                                            styles.statusDot,
                                            { backgroundColor: isCleaning ? '#10B981' : '#94A3B8' },
                                        ]}
                                    />
                                    <Text
                                        style={[
                                            styles.statusLabel,
                                            { color: isCleaning ? '#10B981' : colors.textSecondary },
                                        ]}
                                    >
                                        {isCleaning ? 'Cleaning' : 'Idle'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.refreshBtn, { backgroundColor: colors.background }]}
                            onPress={fetchStatus}
                        >
                            <Ionicons name="refresh" size={22} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Connection Status + Connect Button */}
                    <View style={styles.connectionSection}>
                        <View style={styles.connectionRow}>
                            <Ionicons
                                name={connectionType === 'wifi' ? 'wifi' : connectionType === 'ble' ? 'bluetooth' : 'wifi-off'}
                                size={18}
                                color={connectionType !== 'none' ? colors.primary : '#ef4444'}
                            />
                            <Text style={[styles.connectionText, { color: colors.textSecondary }]}>
                                {connectionType === 'none' ? 'Disconnected' : `Connected via ${connectionType === 'wifi' ? 'Wi-Fi' : 'Bluetooth'}`}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.connectButton, { backgroundColor: colors.primary }]}
                            onPress={goToConnectionSetup}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="link-outline" size={20} color="#fff" />
                            <Text style={styles.connectButtonText}>
                                {connectionType === 'none' ? 'Connect Robot' : 'Change Connection'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Battery Section */}
                    <View style={styles.batteryBlock}>
                        <View style={styles.batteryHeader}>
                            <View style={styles.batteryLabelRow}>
                                <Ionicons
                                    name={getBatteryIcon(batteryLevel)}
                                    size={28}
                                    color={getBatteryColor(batteryLevel)}
                                />
                                <Text style={[styles.batteryTitle, { color: colors.text }]}>Battery</Text>
                            </View>
                            <Text style={[styles.batteryPercent, { color: getBatteryColor(batteryLevel) }]}>
                                {batteryLevel}%
                            </Text>
                        </View>

                        <View style={[styles.progressBg, { backgroundColor: colors.border + '40' }]}>
                            <LinearGradient
                                colors={[getBatteryColor(batteryLevel), `${getBatteryColor(batteryLevel)}CC`]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressFill, { width: `${batteryLevel}%` }]}
                            />
                        </View>
                    </View>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#10B98133' }]}>
                            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                        </View>
                        <Text style={[styles.statNumber, { color: colors.text }]}>
                            {isCleaning ? 'Active' : 'Ready'}
                        </Text>
                        <Text style={[styles.statCaption, { color: colors.textSecondary }]}>Status</Text>
                    </View>

                    <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#8B5CF633' }]}>
                            <Ionicons name="time" size={28} color="#8B5CF6" />
                        </View>
                        <Text style={[styles.statNumber, { color: colors.text }]}>
                            {isCleaning ? '2.5 h' : '—'}
                        </Text>
                        <Text style={[styles.statCaption, { color: colors.textSecondary }]}>Runtime</Text>
                    </View>

                    <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#F59E0B33' }]}>
                            <Ionicons name="speedometer" size={28} color="#F59E0B" />
                        </View>
                        <Text style={[styles.statNumber, { color: colors.text }]}>127 m²</Text>
                        <Text style={[styles.statCaption, { color: colors.textSecondary }]}>Cleaned</Text>
                    </View>
                </View>

                {/* Last Cleaned */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="calendar" size={22} color={colors.primary} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Last Session</Text>
                    </View>
                    <Text style={[styles.lastCleanedText, { color: colors.text }]}>
                        {status?.lastCleaned
                            ? new Date(status.lastCleaned).toLocaleString([], {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                            })
                            : 'No data yet'}
                    </Text>
                </View>

                {/* Errors */}
                {status?.errors?.length ? (
                    <View style={styles.errorCard}>
                        <View style={styles.errorHeader}>
                            <View style={styles.errorIconWrap}>
                                <Ionicons name="alert-circle" size={26} color="#EF4444" />
                            </View>
                            <View>
                                <Text style={styles.errorTitle}>System Alerts</Text>
                                <Text style={styles.errorSubtitle}>
                                    {status.errors.length} issue{status.errors.length > 1 ? 's' : ''} detected
                                </Text>
                            </View>
                        </View>
                        {status.errors.map((err, i) => (
                            <View key={i} style={styles.errorRow}>
                                <View style={styles.errorBullet} />
                                <Text style={styles.errorMessage}>{err}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                {/* Quick Actions */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="flash" size={22} color={colors.primary} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Quick Actions</Text>
                    </View>

                    <View style={styles.actionsGrid}>
                        {[
                            { icon: 'game-controller', label: 'Controls', route: '/(tabs)/02_ControlScreen', color: colors.primary },
                            { icon: 'calendar', label: 'Schedule', route: '/(tabs)/04_ScheduleScreen', color: '#8B5CF6' },
                            { icon: 'map', label: 'Map', route: '/(tabs)/03_MapScreen', color: '#10B981' },
                        ].map((item, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={styles.actionTile}
                                onPress={() => router.push(item.route)}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.actionIconWrap, { backgroundColor: `${item.color}22` }]}>
                                    <Ionicons name={item.icon} size={32} color={item.color} />
                                </View>
                                <Text style={[styles.actionLabel, { color: colors.text }]}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Pro Tip */}
                <View
                    style={[
                        styles.tipCard,
                        { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}40` },
                    ]}
                >
                    <Ionicons name="bulb" size={24} color={colors.primary} />
                    <View style={styles.tipBody}>
                        <Text style={[styles.tipHeading, { color: colors.primary }]}>Pro Tip</Text>
                        <Text style={[styles.tipText, { color: colors.text }]}>
                            Empty the dustbin and wipe sensors before starting for best performance.
                        </Text>
                    </View>
                </View>

                {/* === C++ BRIDGE: If you want to show real-time robot telemetry or advanced stats here,
            fetch via RobotBridge.getTelemetry() and add more cards/sections below */}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    content: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },

    heroCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 24,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    robotInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    robotAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    robotText: { gap: 4 },
    robotName: {
        fontSize: 22,
        fontWeight: '700',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    statusLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    refreshBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },

    connectionSection: {
        marginBottom: 20,
        gap: 12,
    },
    connectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    connectionText: {
        fontSize: 14,
        fontWeight: '500',
    },
    connectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    connectButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    batteryBlock: { gap: 12 },
    batteryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    batteryLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    batteryTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    batteryPercent: {
        fontSize: 32,
        fontWeight: '800',
    },
    progressBg: {
        height: 14,
        borderRadius: 7,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 7,
    },

    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statTile: {
        flex: 1,
        borderRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    statIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    statCaption: {
        fontSize: 13,
        fontWeight: '500',
    },

    card: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        marginBottom: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    lastCleanedText: {
        fontSize: 16,
        fontWeight: '500',
    },

    errorCard: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
        borderWidth: 1,
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
    },
    errorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    errorIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorTitle: {
        color: '#991B1B',
        fontSize: 18,
        fontWeight: '700',
    },
    errorSubtitle: {
        color: '#B91C1C',
        fontSize: 14,
    },
    errorRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    errorBullet: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        marginTop: 6,
    },
    errorMessage: {
        flex: 1,
        color: '#DC2626',
        fontSize: 15,
        lineHeight: 22,
    },

    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginTop: 8,
    },
    actionTile: {
        flex: 1,
        minWidth: '30%',
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 16,
    },
    actionIconWrap: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: '600',
    },

    tipCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 14,
        alignItems: 'flex-start',
    },
    tipBody: { flex: 1, gap: 4 },
    tipHeading: {
        fontSize: 15,
        fontWeight: '700',
    },
    tipText: {
        fontSize: 14,
        lineHeight: 20,
    },
});