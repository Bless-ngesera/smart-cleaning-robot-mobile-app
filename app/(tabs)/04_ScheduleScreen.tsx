// app/(tabs)/04_ScheduleScreen.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    Alert,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import Header from '../../src/components/Header';
import Loader from '../../src/components/Loader';
import Button from '../../src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import { router } from 'expo-router';

type Entry = { id: string; day: string; time: string; enabled: boolean };

export default function ScheduleScreen() {
    const { colors } = useThemeContext();

    const [schedule, setSchedule] = useState<Entry[]>([]);
    const [history, setHistory] = useState<Entry[]>([]);
    const [day, setDay] = useState('');
    const [time, setTime] = useState('');
    const [busy, setBusy] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    /* ---------------- Validation ---------------- */
    const isValidInput = useMemo(() => {
        return day.trim().length > 0 && time.trim().length > 0;
    }, [day, time]);

    /* ---------------- Add New Routine ---------------- */
    const addSchedule = useCallback(() => {
        if (!isValidInput) {
            Alert.alert('Error', 'Please enter both day and time.');
            return;
        }

        const newEntry: Entry = {
            id: Date.now().toString(),
            day: day.trim(),
            time: time.trim(),
            enabled: true,
        };

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        setSchedule([...schedule, newEntry]);
        setDay('');
        setTime('');

        // === C++ BRIDGE: Send new schedule entry to robot ===
        // Android (JNI): RobotBridge.addSchedule(newEntry.day, newEntry.time)
        // iOS (Obj-C++): [RobotBridge addScheduleWithDay:newEntry.day time:newEntry.time]
        // Robot should store it and trigger cleaning at the specified time using sensors/cameras to adapt to current environment

        Alert.alert('Success', 'Routine added — robot will adapt to the environment using sensors & cameras!');

    }, [schedule, day, time, isValidInput]);

    /* ---------------- Toggle Routine ---------------- */
    const toggleRoutine = useCallback((id: string) => {
        Haptics.selectionAsync();

        setSchedule(
            schedule.map((item) =>
                item.id === id ? { ...item, enabled: !item.enabled } : item
            )
        );

        // === C++ BRIDGE: Toggle schedule enabled state on robot ===
        // Android (JNI): RobotBridge.toggleSchedule(id, newEnabled)
        // iOS (Obj-C++): [RobotBridge toggleScheduleWithId:id enabled:newEnabled]
    }, [schedule]);

    /* ---------------- Delete Single Routine ---------------- */
    const deleteRoutine = useCallback((id: string) => {
        const itemToDelete = schedule.find((item) => item.id === id);
        if (!itemToDelete) return;

        Alert.alert('Delete Routine', 'Remove this scheduled time?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                    setHistory([...history, { ...itemToDelete, enabled: false }]);
                    setSchedule(schedule.filter((item) => item.id !== id));

                    // === C++ BRIDGE: Delete schedule entry from robot ===
                    // Android (JNI): RobotBridge.deleteSchedule(id)
                    // iOS (Obj-C++): [RobotBridge deleteScheduleWithId:id]

                    Alert.alert('Success', 'Routine deleted');
                },
            },
        ]);
    }, [schedule, history]);

    /* ---------------- Sync From Robot ---------------- */
    const syncFromRobot = useCallback(async () => {
        setBusy(true);
        setLoadingMessage('Syncing schedule from robot...');

        try {
            // === C++ BRIDGE: Fetch current schedule from robot ===
            // Android (JNI): await RobotBridge.getSchedule()
            // iOS (Obj-C++): await [RobotBridge getSchedule]
            // Robot should return time-based routines — no room/area info needed (adapts via sensors/cameras)
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Mock response (replace with real C++ data)
            const synced = [
                { id: 's1', day: 'Monday', time: '09:00 AM', enabled: true },
                { id: 's2', day: 'Wednesday', time: '06:30 PM', enabled: false },
            ];

            setSchedule(synced);

            Alert.alert('Success', 'Schedule synced — robot will adapt to current environment!');
        } catch (err) {
            console.error('Sync failed:', err);
            Alert.alert('Error', 'Failed to sync schedule. Check robot connection.');
        } finally {
            setBusy(false);
        }
    }, []);

    /* ---------------- Clear All Routines ---------------- */
    const clearAllSchedules = useCallback(() => {
        if (schedule.length === 0) return;

        Alert.alert('Reset All', 'Clear every scheduled routine?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear All',
                style: 'destructive',
                onPress: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

                    setHistory([...history, ...schedule.map((s) => ({ ...s, enabled: false }))]);
                    setSchedule([]);

                    // === C++ BRIDGE: Clear all schedules on robot ===
                    // Android (JNI): RobotBridge.clearAllSchedules()
                    // iOS (Obj-C++): [RobotBridge clearAllSchedules]

                    Alert.alert('Success', 'All routines cleared');
                },
            },
        ]);
    }, [schedule, history]);

    /* ---------------- Next Scheduled Routine ---------------- */
    const nextRoutine = useMemo(() => {
        const enabled = schedule.filter((s) => s.enabled);
        return enabled.length > 0 ? enabled[0] : null;
    }, [schedule]);

    /* ---------------- Statistics ---------------- */
    const stats = useMemo(
        () => ({
            total: schedule.length,
            active: schedule.filter((s) => s.enabled).length,
            history: history.length,
        }),
        [schedule, history]
    );

    if (busy) {
        return <Loader message={loadingMessage} />;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Cleaning Schedule" subtitle="Time-based adaptive routines" />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Statistics Cards */}
                <View style={styles.statsContainer}>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIconContainer, { backgroundColor: `${colors.primary}20` }]}>
                            <Ionicons name="calendar" size={24} color={colors.primary} />
                        </View>
                        <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#10B98120' }]}>
                            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        </View>
                        <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.active}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#8B5CF620' }]}>
                            <Ionicons name="time" size={24} color="#8B5CF6" />
                        </View>
                        <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{stats.history}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>History</Text>
                    </View>
                </View>

                {/* Next Routine */}
                {nextRoutine && (
                    <View style={[styles.nextRoutineCard, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}>
                        <View style={styles.nextRoutineHeader}>
                            <View style={[styles.pulseIcon, { backgroundColor: colors.primary }]}>
                                <Ionicons name="flash" size={20} color="#fff" />
                            </View>
                            <Text style={[styles.nextRoutineTitle, { color: colors.primary }]}>Next Routine</Text>
                        </View>

                        <View style={styles.nextRoutineContent}>
                            <View style={styles.nextRoutineInfo}>
                                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                                <Text style={[styles.nextRoutineDay, { color: colors.text }]}>{nextRoutine.day}</Text>
                            </View>
                            <View style={styles.nextRoutineInfo}>
                                <Ionicons name="time-outline" size={18} color={colors.primary} />
                                <Text style={[styles.nextRoutineTime, { color: colors.text }]}>{nextRoutine.time}</Text>
                            </View>
                        </View>

                        <Text style={styles.nextRoutineNote}>
                            Robot will adapt to the current environment using sensors & cameras
                        </Text>
                    </View>
                )}

                {/* Sync Button */}
                <Button
                    title="Sync from Robot"
                    icon="sync-outline"
                    onPress={syncFromRobot}
                    variant="outline"
                    style={styles.syncButton}
                />

                {/* Active Schedule List */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <Ionicons name="list" size={20} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Routines</Text>
                        </View>

                        {schedule.length > 0 && (
                            <TouchableOpacity onPress={clearAllSchedules}>
                                <Text style={[styles.clearAllText, { color: '#EF4444' }]}>Clear All</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {schedule.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} opacity={0.3} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No routines yet</Text>
                            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                                Add a time-based routine — robot adapts automatically
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={schedule}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                            renderItem={({ item, index }) => (
                                <View
                                    style={[
                                        styles.routineItem,
                                        index < schedule.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                                    ]}
                                >
                                    <TouchableOpacity
                                        onPress={() => toggleRoutine(item.id)}
                                        style={styles.routineToggle}
                                    >
                                        <View
                                            style={[
                                                styles.checkbox,
                                                {
                                                    borderColor: item.enabled ? colors.primary : colors.border,
                                                    backgroundColor: item.enabled ? colors.primary : 'transparent',
                                                },
                                            ]}
                                        >
                                            {item.enabled && <Ionicons name="checkmark" size={16} color="#fff" />}
                                        </View>
                                    </TouchableOpacity>

                                    <View style={styles.routineContent}>
                                        <Text
                                            style={[
                                                styles.routineDay,
                                                { color: colors.text },
                                                !item.enabled && { opacity: 0.5 },
                                            ]}
                                        >
                                            {item.day}
                                        </Text>
                                        <View style={styles.routineTimeContainer}>
                                            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                                            <Text
                                                style={[
                                                    styles.routineTime,
                                                    { color: colors.textSecondary },
                                                    !item.enabled && { opacity: 0.5 },
                                                ]}
                                            >
                                                {item.time}
                                            </Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => deleteRoutine(item.id)}
                                        style={styles.deleteButton}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                    )}
                </View>

                {/* Add New Routine */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <Ionicons name="add-circle" size={20} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Add New Routine</Text>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputContainer}>
                            <Ionicons
                                name="calendar-outline"
                                size={20}
                                color={colors.textSecondary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                placeholder="Day (e.g., Monday)"
                                value={day}
                                onChangeText={setDay}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons
                                name="time-outline"
                                size={20}
                                color={colors.textSecondary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                placeholder="Time (e.g., 10:00 AM)"
                                value={time}
                                onChangeText={setTime}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                            />
                        </View>
                    </View>

                    <Button
                        title="Add Routine"
                        icon="add-outline"
                        onPress={addSchedule}
                        disabled={!isValidInput}
                        variant={isValidInput ? 'primary' : 'disabled'}
                    />
                </View>

                {/* History */}
                {history.length > 0 && (
                    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleContainer}>
                                <Ionicons name="archive" size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>History</Text>
                            </View>
                            <Text style={[styles.historyCount, { color: colors.textSecondary }]}>
                                {history.length} entries
                            </Text>
                        </View>

                        <FlatList
                            data={history.slice(-5).reverse()}
                            keyExtractor={(item, index) => `${item.id}-${index}`}
                            scrollEnabled={false}
                            renderItem={({ item }) => (
                                <View style={styles.historyItem}>
                                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                    <View style={styles.historyContent}>
                                        <Text style={[styles.historyDay, { color: colors.text }]}>{item.day}</Text>
                                        <Text style={[styles.historyTime, { color: colors.textSecondary }]}>{item.time}</Text>
                                    </View>
                                </View>
                            )}
                        />
                    </View>
                )}

                {/* Tip */}
                <View style={[styles.tipBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
                    <Ionicons name="bulb" size={20} color={colors.primary} />
                    <Text style={[styles.tipText, { color: colors.text }]}>
                        Routines are time-based only — robot uses sensors & cameras to intelligently adapt to any environment.
                    </Text>
                </View>

                {/* Quick Navigation */}
                <View style={styles.navSection}>
                    <Text style={[styles.navTitle, { color: colors.textSecondary }]}>Quick Navigation</Text>
                    <View style={styles.navButtons}>
                        <TouchableOpacity
                            style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => router.push('/(tabs)/01_DashboardScreen')}
                        >
                            <Ionicons name="grid" size={24} color={colors.primary} />
                            <Text style={[styles.navButtonText, { color: colors.text }]}>Dashboard</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => router.push('/(tabs)/02_ControlScreen')}
                        >
                            <Ionicons name="game-controller" size={24} color={colors.primary} />
                            <Text style={[styles.navButtonText, { color: colors.text }]}>Control</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => router.push('/(tabs)/03_MapScreen')}
                        >
                            <Ionicons name="map" size={24} color={colors.primary} />
                            <Text style={[styles.navButtonText, { color: colors.text }]}>Map</Text>
                        </TouchableOpacity>
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

    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
        marginTop: 8,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
    },

    nextRoutineCard: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        marginBottom: 20,
    },
    nextRoutineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    pulseIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextRoutineTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    nextRoutineContent: {
        gap: 12,
    },
    nextRoutineInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    nextRoutineDay: {
        fontSize: 18,
        fontWeight: '600',
    },
    nextRoutineTime: {
        fontSize: 16,
        fontWeight: '500',
    },
    nextRoutineNote: {
        marginTop: 12,
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
    },

    syncButton: {
        marginBottom: 20,
    },

    sectionCard: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    clearAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444',
    },

    emptyState: {
        alignItems: 'center',
        paddingVertical: 32,
        gap: 8,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 8,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: 'center',
    },

    routineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    routineToggle: {
        padding: 4,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    routineContent: {
        flex: 1,
        gap: 4,
    },
    routineDay: {
        fontSize: 16,
        fontWeight: '600',
    },
    routineTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    routineTime: {
        fontSize: 14,
    },
    deleteButton: {
        padding: 8,
    },

    inputGroup: {
        gap: 12,
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        left: 16,
        zIndex: 1,
    },
    input: {
        flex: 1,
        borderRadius: 12,
        padding: 14,
        paddingLeft: 48,
        fontSize: 15,
    },

    historyCount: {
        fontSize: 14,
        fontWeight: '500',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    historyContent: {
        flex: 1,
    },
    historyDay: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    historyTime: {
        fontSize: 13,
    },

    tipBox: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },

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
});