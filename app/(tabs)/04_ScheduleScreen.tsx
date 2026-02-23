// app/(tabs)/04_ScheduleScreen.tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View,
    FlatList,
    Alert,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

import Loader from '../../src/components/Loader';
import AppText from '../../src/components/AppText';
import Button from '../../src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';
import { router } from 'expo-router';

// === C++ BRIDGE / TYPE DEFINITIONS ===
// For native schedule management integration (JNI/Obj-C++):
// interface RobotBridge {
//   syncScheduleToHardware(schedules: Entry[]): Promise<void>;
//   getHardwareSchedule(): Promise<Entry[]>;
// }

type Entry = { id: string; day: string; time: string; enabled: boolean };

export default function ScheduleScreen() {
    const { colors, darkMode } = useThemeContext();

    const [schedule, setSchedule] = useState<Entry[]>([]);
    const [history, setHistory] = useState<Entry[]>([]);
    const [busy, setBusy] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    // Picker states - FIXED: Using proper state management
    const [showDayPicker, setShowDayPicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedDayDate, setSelectedDayDate] = useState<Date>(new Date());
    const [selectedTimeDate, setSelectedTimeDate] = useState<Date>(new Date());

    // Track if user has selected values
    const [daySelected, setDaySelected] = useState(false);
    const [timeSelected, setTimeSelected] = useState(false);

    // Format selected values for display
    const selectedDay = daySelected
        ? selectedDayDate.toLocaleDateString('en-US', { weekday: 'long' })
        : '';
    const selectedTime = timeSelected
        ? selectedTimeDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        })
        : '';

    // Same as Dashboard
    const { width } = Dimensions.get('window');
    const isLargeScreen = width >= 768;

    // Design tokens matching Dashboard
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    /* ---------------- Real Supabase Fetch ---------------- */
    const fetchSchedule = useCallback(async () => {
        setBusy(true);
        setLoadingMessage('Syncing schedule from robot...');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Not authenticated');

            // === C++ INTEGRATION POINT ===
            // Sync from hardware: const hwSchedule = await RobotBridge.getHardwareSchedule();

            const { data, error } = await supabase
                .from('schedules')
                .select('id, day, time, enabled')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            setSchedule(data || []);
        } catch (err: any) {
            console.error('[ScheduleScreen] Sync failed:', err);
            Alert.alert('Sync Error', 'Unable to fetch schedule from robot.');
        } finally {
            setBusy(false);
        }
    }, []);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    /* ---------------- Add New Routine (with Calendar & Clock) - FIXED ---------------- */
    const addSchedule = useCallback(async () => {
        if (!daySelected || !timeSelected) {
            Alert.alert('Missing Information', 'Please select both day and time.');
            return;
        }

        const newEntry: Entry = {
            id: Date.now().toString(),
            day: selectedDay,
            time: selectedTime,
            enabled: true,
        };

        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        setBusy(true);
        setLoadingMessage('Adding routine to robot...');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('schedules')
                .insert({
                    user_id: user.id,
                    day: newEntry.day,
                    time: newEntry.time,
                    enabled: newEntry.enabled,
                });

            if (error) throw error;

            // === C++ INTEGRATION POINT ===
            // Sync to hardware: await RobotBridge.syncScheduleToHardware([...schedule, newEntry]);

            setSchedule([...schedule, newEntry]);

            // Reset pickers after success
            setDaySelected(false);
            setTimeSelected(false);
            setSelectedDayDate(new Date());
            setSelectedTimeDate(new Date());

            Alert.alert('Success', 'Routine added successfully! Robot will adapt using sensors & cameras.');
        } catch (err: any) {
            console.error('[ScheduleScreen] Add failed:', err);
            Alert.alert('Error', err.message || 'Failed to add routine.');
        } finally {
            setBusy(false);
        }
    }, [schedule, selectedDay, selectedTime, daySelected, timeSelected]);

    /* ---------------- Toggle Routine - FIXED ---------------- */
    const toggleRoutine = useCallback(async (id: string) => {
        if (Platform.OS === 'ios') {
            Haptics.selectionAsync();
        }

        const item = schedule.find((s) => s.id === id);
        if (!item) return;

        const newEnabled = !item.enabled;

        // Optimistically update UI
        const updatedSchedule = schedule.map((s) =>
            s.id === id ? { ...s, enabled: newEnabled } : s
        );
        setSchedule(updatedSchedule);

        try {
            const { error } = await supabase
                .from('schedules')
                .update({ enabled: newEnabled })
                .eq('id', id);

            if (error) throw error;

            // === C++ INTEGRATION POINT ===
            // Sync to hardware: await RobotBridge.syncScheduleToHardware(updatedSchedule);

        } catch (err: any) {
            console.error('[ScheduleScreen] Toggle failed:', err);
            // Revert on error
            setSchedule(schedule);
            Alert.alert('Error', 'Failed to update routine.');
        }
    }, [schedule]);

    /* ---------------- Delete Single Routine - FIXED ---------------- */
    const deleteRoutine = useCallback(async (id: string) => {
        const itemToDelete = schedule.find((item) => item.id === id);
        if (!itemToDelete) return;

        Alert.alert('Delete Routine', 'Remove this scheduled time?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }

                    setBusy(true);
                    setLoadingMessage('Deleting routine...');

                    try {
                        const { error } = await supabase
                            .from('schedules')
                            .delete()
                            .eq('id', id);

                        if (error) throw error;

                        const updatedSchedule = schedule.filter((item) => item.id !== id);

                        // === C++ INTEGRATION POINT ===
                        // Sync to hardware: await RobotBridge.syncScheduleToHardware(updatedSchedule);

                        setHistory([...history, { ...itemToDelete, enabled: false }]);
                        setSchedule(updatedSchedule);

                        Alert.alert('Success', 'Routine deleted successfully');
                    } catch (err: any) {
                        console.error('[ScheduleScreen] Delete failed:', err);
                        Alert.alert('Error', 'Failed to delete routine.');
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    }, [schedule, history]);

    /* ---------------- Clear All Routines - FIXED ---------------- */
    const clearAllSchedules = useCallback(async () => {
        if (schedule.length === 0) return;

        Alert.alert('Reset All', 'Clear every scheduled routine?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear All',
                style: 'destructive',
                onPress: async () => {
                    if (Platform.OS === 'ios') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    }

                    setBusy(true);
                    setLoadingMessage('Clearing all routines...');

                    try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user?.id) throw new Error('Not authenticated');

                        const { error } = await supabase
                            .from('schedules')
                            .delete()
                            .eq('user_id', user.id);

                        if (error) throw error;

                        // === C++ INTEGRATION POINT ===
                        // Clear hardware schedule: await RobotBridge.syncScheduleToHardware([]);

                        setHistory([...history, ...schedule.map((s) => ({ ...s, enabled: false }))]);
                        setSchedule([]);

                        Alert.alert('Success', 'All routines cleared successfully');
                    } catch (err: any) {
                        console.error('[ScheduleScreen] Clear all failed:', err);
                        Alert.alert('Error', 'Failed to clear routines.');
                    } finally {
                        setBusy(false);
                    }
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

    /* ---------------- Handle Day Picker - FIXED ---------------- */
    const handleDayChange = useCallback((event: any, selectedDate?: Date) => {
        // FIXED: Proper handling for both iOS and Android
        const currentDate = selectedDate || selectedDayDate;

        if (Platform.OS === 'android') {
            setShowDayPicker(false);
        }

        if (event.type === 'set' && selectedDate) {
            setSelectedDayDate(selectedDate);
            setDaySelected(true);
            if (Platform.OS === 'ios') {
                setShowDayPicker(false);
            }
        } else if (event.type === 'dismissed') {
            setShowDayPicker(false);
        }
    }, [selectedDayDate]);

    /* ---------------- Handle Time Picker - FIXED ---------------- */
    const handleTimeChange = useCallback((event: any, selectedDate?: Date) => {
        // FIXED: Proper handling for both iOS and Android
        const currentDate = selectedDate || selectedTimeDate;

        if (Platform.OS === 'android') {
            setShowTimePicker(false);
        }

        if (event.type === 'set' && selectedDate) {
            setSelectedTimeDate(selectedDate);
            setTimeSelected(true);
            if (Platform.OS === 'ios') {
                setShowTimePicker(false);
            }
        } else if (event.type === 'dismissed') {
            setShowTimePicker(false);
        }
    }, [selectedTimeDate]);

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
                    {/* Large Header */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Cleaning Schedule
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Time-based adaptive routines
                        </AppText>
                    </View>

                    {/* Statistics Cards */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={[styles.statIconContainer, { backgroundColor: `${colors.primary}20` }]}>
                                <Ionicons name="calendar" size={24} color={colors.primary} />
                            </View>
                            <AppText style={[styles.statValue, { color: colors.primary }]}>
                                {stats.total}
                            </AppText>
                            <AppText style={[styles.statLabel, { color: textSecondary }]}>
                                Total
                            </AppText>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#10B98120' }]}>
                                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                            </View>
                            <AppText style={[styles.statValue, { color: '#10B981' }]}>
                                {stats.active}
                            </AppText>
                            <AppText style={[styles.statLabel, { color: textSecondary }]}>
                                Active
                            </AppText>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#8B5CF620' }]}>
                                <Ionicons name="time" size={24} color="#8B5CF6" />
                            </View>
                            <AppText style={[styles.statValue, { color: '#8B5CF6' }]}>
                                {stats.history}
                            </AppText>
                            <AppText style={[styles.statLabel, { color: textSecondary }]}>
                                History
                            </AppText>
                        </View>
                    </View>

                    {/* Next Routine */}
                    {nextRoutine && (
                        <View style={[styles.nextRoutineCard, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}>
                            <View style={styles.nextRoutineHeader}>
                                <View style={[styles.pulseIcon, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="flash" size={20} color="#fff" />
                                </View>
                                <AppText style={[styles.nextRoutineTitle, { color: colors.primary }]}>
                                    Next Routine
                                </AppText>
                            </View>

                            <View style={styles.nextRoutineContent}>
                                <View style={styles.nextRoutineInfo}>
                                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                                    <AppText style={[styles.nextRoutineDay, { color: textPrimary }]}>
                                        {nextRoutine.day}
                                    </AppText>
                                </View>
                                <View style={styles.nextRoutineInfo}>
                                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                                    <AppText style={[styles.nextRoutineTime, { color: textPrimary }]}>
                                        {nextRoutine.time}
                                    </AppText>
                                </View>
                            </View>

                            <AppText style={[styles.nextRoutineNote, { color: textSecondary }]}>
                                Robot will adapt to the current environment using sensors & cameras
                            </AppText>
                        </View>
                    )}

                    {/* Sync Button */}
                    <Button
                        title="Sync from Robot"
                        icon="sync-outline"
                        onPress={fetchSchedule}
                        variant="outline"
                        style={styles.syncButton}
                    />

                    {/* Add New Routine - Premium Picker Section - FIXED */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleContainer}>
                                <Ionicons name="add-circle" size={20} color={colors.primary} />
                                <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                    Add New Routine
                                </AppText>
                            </View>
                        </View>

                        <View style={styles.pickerGroup}>
                            <TouchableOpacity
                                style={[
                                    styles.pickerButton,
                                    {
                                        borderColor: daySelected ? colors.primary : cardBorder,
                                        backgroundColor: cardBg,
                                    }
                                ]}
                                onPress={() => {
                                    if (Platform.OS === 'ios') {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }
                                    setShowDayPicker(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="calendar-outline"
                                    size={20}
                                    color={daySelected ? colors.primary : textSecondary}
                                />
                                <AppText style={[
                                    styles.pickerButtonText,
                                    { color: daySelected ? textPrimary : textSecondary }
                                ]}>
                                    {selectedDay || 'Select Day'}
                                </AppText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.pickerButton,
                                    {
                                        borderColor: timeSelected ? colors.primary : cardBorder,
                                        backgroundColor: cardBg,
                                    }
                                ]}
                                onPress={() => {
                                    if (Platform.OS === 'ios') {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }
                                    setShowTimePicker(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="time-outline"
                                    size={20}
                                    color={timeSelected ? colors.primary : textSecondary}
                                />
                                <AppText style={[
                                    styles.pickerButtonText,
                                    { color: timeSelected ? textPrimary : textSecondary }
                                ]}>
                                    {selectedTime || 'Select Time'}
                                </AppText>
                            </TouchableOpacity>
                        </View>

                        <Button
                            title="Add Routine"
                            icon="add-outline"
                            onPress={addSchedule}
                            disabled={!daySelected || !timeSelected}
                            variant={daySelected && timeSelected ? 'primary' : 'disabled'}
                        />
                    </View>

                    {/* Active Schedule List */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleContainer}>
                                <Ionicons name="list" size={20} color={colors.primary} />
                                <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                    Active Routines
                                </AppText>
                            </View>

                            {schedule.length > 0 && (
                                <TouchableOpacity onPress={clearAllSchedules} activeOpacity={0.7}>
                                    <AppText style={[styles.clearAllText, { color: '#EF4444' }]}>
                                        Clear All
                                    </AppText>
                                </TouchableOpacity>
                            )}
                        </View>

                        {schedule.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="calendar-outline" size={48} color={textSecondary} style={{ opacity: 0.3 }} />
                                <AppText style={[styles.emptyText, { color: textSecondary }]}>
                                    No routines yet
                                </AppText>
                                <AppText style={[styles.emptySubtext, { color: textSecondary }]}>
                                    Add a time-based routine — robot adapts automatically
                                </AppText>
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
                                            index < schedule.length - 1 && { borderBottomWidth: 1, borderBottomColor: dividerColor },
                                        ]}
                                    >
                                        <TouchableOpacity
                                            onPress={() => toggleRoutine(item.id)}
                                            style={styles.routineToggle}
                                            activeOpacity={0.7}
                                        >
                                            <View
                                                style={[
                                                    styles.checkbox,
                                                    {
                                                        borderColor: item.enabled ? colors.primary : cardBorder,
                                                        backgroundColor: item.enabled ? colors.primary : 'transparent',
                                                    },
                                                ]}
                                            >
                                                {item.enabled && <Ionicons name="checkmark" size={16} color="#fff" />}
                                            </View>
                                        </TouchableOpacity>

                                        <View style={styles.routineContent}>
                                            <AppText
                                                style={[
                                                    styles.routineDay,
                                                    { color: textPrimary },
                                                    !item.enabled && { opacity: 0.5 },
                                                ]}
                                            >
                                                {item.day}
                                            </AppText>
                                            <View style={styles.routineTimeContainer}>
                                                <Ionicons name="time-outline" size={14} color={textSecondary} />
                                                <AppText
                                                    style={[
                                                        styles.routineTime,
                                                        { color: textSecondary },
                                                        !item.enabled && { opacity: 0.5 },
                                                    ]}
                                                >
                                                    {item.time}
                                                </AppText>
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            onPress={() => deleteRoutine(item.id)}
                                            style={styles.deleteButton}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                        )}
                    </View>

                    {/* History */}
                    {history.length > 0 && (
                        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionTitleContainer}>
                                    <Ionicons name="archive" size={20} color={colors.primary} />
                                    <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                        History
                                    </AppText>
                                </View>
                                <AppText style={[styles.historyCount, { color: textSecondary }]}>
                                    {history.length} entries
                                </AppText>
                            </View>

                            <FlatList
                                data={history.slice(-5).reverse()}
                                keyExtractor={(item, index) => `${item.id}-${index}`}
                                scrollEnabled={false}
                                renderItem={({ item }) => (
                                    <View style={styles.historyItem}>
                                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                        <View style={styles.historyContent}>
                                            <AppText style={[styles.historyDay, { color: textPrimary }]}>
                                                {item.day}
                                            </AppText>
                                            <AppText style={[styles.historyTime, { color: textSecondary }]}>
                                                {item.time}
                                            </AppText>
                                        </View>
                                    </View>
                                )}
                            />
                        </View>
                    )}

                    {/* Tip */}
                    <View style={[styles.tipBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
                        <Ionicons name="bulb" size={20} color={colors.primary} />
                        <AppText style={[styles.tipText, { color: textPrimary }]}>
                            Routines are time-based only — robot uses sensors & cameras to intelligently adapt to any environment.
                        </AppText>
                    </View>

                    {/* Quick Links - matching Dashboard */}
                    <View style={[styles.actionsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.actionsHeader}>
                            <AppText style={[styles.actionsTitle, { color: textPrimary }]}>
                                Quick Links
                            </AppText>
                        </View>

                        <View style={styles.actionsGrid}>
                            {[
                                {
                                    icon: 'grid-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Dashboard',
                                    route: '/(tabs)/01_DashboardScreen',
                                    color: '#6366f1'
                                },
                                {
                                    icon: 'game-controller-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Control',
                                    route: '/(tabs)/02_ControlScreen',
                                    color: '#10B981'
                                },
                                {
                                    icon: 'map-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Map',
                                    route: '/(tabs)/03_MapScreen',
                                    color: '#14b8a6'
                                },
                            ].map((item) => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[
                                        styles.actionTile,
                                        {
                                            backgroundColor: `${item.color}${darkMode ? '1a' : '12'}`,
                                            borderColor: `${item.color}30`,
                                        }
                                    ]}
                                    onPress={() => {
                                        if (Platform.OS === 'ios') {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }
                                        router.push(item.route);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={item.icon} size={24} color={item.color} />
                                    <AppText style={[styles.actionLabel, { color: textPrimary }]}>
                                        {item.label}
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

            {/* Day Picker (Calendar) - FIXED */}
            {showDayPicker && (
                <DateTimePicker
                    value={selectedDayDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={handleDayChange}
                />
            )}

            {/* Time Picker (Clock) - FIXED */}
            {showTimePicker && (
                <DateTimePicker
                    value={selectedTimeDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 120,
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

    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        borderRadius: 18,
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
        marginBottom: 12,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
    },

    nextRoutineCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
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
        textAlign: 'center',
    },

    syncButton: {
        marginBottom: 20,
    },

    sectionCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
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
        fontWeight: '700',
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

    pickerGroup: {
        gap: 12,
        marginBottom: 16,
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    pickerButtonText: {
        fontSize: 16,
        fontWeight: '500',
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

    actionsCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
    },
    actionsHeader: {
        marginBottom: 16,
    },
    actionsTitle: {
        fontSize: 18,
        fontWeight: '700',
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
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});