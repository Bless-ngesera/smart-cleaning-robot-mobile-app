// app/(tabs)/02_ControlScreen.tsx
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import Header from '../../src/components/Header';
import Loader from '../../src/components/Loader';
import { useThemeContext } from '@/src/context/ThemeContext';
import { router } from 'expo-router';

export default function ControlScreen() {
    const { colors, darkMode } = useThemeContext();

    const [busy, setBusy] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [cleaningMode, setCleaningMode] = useState<'auto' | 'spot' | 'edge'>('auto');
    const [fanSpeed, setFanSpeed] = useState<'quiet' | 'standard' | 'turbo'>('standard');
    const [manualMode, setManualMode] = useState(false);

    /* ---------------- Simulated Robot Actions ---------------- */
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
                console.log(log);
                // C++ BRIDGE: Replace with real RobotBridge calls
                await new Promise((resolve) => setTimeout(resolve, 1200));
                if (onSuccess) onSuccess();
                Alert.alert('Success', message.replace('...', ' completed!'));
            } catch {
                Alert.alert('Error', errorMsg);
            } finally {
                setBusy(false);
            }
        },
        []
    );

    const handleStartCleaning = () =>
        simulateAction(
            'Starting cleaning...',
            'Start cleaning (mock)',
            'Failed to start cleaning.',
            () => setIsRunning(true)
        );

    const handleStopCleaning = () =>
        simulateAction(
            'Stopping cleaning...',
            'Stop cleaning (mock)',
            'Failed to stop cleaning.',
            () => setIsRunning(false)
        );

    const handleReturnToDock = () =>
        simulateAction(
            'Returning to dock...',
            'Return to dock (mock)',
            'Failed to dock robot.',
            () => setIsRunning(false)
        );

    /* ---------------- Manual Control Actions ---------------- */
    const handleManualMove = (direction: string) => {
        console.log(`Moving ${direction}`);
        // C++ BRIDGE: RobotBridge.move(direction)
        Alert.alert('Manual Move', `Moving ${direction}`, [{ text: 'OK' }]);
    };

    const handleRotate = (direction: 'left' | 'right') => {
        console.log(`Rotating ${direction}`);
        // C++ BRIDGE: RobotBridge.rotate(direction)
        Alert.alert('Manual Rotate', `Rotating ${direction}`, [{ text: 'OK' }]);
    };

    if (busy) {
        return <Loader message={loadingMessage} />;
    }

    /* --------------------------- UI --------------------------- */
    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Header title="Control Robot" subtitle="Manage cleaning operations" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    {/* Status Banner */}
                    <View
                        style={[
                            styles.statusBanner,
                            {
                                backgroundColor: isRunning ? `${colors.primary}15` : colors.card,
                                borderColor: isRunning ? colors.primary : colors.border,
                            },
                        ]}
                    >
                        <View style={styles.statusBannerContent}>
                            <View
                                style={[
                                    styles.statusIconContainer,
                                    { backgroundColor: isRunning ? `${colors.primary}30` : colors.textSecondary + '30' },
                                ]}
                            >
                                <Ionicons
                                    name={isRunning ? 'flash' : 'pause'}
                                    size={24}
                                    color={isRunning ? colors.primary : colors.textSecondary}
                                />
                            </View>

                            <View style={styles.statusInfo}>
                                <Text style={[styles.statusTitle, { color: colors.text }]}>Robot Status</Text>
                                <Text
                                    style={[
                                        styles.statusValue,
                                        { color: isRunning ? colors.primary : colors.textSecondary },
                                    ]}
                                >
                                    {manualMode ? 'Manual Mode' : isRunning ? 'Cleaning Active' : 'Idle'}
                                </Text>
                            </View>
                        </View>

                        {(isRunning || manualMode) && (
                            <View style={styles.statusBadge}>
                                <View style={[styles.pulsingDot, { backgroundColor: colors.primary }]} />
                            </View>
                        )}
                    </View>

                    {/* Primary Controls */}
                    <View style={[styles.controlCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleContainer}>
                                <Ionicons name="game-controller" size={20} color={colors.primary} />
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Primary Controls</Text>
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
                                <Text style={styles.primaryButtonText}>Start Cleaning</Text>
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
                                <Text style={styles.primaryButtonText}>Stop Cleaning</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.primaryButton, styles.dockButton]}
                                onPress={handleReturnToDock}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.primaryButtonIcon, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="home" size={32} color="#fff" />
                                </View>
                                <Text style={styles.primaryButtonText}>Return to Dock</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Cleaning Modes */}
                    <View style={[styles.controlCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleContainer}>
                                <Ionicons name="options" size={20} color={colors.primary} />
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Cleaning Mode</Text>
                            </View>
                        </View>

                        <View style={styles.modeOptions}>
                            {['auto', 'spot', 'edge'].map((mode) => (
                                <TouchableOpacity
                                    key={mode}
                                    style={[
                                        styles.modeButton,
                                        {
                                            backgroundColor: colors.background,
                                            borderColor: cleaningMode === mode ? colors.primary : colors.border,
                                        },
                                        cleaningMode === mode && { backgroundColor: `${colors.primary}15` },
                                    ]}
                                    onPress={() => setCleaningMode(mode as any)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={mode === 'auto' ? 'infinite' : mode === 'spot' ? 'locate' : 'grid'}
                                        size={24}
                                        color={cleaningMode === mode ? colors.primary : colors.textSecondary}
                                    />
                                    <Text
                                        style={[
                                            styles.modeButtonText,
                                            { color: cleaningMode === mode ? colors.primary : colors.text },
                                        ]}
                                    >
                                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                    </Text>
                                    {cleaningMode === mode && (
                                        <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                                            <Ionicons name="checkmark" size={12} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Fan Speed */}
                    <View style={[styles.controlCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleContainer}>
                                <Ionicons name="speedometer" size={20} color={colors.primary} />
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Suction Power</Text>
                            </View>
                        </View>

                        <View style={styles.speedOptions}>
                            {['quiet', 'standard', 'turbo'].map((speed) => (
                                <TouchableOpacity
                                    key={speed}
                                    style={[
                                        styles.speedButton,
                                        {
                                            backgroundColor: colors.background,
                                            borderColor: fanSpeed === speed ? colors.primary : colors.border,
                                        },
                                        fanSpeed === speed && { backgroundColor: `${colors.primary}15` },
                                    ]}
                                    onPress={() => setFanSpeed(speed as any)}
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
                                        color={fanSpeed === speed ? colors.primary : colors.textSecondary}
                                    />
                                    <Text
                                        style={[
                                            styles.speedButtonText,
                                            { color: fanSpeed === speed ? colors.primary : colors.text },
                                        ]}
                                    >
                                        {speed.charAt(0).toUpperCase() + speed.slice(1)}
                                    </Text>
                                    <Text style={[styles.speedSubtext, { color: colors.textSecondary }]}>
                                        {speed === 'quiet' ? 'Low noise' : speed === 'standard' ? 'Balanced' : 'Max power'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Manual Controls */}
                    <View style={[styles.controlCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleContainer}>
                                <Ionicons name="navigate" size={20} color={colors.primary} />
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Manual Controls</Text>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.manualToggle,
                                    {
                                        backgroundColor: manualMode ? colors.primary : colors.background,
                                        borderColor: colors.border,
                                    },
                                ]}
                                onPress={() => setManualMode(!manualMode)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={manualMode ? 'toggle' : 'toggle-outline'}
                                    size={24}
                                    color={manualMode ? '#fff' : colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        {manualMode ? (
                            <View style={styles.joystickContainer}>
                                {/* Directional Pad */}
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
                                            style={[styles.centerButton, { backgroundColor: colors.background, borderColor: colors.border }]}
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

                                {/* Rotation */}
                                <View style={styles.rotationControls}>
                                    <TouchableOpacity
                                        style={[styles.rotationButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                                        onPress={() => handleRotate('left')}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="arrow-undo" size={24} color={colors.primary} />
                                        <Text style={[styles.rotationText, { color: colors.text }]}>Left</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.rotationButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                                        onPress={() => handleRotate('right')}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="arrow-redo" size={24} color={colors.primary} />
                                        <Text style={[styles.rotationText, { color: colors.text }]}>Right</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Manual Info */}
                                <View style={[styles.manualInfo, { backgroundColor: `${colors.primary}10` }]}>
                                    <Ionicons name="information-circle" size={16} color={colors.primary} />
                                    <Text style={[styles.manualInfoText, { color: colors.text }]}>
                                        Use directional controls to manually navigate your robot
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.comingSoonContainer}>
                                <View style={[styles.joystickPlaceholder, { borderColor: colors.border }]}>
                                    <Ionicons name="radio-button-on" size={48} color={colors.textSecondary} opacity={0.3} />
                                </View>
                                <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
                                    Enable manual mode
                                </Text>
                                <Text style={[styles.comingSoonSubtext, { color: colors.textSecondary }]}>
                                    Toggle the switch above to access directional controls
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Quick Navigation */}
                    <View style={styles.navSection}>
                        <Text style={[styles.navTitle, { color: colors.textSecondary }]}>Quick Navigation</Text>
                        <View style={styles.navButtons}>
                            <TouchableOpacity
                                style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => router.push('/(tabs)/01_DashboardScreen')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="grid" size={24} color={colors.primary} />
                                <Text style={[styles.navButtonText, { color: colors.text }]}>Dashboard</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => router.push('/(tabs)/04_ScheduleScreen')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="calendar" size={24} color={colors.primary} />
                                <Text style={[styles.navButtonText, { color: colors.text }]}>Schedule</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => router.push('/(tabs)/03_MapScreen')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="map" size={24} color={colors.primary} />
                                <Text style={[styles.navButtonText, { color: colors.text }]}>Map</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*                               Styles                                    */
/* ──────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    content: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },

    /* Status Banner */
    statusBanner: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        marginBottom: 20,
        marginTop: 8,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    statusBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
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
        fontSize: 18,
        fontWeight: '700',
    },
    statusBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    pulsingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10B981',
    },

    /* Control Cards */
    controlCard: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
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
    manualToggle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },

    /* Primary Controls */
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
        color: '#1F2937',
    },

    /* Mode Options */
    modeOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    modeButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
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

    /* Speed Options */
    speedOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    speedButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
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

    /* Joystick Controls */
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
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    centerButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
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

    /* Coming Soon */
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

    /* Tip Card */
    tipCard: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    tipContent: {
        flex: 1,
    },
    tipText: {
        fontSize: 14,
        lineHeight: 20,
    },

    /* Navigation */
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
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    navButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
});