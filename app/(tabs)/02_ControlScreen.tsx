// app/(tabs)/02_ControlScreen.tsx
//
// ============================================================
// C++ INTEGRATION OVERVIEW
// ------------------------------------------------------------
// This file controls the robot through simulated actions.
// When you're ready to integrate real hardware via native C++ bridge:
//
//   1. Replace setTimeout delays with actual RobotBridge calls
//   2. Add real-time status updates from hardware
//   3. All C++ integration points are clearly marked below
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Platform,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import Loader from '../../src/components/Loader';
import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';
import { router } from 'expo-router';

// === C++ BRIDGE / TYPE DEFINITIONS ===
// For native robot control integration (JNI/Obj-C++):
// declare module 'react-native' {
//   interface NativeModulesStatic {
//     RobotBridge: {
//       startCleaning(mode: string): Promise<void>;
//       stopCleaning(): Promise<void>;
//       returnToDock(): Promise<void>;
//       move(direction: string): Promise<void>;
//       rotate(direction: string): Promise<void>;
//       setFanSpeed(speed: string): Promise<void>;
//       getRobotStatus(): Promise<{ isRunning: boolean }>;
//     }
//   }
// }

export default function ControlScreen() {
    const { colors, darkMode } = useThemeContext();

    const [busy, setBusy] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [cleaningMode, setCleaningMode] = useState<'auto' | 'spot' | 'edge'>('auto');
    const [fanSpeed, setFanSpeed] = useState<'quiet' | 'standard' | 'turbo'>('standard');
    const [manualMode, setManualMode] = useState(false);

    // Responsive design - same as Dashboard
    const { width } = Dimensions.get('window');
    const isLargeScreen = width >= 768;

    // Design tokens matching Dashboard
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';

    // === C++ BRIDGE / FETCH REAL ROBOT STATUS ===
    const fetchStatus = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) return;

            // === C++ INTEGRATION POINT ===
            // Get status from hardware: const status = await RobotBridge.getRobotStatus();
            // setIsRunning(status.isRunning);

            const { data, error } = await supabase
                .from('robot_status')
                .select('is_cleaning')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                setIsRunning(data.is_cleaning ?? false);
            }
        } catch (err) {
            console.error('[ControlScreen] fetchStatus error:', err);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    /* ---------------- Update Robot Status in Database - FIXED ---------------- */
    const updateRobotStatus = useCallback(async (isCleaning: boolean) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) return;

            const { error } = await supabase
                .from('robot_status')
                .upsert({
                    user_id: user.id,
                    is_cleaning: isCleaning,
                    battery_level: 85, // You can update this based on real data
                    status: isCleaning ? 'Online' : 'Offline',
                    connection_type: 'wifi',
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id',
                });

            if (error) throw error;
        } catch (err) {
            console.error('[ControlScreen] updateRobotStatus error:', err);
        }
    }, []);

    /* ---------------- Simulated / Real Robot Actions - FIXED ---------------- */
    const simulateAction = useCallback(
        async (
            message: string,
            log: string,
            errorMsg: string,
            onSuccess?: () => void
        ) => {
            setBusy(true);
            setLoadingMessage(message);

            try {
                console.log('[ControlScreen]', log);

                // === C++ BRIDGE: Replace this delay with real RobotBridge call ===
                // Android (JNI): await RobotBridge.startCleaning(cleaningMode) / stopCleaning() / returnToDock()
                // iOS (Obj-C++): await [RobotBridge startCleaning:cleaningMode] / [RobotBridge stopCleaning] / [RobotBridge returnToDock]
                await new Promise((resolve) => setTimeout(resolve, 1200));

                if (onSuccess) onSuccess();

                // Add haptic feedback on success
                if (Platform.OS === 'ios') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                Alert.alert('Success', message.replace('...', ' completed!'));

                // Refresh real status after action
                await fetchStatus();
            } catch (err: any) {
                console.error('[ControlScreen]', log, 'failed:', err);

                if (Platform.OS === 'ios') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }

                Alert.alert('Error', errorMsg);
            } finally {
                setBusy(false);
                setLoadingMessage('');
            }
        },
        [fetchStatus]
    );

    /* ---------------- Primary Control Actions - FIXED ---------------- */
    const handleStartCleaning = useCallback(() => {
        if (busy || isRunning || manualMode) return;

        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        simulateAction(
            'Starting intelligent cleaning...',
            `Start cleaning in ${cleaningMode} mode`,
            'Failed to start cleaning.',
            async () => {
                setIsRunning(true);
                await updateRobotStatus(true);
            }
        );
    }, [busy, isRunning, manualMode, cleaningMode, simulateAction, updateRobotStatus]);

    const handleStopCleaning = useCallback(() => {
        if (busy || !isRunning) return;

        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        simulateAction(
            'Stopping cleaning...',
            'Stop cleaning',
            'Failed to stop cleaning.',
            async () => {
                setIsRunning(false);
                await updateRobotStatus(false);
            }
        );
    }, [busy, isRunning, simulateAction, updateRobotStatus]);

    const handleReturnToDock = useCallback(() => {
        if (busy) return;

        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        simulateAction(
            'Returning to dock...',
            'Return to dock',
            'Failed to dock robot.',
            async () => {
                setIsRunning(false);
                setManualMode(false);
                await updateRobotStatus(false);
            }
        );
    }, [busy, simulateAction, updateRobotStatus]);

    /* ---------------- Manual Control Actions - FIXED ---------------- */
    const handleManualMove = useCallback((direction: 'forward' | 'backward' | 'left' | 'right' | 'stop') => {
        if (busy || !manualMode) return;

        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        console.log('[ControlScreen] Manual move command:', direction);

        // === C++ BRIDGE: Send real-time movement command to robot ===
        // Android (JNI): await RobotBridge.move(direction)
        // iOS (Obj-C++): await [RobotBridge move:direction]

        // Show brief feedback without blocking UI
        const directionLabel = direction.charAt(0).toUpperCase() + direction.slice(1);
        // Alert removed for smoother UX - just log the action
        console.log(`[ControlScreen] Moving: ${directionLabel}`);
    }, [busy, manualMode]);

    const handleRotate = useCallback((direction: 'left' | 'right') => {
        if (busy || !manualMode) return;

        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        console.log('[ControlScreen] Manual rotate command:', direction);

        // === C++ BRIDGE: Send real-time rotation command to robot ===
        // Android (JNI): await RobotBridge.rotate(direction)
        // iOS (Obj-C++): await [RobotBridge rotate:direction]

        console.log(`[ControlScreen] Rotating: ${direction}`);
    }, [busy, manualMode]);

    /* ---------------- Handle Mode/Speed Changes - FIXED ---------------- */
    const handleModeChange = useCallback((mode: 'auto' | 'spot' | 'edge') => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        setCleaningMode(mode);
        console.log('[ControlScreen] Cleaning mode changed to:', mode);

        // === C++ INTEGRATION POINT ===
        // Update hardware mode: await RobotBridge.setCleaningMode(mode);
    }, []);

    const handleFanSpeedChange = useCallback((speed: 'quiet' | 'standard' | 'turbo') => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        setFanSpeed(speed);
        console.log('[ControlScreen] Fan speed changed to:', speed);

        // === C++ INTEGRATION POINT ===
        // Update hardware fan speed: await RobotBridge.setFanSpeed(speed);
    }, []);

    const handleManualModeToggle = useCallback(() => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        const newManualMode = !manualMode;

        if (newManualMode && isRunning) {
            Alert.alert(
                'Stop Cleaning First',
                'Please stop the automatic cleaning before enabling manual mode.',
                [{ text: 'OK' }]
            );
            return;
        }

        setManualMode(newManualMode);
        console.log('[ControlScreen] Manual mode:', newManualMode ? 'enabled' : 'disabled');

        // === C++ INTEGRATION POINT ===
        // Enable/disable manual mode: await RobotBridge.setManualMode(newManualMode);
    }, [manualMode, isRunning]);

    if (busy) {
        return <Loader message={loadingMessage} />;
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.scrollContentLarge,
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                    {/* Large Header - same as Dashboard */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Control Robot
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Manage cleaning operations
                        </AppText>
                    </View>

                    {/* Status Banner */}
                    <View
                        style={[
                            styles.statusBanner,
                            {
                                backgroundColor: isRunning ? `${colors.primary}15` : cardBg,
                                borderColor: isRunning ? colors.primary : cardBorder,
                            },
                        ]}
                    >
                        <View style={styles.statusBannerContent}>
                            <View
                                style={[
                                    styles.statusIconContainer,
                                    { backgroundColor: isRunning ? `${colors.primary}30` : cardBorder },
                                ]}
                            >
                                <Ionicons
                                    name={isRunning ? 'flash' : 'pause'}
                                    size={24}
                                    color={isRunning ? colors.primary : textSecondary}
                                />
                            </View>

                            <View style={styles.statusInfo}>
                                <AppText style={[styles.statusTitle, { color: textPrimary }]}>
                                    Robot Status
                                </AppText>
                                <AppText
                                    style={[
                                        styles.statusValue,
                                        { color: isRunning ? colors.primary : textSecondary },
                                    ]}
                                >
                                    {manualMode ? 'Manual Control Active' : isRunning ? 'Cleaning in Progress' : 'Idle'}
                                </AppText>
                            </View>
                        </View>

                        {(isRunning || manualMode) && (
                            <View style={styles.statusBadge}>
                                <View style={[styles.pulsingDot, { backgroundColor: colors.primary }]} />
                            </View>
                        )}
                    </View>

                    {/* Primary Controls */}
                    <View style={[styles.controlCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleContainer}>
                                <Ionicons name="game-controller" size={20} color={colors.primary} />
                                <AppText style={[styles.cardTitle, { color: textPrimary }]}>
                                    Primary Controls
                                </AppText>
                            </View>
                        </View>

                        <View style={styles.primaryControls}>
                            <TouchableOpacity
                                style={[
                                    styles.primaryButton,
                                    styles.startButton,
                                    (isRunning || manualMode) && styles.buttonDisabled,
                                ]}
                                onPress={handleStartCleaning}
                                disabled={isRunning || manualMode}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.primaryButtonIcon, { backgroundColor: '#10B981' }]}>
                                    <Ionicons name="play" size={32} color="#fff" />
                                </View>
                                <AppText style={[styles.primaryButtonText, { color: textPrimary }]}>
                                    Start Adaptive Cleaning
                                </AppText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.primaryButton,
                                    styles.stopButton,
                                    !isRunning && styles.buttonDisabled,
                                ]}
                                onPress={handleStopCleaning}
                                disabled={!isRunning}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.primaryButtonIcon, { backgroundColor: '#EF4444' }]}>
                                    <Ionicons name="stop" size={32} color="#fff" />
                                </View>
                                <AppText style={[styles.primaryButtonText, { color: textPrimary }]}>
                                    Stop Cleaning
                                </AppText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.primaryButton, styles.dockButton]}
                                onPress={handleReturnToDock}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.primaryButtonIcon, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="home" size={32} color="#fff" />
                                </View>
                                <AppText style={[styles.primaryButtonText, { color: textPrimary }]}>
                                    Return to Dock
                                </AppText>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Cleaning Modes */}
                    <View style={[styles.controlCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleContainer}>
                                <Ionicons name="options" size={20} color={colors.primary} />
                                <AppText style={[styles.cardTitle, { color: textPrimary }]}>
                                    Cleaning Mode
                                </AppText>
                            </View>
                        </View>

                        <View style={styles.modeOptions}>
                            {(['auto', 'spot', 'edge'] as const).map((mode) => (
                                <TouchableOpacity
                                    key={mode}
                                    style={[
                                        styles.modeButton,
                                        {
                                            backgroundColor: cardBg,
                                            borderColor: cleaningMode === mode ? colors.primary : cardBorder,
                                        },
                                        cleaningMode === mode && { backgroundColor: `${colors.primary}15` },
                                    ]}
                                    onPress={() => handleModeChange(mode)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={mode === 'auto' ? 'infinite' : mode === 'spot' ? 'locate' : 'grid'}
                                        size={24}
                                        color={cleaningMode === mode ? colors.primary : textSecondary}
                                    />
                                    <AppText
                                        style={[
                                            styles.modeButtonText,
                                            { color: cleaningMode === mode ? colors.primary : textPrimary },
                                        ]}
                                    >
                                        {mode === 'auto'
                                            ? 'Auto (Adaptive)'
                                            : mode.charAt(0).toUpperCase() + mode.slice(1)}
                                    </AppText>
                                    {cleaningMode === mode && (
                                        <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                                            <Ionicons name="checkmark" size={12} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <AppText style={[styles.modeDescription, { color: textSecondary }]}>
                            {cleaningMode === 'auto'
                                ? 'Robot uses sensors and cameras to intelligently map and clean the entire space.'
                                : cleaningMode === 'spot'
                                    ? 'Focus on a specific dirty area detected by sensors.'
                                    : 'Clean along walls and edges using edge-detection sensors.'}
                        </AppText>
                    </View>

                    {/* Fan Speed */}
                    <View style={[styles.controlCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleContainer}>
                                <Ionicons name="speedometer" size={20} color={colors.primary} />
                                <AppText style={[styles.cardTitle, { color: textPrimary }]}>
                                    Suction Power
                                </AppText>
                            </View>
                        </View>

                        <View style={styles.speedOptions}>
                            {(['quiet', 'standard', 'turbo'] as const).map((speed) => (
                                <TouchableOpacity
                                    key={speed}
                                    style={[
                                        styles.speedButton,
                                        {
                                            backgroundColor: cardBg,
                                            borderColor: fanSpeed === speed ? colors.primary : cardBorder,
                                        },
                                        fanSpeed === speed && { backgroundColor: `${colors.primary}15` },
                                    ]}
                                    onPress={() => handleFanSpeedChange(speed)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={
                                            speed === 'quiet'
                                                ? 'volume-low'
                                                : speed === 'standard'
                                                    ? 'volume-medium'
                                                    : 'volume-high'
                                        }
                                        size={28}
                                        color={fanSpeed === speed ? colors.primary : textSecondary}
                                    />
                                    <AppText
                                        style={[
                                            styles.speedButtonText,
                                            { color: fanSpeed === speed ? colors.primary : textPrimary },
                                        ]}
                                    >
                                        {speed.charAt(0).toUpperCase() + speed.slice(1)}
                                    </AppText>
                                    <AppText style={[styles.speedSubtext, { color: textSecondary }]}>
                                        {speed === 'quiet' ? 'Low noise' : speed === 'standard' ? 'Balanced' : 'Max power'}
                                    </AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Manual Controls */}
                    <View style={[styles.controlCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleContainer}>
                                <Ionicons name="navigate" size={20} color={colors.primary} />
                                <AppText style={[styles.cardTitle, { color: textPrimary }]}>
                                    Manual Controls
                                </AppText>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.manualToggle,
                                    {
                                        backgroundColor: manualMode ? colors.primary : cardBg,
                                        borderColor: cardBorder,
                                    },
                                ]}
                                onPress={handleManualModeToggle}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={manualMode ? 'toggle' : 'toggle-outline'}
                                    size={24}
                                    color={manualMode ? '#fff' : textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        {manualMode ? (
                            <View style={styles.joystickContainer}>
                                <View style={styles.joystickGrid}>
                                    <View style={styles.joystickRow}>
                                        <View style={styles.joystickEmpty} />
                                        <TouchableOpacity
                                            style={[styles.directionButton, { backgroundColor: `${colors.primary}20` }]}
                                            onPress={() => handleManualMove('forward')}
                                            activeOpacity={0.6}
                                        >
                                            <Ionicons name="arrow-up" size={32} color={colors.primary} />
                                        </TouchableOpacity>
                                        <View style={styles.joystickEmpty} />
                                    </View>

                                    <View style={styles.joystickRow}>
                                        <TouchableOpacity
                                            style={[styles.directionButton, { backgroundColor: `${colors.primary}20` }]}
                                            onPress={() => handleManualMove('left')}
                                            activeOpacity={0.6}
                                        >
                                            <Ionicons name="arrow-back" size={32} color={colors.primary} />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.centerButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
                                            onPress={() => handleManualMove('stop')}
                                            activeOpacity={0.6}
                                        >
                                            <Ionicons name="stop-circle" size={32} color={colors.primary} />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.directionButton, { backgroundColor: `${colors.primary}20` }]}
                                            onPress={() => handleManualMove('right')}
                                            activeOpacity={0.6}
                                        >
                                            <Ionicons name="arrow-forward" size={32} color={colors.primary} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.joystickRow}>
                                        <View style={styles.joystickEmpty} />
                                        <TouchableOpacity
                                            style={[styles.directionButton, { backgroundColor: `${colors.primary}20` }]}
                                            onPress={() => handleManualMove('backward')}
                                            activeOpacity={0.6}
                                        >
                                            <Ionicons name="arrow-down" size={32} color={colors.primary} />
                                        </TouchableOpacity>
                                        <View style={styles.joystickEmpty} />
                                    </View>
                                </View>

                                <View style={styles.rotationControls}>
                                    <TouchableOpacity
                                        style={[styles.rotationButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
                                        onPress={() => handleRotate('left')}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="arrow-undo" size={24} color={colors.primary} />
                                        <AppText style={[styles.rotationText, { color: textPrimary }]}>Left</AppText>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.rotationButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
                                        onPress={() => handleRotate('right')}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="arrow-redo" size={24} color={colors.primary} />
                                        <AppText style={[styles.rotationText, { color: textPrimary }]}>Right</AppText>
                                    </TouchableOpacity>
                                </View>

                                <View style={[styles.manualInfo, { backgroundColor: `${colors.primary}10` }]}>
                                    <Ionicons name="information-circle" size={16} color={colors.primary} />
                                    <AppText style={[styles.manualInfoText, { color: textPrimary }]}>
                                        Use joystick to manually navigate. Robot adapts to obstacles via sensors & cameras.
                                    </AppText>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.comingSoonContainer}>
                                <View style={[styles.joystickPlaceholder, { borderColor: cardBorder }]}>
                                    <Ionicons name="radio-button-on" size={48} color={textSecondary} style={{ opacity: 0.3 }} />
                                </View>
                                <AppText style={[styles.comingSoonText, { color: textSecondary }]}>
                                    Enable manual mode
                                </AppText>
                                <AppText style={[styles.comingSoonSubtext, { color: textSecondary }]}>
                                    Toggle the switch above to access directional controls
                                </AppText>
                            </View>
                        )}
                    </View>

                    {/* Quick Navigation */}
                    <View style={styles.navSection}>
                        <AppText style={[styles.navTitle, { color: textSecondary }]}>
                            Quick Navigation
                        </AppText>
                        <View style={styles.navButtons}>
                            <TouchableOpacity
                                style={[styles.navButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
                                onPress={() => {
                                    if (Platform.OS === 'ios') {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }
                                    router.push('/(tabs)/01_DashboardScreen');
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="grid" size={24} color={colors.primary} />
                                <AppText style={[styles.navButtonText, { color: textPrimary }]}>Dashboard</AppText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.navButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
                                onPress={() => {
                                    if (Platform.OS === 'ios') {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }
                                    router.push('/(tabs)/04_ScheduleScreen');
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="calendar" size={24} color={colors.primary} />
                                <AppText style={[styles.navButtonText, { color: textPrimary }]}>Schedule</AppText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.navButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
                                onPress={() => {
                                    if (Platform.OS === 'ios') {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }
                                    router.push('/(tabs)/03_MapScreen');
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="map" size={24} color={colors.primary} />
                                <AppText style={[styles.navButtonText, { color: textPrimary }]}>Map</AppText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Footer - same as Dashboard */}
                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*                               Styles                                    */
/* ──────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
    container: { flex: 1 },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 25,
        paddingBottom: 80,
    },
    scrollContentLarge: {
        alignItems: 'center',
    },

    wrapper: { width: '100%' },
    largeWrapper: { maxWidth: 480 },

    headerSection: {
        marginBottom: 32,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0.1,
    },

    // Cards - same as Dashboard
    controlCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },

    // Manual toggle
    manualToggle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Status Banner
    statusBanner: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
    },
    statusBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusInfo: { flex: 1 },
    statusTitle: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    statusValue: {
        fontSize: 17,
        fontWeight: '700',
    },
    statusBadge: {
        position: 'absolute',
        top: 20,
        right: 20,
    },
    pulsingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },

    // Primary Controls
    primaryControls: {
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 16,
    },
    startButton: {
        backgroundColor: '#10B98115',
    },
    stopButton: {
        backgroundColor: '#EF444415',
    },
    dockButton: {
        backgroundColor: '#3B82F615',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    primaryButtonIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },

    // Mode Options
    modeOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    modeButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        gap: 8,
        position: 'relative',
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    selectedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeDescription: {
        marginTop: 12,
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
    },

    // Speed Options
    speedOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    speedButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        gap: 6,
    },
    speedButtonText: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
    },
    speedSubtext: {
        fontSize: 11,
        fontWeight: '500',
    },

    // Manual Controls
    joystickContainer: {
        gap: 20,
    },
    joystickGrid: {
        alignItems: 'center',
        gap: 8,
    },
    joystickRow: {
        flexDirection: 'row',
        gap: 8,
    },
    joystickEmpty: {
        width: 70,
        height: 70,
    },
    directionButton: {
        width: 70,
        height: 70,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    rotationControls: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    rotationButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    rotationText: {
        fontSize: 14,
        fontWeight: '600',
    },
    manualInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    manualInfoText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 16,
    },

    comingSoonContainer: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 8,
    },
    joystickPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    comingSoonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    comingSoonSubtext: {
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 20,
    },

    // Quick Navigation
    navSection: {
        marginTop: 8,
    },
    navTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    navButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    navButton: {
        flex: 1,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        alignItems: 'center',
        gap: 8,
    },
    navButtonText: {
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