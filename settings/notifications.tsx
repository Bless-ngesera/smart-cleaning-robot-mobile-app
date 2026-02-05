// app/(tabs)/settings/notifications.tsx
import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../src/components/Header';

export default function NotificationsSettings() {
    const { colors } = useThemeContext();

    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [lowBatteryAlert, setLowBatteryAlert] = useState(true);
    const [cleaningCompleteAlert, setCleaningCompleteAlert] = useState(true);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Notifications" subtitle="Manage alerts and reminders" />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.toggleRow}>
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Push Notifications</Text>
                        <Switch
                            value={pushEnabled}
                            onValueChange={setPushEnabled}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={pushEnabled ? '#fff' : colors.textSecondary}
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.toggleRow}>
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Email Notifications</Text>
                        <Switch
                            value={emailEnabled}
                            onValueChange={setEmailEnabled}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={emailEnabled ? '#fff' : colors.textSecondary}
                        />
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>
                    Alert Preferences
                </Text>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.toggleRow}>
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Low Battery Alert</Text>
                        <Switch
                            value={lowBatteryAlert}
                            onValueChange={setLowBatteryAlert}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={lowBatteryAlert ? '#fff' : colors.textSecondary}
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.toggleRow}>
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Cleaning Complete Alert</Text>
                        <Switch
                            value={cleaningCompleteAlert}
                            onValueChange={setCleaningCompleteAlert}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={cleaningCompleteAlert ? '#fff' : colors.textSecondary}
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
    toggleLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        marginVertical: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 12,
    },
});