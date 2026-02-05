// app/settings/notifications.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../../src/components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NotificationsSettings() {
    const { colors } = useThemeContext();

    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [lowBattery, setLowBattery] = useState(true);
    const [cleaningDone, setCleaningDone] = useState(true);

    useEffect(() => {
        // Load saved preferences
        const loadPrefs = async () => {
            try {
                const push = await AsyncStorage.getItem('pushEnabled');
                const email = await AsyncStorage.getItem('emailEnabled');
                const battery = await AsyncStorage.getItem('lowBattery');
                const done = await AsyncStorage.getItem('cleaningDone');

                setPushEnabled(push !== 'false');
                setEmailEnabled(email !== 'false');
                setLowBattery(battery !== 'false');
                setCleaningDone(done !== 'false');
            } catch (e) {}
        };
        loadPrefs();
    }, []);

    const toggleSetting = async (key, value) => {
        await AsyncStorage.setItem(key, value.toString());
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Notifications" subtitle="Manage your alerts" />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.toggleRow}>
                        <Text style={[styles.label, { color: colors.text }]}>Push Notifications</Text>
                        <Switch
                            value={pushEnabled}
                            onValueChange={(v) => {
                                setPushEnabled(v);
                                toggleSetting('pushEnabled', v);
                            }}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={pushEnabled ? '#fff' : colors.textSecondary}
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.toggleRow}>
                        <Text style={[styles.label, { color: colors.text }]}>Email Notifications</Text>
                        <Switch
                            value={emailEnabled}
                            onValueChange={(v) => {
                                setEmailEnabled(v);
                                toggleSetting('emailEnabled', v);
                            }}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={emailEnabled ? '#fff' : colors.textSecondary}
                        />
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>
                    Specific Alerts
                </Text>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.toggleRow}>
                        <Text style={[styles.label, { color: colors.text }]}>Low Battery Warning</Text>
                        <Switch
                            value={lowBattery}
                            onValueChange={(v) => {
                                setLowBattery(v);
                                toggleSetting('lowBattery', v);
                            }}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={lowBattery ? '#fff' : colors.textSecondary}
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.toggleRow}>
                        <Text style={[styles.label, { color: colors.text }]}>Cleaning Completed</Text>
                        <Switch
                            value={cleaningDone}
                            onValueChange={(v) => {
                                setCleaningDone(v);
                                toggleSetting('cleaningDone', v);
                            }}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={cleaningDone ? '#fff' : colors.textSecondary}
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 24, paddingBottom: 40 },
    card: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    label: { fontSize: 16, fontWeight: '500' },
    divider: { height: 1, marginVertical: 4 },
    sectionTitle: { fontSize: 14, fontWeight: '500', marginBottom: 12 },
});