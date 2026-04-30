// app/settings/notifications.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Switch,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    useWindowDimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';

const STORAGE_KEY = 'notificationPreferences';

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
};

const NOTIF_ITEMS: NotifItem[] = [
    {
        key: 'cleaningComplete',
        title: 'Cleaning Complete',
        subtitle: 'Notify when a cleaning session finishes',
        icon: 'checkmark-circle-outline',
    },
    {
        key: 'scheduleReminders',
        title: 'Schedule Reminders',
        subtitle: 'Remind before a scheduled cleaning starts',
        icon: 'calendar-outline',
    },
    {
        key: 'batteryAlerts',
        title: 'Battery Alerts',
        subtitle: 'Alert when battery drops below 20%',
        icon: 'battery-half-outline',
    },
    {
        key: 'robotOffline',
        title: 'Robot Offline',
        subtitle: 'Notify when the robot loses connection',
        icon: 'wifi-outline',
    },
    {
        key: 'errorAlerts',
        title: 'Error Alerts',
        subtitle: 'Alert when the robot encounters an error',
        icon: 'warning-outline',
    },
    {
        key: 'weeklyReport',
        title: 'Weekly Report',
        subtitle: 'Get a weekly summary of cleaning activity',
        icon: 'bar-chart-outline',
    },
];

export default function NotificationsScreen() {
    const { colors, darkMode } = useThemeContext();

    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const saved = await AsyncStorage.getItem(STORAGE_KEY);
                if (saved) {
                    setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(saved) });
                }
            } catch {
                // use defaults
            } finally {
                setLoaded(true);
            }
        })();
    }, []);

    const toggle = useCallback(async (key: keyof NotifPrefs) => {
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
            // silently fail — in-memory update still stands
        }
    }, [prefs]);

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
                    {/* Back Navigation */}
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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

                    {/* Notification Toggles Card */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        {NOTIF_ITEMS.map((item, index) => (
                            <View key={item.key}>
                                <View style={styles.row}>
                                    <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                        <Ionicons name={item.icon} size={22} color={colors.primary} />
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
                                        trackColor={{
                                            false: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                                            true: colors.primary,
                                        }}
                                        thumbColor={Platform.OS === 'android' ? (prefs[item.key] ? '#fff' : '#fff') : undefined}
                                        ios_backgroundColor={darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}
                                    />
                                </View>

                                {index < NOTIF_ITEMS.length - 1 && (
                                    <View style={[styles.divider, { backgroundColor: dividerColor }]} />
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Info Note */}
                    <View style={[styles.infoCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                        <AppText style={[styles.infoText, { color: textSecondary }]}>
                            Notifications require the app to be installed as a standalone app. Some features may be limited in Expo Go.
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

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 80,
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

    card: {
        borderRadius: 24,
        padding: 8,
        borderWidth: 1,
        marginBottom: 20,
    },

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

    infoCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});
