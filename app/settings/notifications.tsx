// app/settings/notifications.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Switch,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    useWindowDimensions,
    Platform,
    StatusBar,
    Animated,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';

const STORAGE_KEY = 'notificationPreferences';

// Toast Message Interface
interface ToastMessage {
    id: string;
    text: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

type NotifPrefs = {
    cleaningComplete: boolean;
    scheduleReminders: boolean;
    batteryAlerts: boolean;
    robotOffline: boolean;
    errorAlerts: boolean;
    weeklyReport: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
    cleaningComplete: true,
    scheduleReminders: true,
    batteryAlerts: true,
    robotOffline: true,
    errorAlerts: true,
    weeklyReport: false,
};

type NotifItem = {
    key: keyof NotifPrefs;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
};

const NOTIF_ITEMS: NotifItem[] = [
    {
        key: 'cleaningComplete',
        title: 'Cleaning Complete',
        subtitle: 'Notify when a cleaning session finishes',
        icon: 'checkmark-circle-outline',
        color: '#10B981',
    },
    {
        key: 'scheduleReminders',
        title: 'Schedule Reminders',
        subtitle: 'Remind before a scheduled cleaning starts',
        icon: 'calendar-outline',
        color: '#3B82F6',
    },
    {
        key: 'batteryAlerts',
        title: 'Battery Alerts',
        subtitle: 'Alert when battery drops below 20%',
        icon: 'battery-half-outline',
        color: '#F59E0B',
    },
    {
        key: 'robotOffline',
        title: 'Robot Offline',
        subtitle: 'Notify when the robot loses connection',
        icon: 'wifi-outline',
        color: '#EF4444',
    },
    {
        key: 'errorAlerts',
        title: 'Error Alerts',
        subtitle: 'Alert when the robot encounters an error',
        icon: 'warning-outline',
        color: '#EF4444',
    },
    {
        key: 'weeklyReport',
        title: 'Weekly Report',
        subtitle: 'Get a weekly summary of cleaning activity',
        icon: 'bar-chart-outline',
        color: '#8B5CF6',
    },
];

export default function NotificationsScreen() {
    const { back } = useAppNavigation();
    const { colors, darkMode } = useThemeContext();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const toastAnimations = useRef<{ [key: string]: Animated.Value }>({});

    // Design tokens
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : '#1a1a2e';
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    const successColor = '#10B981';
    const errorColor = '#EF4444';
    const warningColor = '#F59E0B';
    const infoColor = '#3B82F6';

    // Show toast at TOP
    const showToast = useCallback((text: string, type: ToastMessage['type']) => {
        const id = Date.now().toString();
        const fadeAnim = new Animated.Value(0);
        const slideAnim = new Animated.Value(-100);
        
        toastAnimations.current[id] = fadeAnim;
        
        setToasts(prev => [...prev, { id, text, type }]);
        
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
        ]).start();
        
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
            ]).start(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
                delete toastAnimations.current[id];
            });
        }, 5000);
    }, []);

    // Load saved preferences
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const saved = await AsyncStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setPrefs({ ...DEFAULT_PREFS, ...parsed });
                    showToast('Notification preferences loaded', 'success');
                }
            } catch (error) {
                console.error('Failed to load notification preferences:', error);
                showToast('Failed to load preferences, using defaults', 'warning');
            } finally {
                setLoaded(true);
            }
        };

        loadPreferences();
    }, []);

    // Save preferences to AsyncStorage
    const savePreferences = useCallback(async (newPrefs: NotifPrefs) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
            return true;
        } catch (error) {
            console.error('Failed to save notification preferences:', error);
            return false;
        }
    }, []);

    // Toggle preference with save
    const toggle = useCallback(async (key: keyof NotifPrefs) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        
        setSaving(true);
        const saved = await savePreferences(updated);
        setSaving(false);
        
        const notificationName = NOTIF_ITEMS.find(item => item.key === key)?.title;
        if (saved) {
            showToast(
                `${notificationName} ${updated[key] ? 'enabled' : 'disabled'}`,
                updated[key] ? 'success' : 'info'
            );
        } else {
            // Revert on failure
            setPrefs(prefs);
            showToast(`Failed to ${updated[key] ? 'enable' : 'disable'} ${notificationName}`, 'error');
        }
    }, [prefs, savePreferences, showToast]);

    // Reset all preferences to default
    const resetToDefaults = useCallback(() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        Alert.alert(
            'Reset Preferences',
            'Reset all notification preferences to default values?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        setSaving(true);
                        const saved = await savePreferences(DEFAULT_PREFS);
                        if (saved) {
                            setPrefs(DEFAULT_PREFS);
                            showToast('All preferences reset to defaults', 'success');
                        } else {
                            showToast('Failed to reset preferences', 'error');
                        }
                        setSaving(false);
                    },
                },
            ]
        );
    }, [savePreferences, showToast]);

    // Enable all notifications
    const enableAll = useCallback(async () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        
        const allEnabled: NotifPrefs = {
            cleaningComplete: true,
            scheduleReminders: true,
            batteryAlerts: true,
            robotOffline: true,
            errorAlerts: true,
            weeklyReport: true,
        };
        
        setSaving(true);
        const saved = await savePreferences(allEnabled);
        if (saved) {
            setPrefs(allEnabled);
            showToast('All notifications enabled', 'success');
        } else {
            showToast('Failed to enable all notifications', 'error');
        }
        setSaving(false);
    }, [savePreferences, showToast]);

    // Disable all notifications
    const disableAll = useCallback(async () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        
        Alert.alert(
            'Disable All',
            'Disable all notifications? You can re-enable them individually later.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disable All',
                    style: 'destructive',
                    onPress: async () => {
                        const allDisabled: NotifPrefs = {
                            cleaningComplete: false,
                            scheduleReminders: false,
                            batteryAlerts: false,
                            robotOffline: false,
                            errorAlerts: false,
                            weeklyReport: false,
                        };
                        
                        setSaving(true);
                        const saved = await savePreferences(allDisabled);
                        if (saved) {
                            setPrefs(allDisabled);
                            showToast('All notifications disabled', 'info');
                        } else {
                            showToast('Failed to disable all notifications', 'error');
                        }
                        setSaving(false);
                    },
                },
            ]
        );
    }, [savePreferences, showToast]);

    // Get enabled count
    const enabledCount = Object.values(prefs).filter(v => v === true).length;
    const totalCount = Object.keys(prefs).length;

    // Render toast messages
    const renderToasts = () => {
        const statusBarHeight = StatusBar.currentHeight || (Platform.OS === 'ios' ? 47 : 0);
        
        return toasts.map((toast, index) => {
            const toastColor = toast.type === 'success' ? successColor : toast.type === 'error' ? errorColor : toast.type === 'warning' ? warningColor : infoColor;
            const fadeAnim = toastAnimations.current[toast.id] || new Animated.Value(1);
            
            return (
                <Animated.View
                    key={toast.id}
                    style={[
                        styles.toast,
                        {
                            backgroundColor: toastColor,
                            top: statusBarHeight + 10 + (index * 70),
                            left: 16,
                            right: 16,
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <Ionicons
                        name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'alert-circle' : toast.type === 'warning' ? 'warning' : 'information-circle'}
                        size={22}
                        color="#fff"
                    />
                    <AppText style={styles.toastText}>{toast.text}</AppText>
                    <TouchableOpacity
                        onPress={() => {
                            const anim = toastAnimations.current[toast.id];
                            if (anim) {
                                Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
                                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                                    delete toastAnimations.current[toast.id];
                                });
                            }
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={18} color="rgba(255,255,255,0.9)" />
                    </TouchableOpacity>
                </Animated.View>
            );
        });
    };

    if (!loaded) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
                <View style={styles.loadingContainer}>
                    <AppText style={{ color: textSecondary }}>Loading preferences...</AppText>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
            
            {renderToasts()}

            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.scrollContentLarge,
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                    {/* Back Navigation */}
                    <TouchableOpacity style={styles.backButton} onPress={() => back()} activeOpacity={0.7}>
                        <Ionicons name="chevron-back" size={28} color={colors.primary} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Notifications
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Manage alerts and reminders
                        </AppText>
                    </View>

                    {/* Notification Summary */}
                    <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.summaryContent}>
                            <View style={styles.summaryStats}>
                                <AppText style={[styles.summaryCount, { color: colors.primary }]}>
                                    {enabledCount}/{totalCount}
                                </AppText>
                                <AppText style={[styles.summaryLabel, { color: textSecondary }]}>
                                    Notifications Enabled
                                </AppText>
                            </View>
                            <View style={styles.summaryActions}>
                                <TouchableOpacity
                                    style={[styles.summaryBtn, { backgroundColor: `${successColor}15`, borderColor: successColor }]}
                                    onPress={enableAll}
                                    disabled={saving}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="checkmark-done" size={18} color={successColor} />
                                    <AppText style={[styles.summaryBtnText, { color: successColor }]}>Enable All</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.summaryBtn, { backgroundColor: `${errorColor}15`, borderColor: errorColor }]}
                                    onPress={disableAll}
                                    disabled={saving}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="close" size={18} color={errorColor} />
                                    <AppText style={[styles.summaryBtnText, { color: errorColor }]}>Disable All</AppText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Notification Toggles Card */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
                            <AppText style={[styles.cardTitle, { color: textPrimary }]}>Notification Types</AppText>
                        </View>

                        {NOTIF_ITEMS.map((item, index) => (
                            <View key={item.key}>
                                <View style={styles.row}>
                                    <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                                        <Ionicons name={item.icon} size={22} color={item.color} />
                                    </View>

                                    <View style={styles.rowContent}>
                                        <AppText style={[styles.rowTitle, { color: textPrimary }]}>
                                            {item.title}
                                        </AppText>
                                        <AppText style={[styles.rowSubtitle, { color: textSecondary }]}>
                                            {item.subtitle}
                                        </AppText>
                                    </View>

                                    <Switch
                                        value={prefs[item.key]}
                                        onValueChange={() => toggle(item.key)}
                                        disabled={saving}
                                        trackColor={{
                                            false: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                                            true: colors.primary,
                                        }}
                                        thumbColor={Platform.OS === 'android' ? (prefs[item.key] ? colors.primary : '#fff') : undefined}
                                        ios_backgroundColor={darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}
                                    />
                                </View>

                                {index < NOTIF_ITEMS.length - 1 && (
                                    <View style={[styles.divider, { backgroundColor: dividerColor }]} />
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Reset Button */}
                    <TouchableOpacity
                        style={[styles.resetBtn, { borderColor: errorColor }]}
                        onPress={resetToDefaults}
                        disabled={saving}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="refresh-outline" size={20} color={errorColor} />
                        <AppText style={[styles.resetBtnText, { color: errorColor }]}>Reset to Defaults</AppText>
                    </TouchableOpacity>

                    {/* Info Note */}
                    <View style={[styles.infoCard, { backgroundColor: `${infoColor}12`, borderColor: `${infoColor}30` }]}>
                        <Ionicons name="information-circle-outline" size={20} color={infoColor} />
                        <AppText style={[styles.infoText, { color: textSecondary }]}>
                            Notifications require the app to be installed as a standalone app. Push notifications will be delivered even when the app is in the background.
                        </AppText>
                    </View>

                    {/* Permission Note */}
                    <View style={[styles.permissionCard, { backgroundColor: `${warningColor}12`, borderColor: `${warningColor}30` }]}>
                        <Ionicons name="alert-circle-outline" size={20} color={warningColor} />
                        <AppText style={[styles.permissionText, { color: textSecondary }]}>
                            Make sure notification permissions are enabled in your device settings to receive alerts.
                        </AppText>
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

const styles = StyleSheet.create({
    container: { flex: 1 },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 100,
    },
    scrollContentLarge: {
        alignItems: 'center',
    },

    wrapper: { width: '100%' },
    largeWrapper: { maxWidth: 480 },

    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: 16,
    },

    headerSection: {
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 35,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 15,
        fontWeight: '400',
        letterSpacing: 0.1,
    },

    // Summary Card
    summaryCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        marginBottom: 20,
    },
    summaryContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    summaryStats: {
        alignItems: 'flex-start',
    },
    summaryCount: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 2,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    summaryActions: {
        flexDirection: 'row',
        gap: 10,
    },
    summaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    summaryBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Main Card
    card: {
        borderRadius: 24,
        padding: 8,
        borderWidth: 1,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
    },

    // Row Items
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 14,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowContent: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    rowSubtitle: {
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 17,
    },

    divider: {
        height: 1,
        marginHorizontal: 16,
    },

    // Reset Button
    resetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        marginBottom: 20,
    },
    resetBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },

    // Info Cards
    infoCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
    },
    permissionCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 8,
    },
    permissionText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
    },

    // Footer
    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },

    // Toast
    toast: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        gap: 12,
        zIndex: 9999,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    toastText: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
});