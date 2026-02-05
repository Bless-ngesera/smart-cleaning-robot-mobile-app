// app/settings/robot.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../../src/components/Header';
import Button from '../../src/components/Button';
import { Alert } from 'react-native';

export default function RobotManagement() {
    const { colors } = useThemeContext();

    // Mock robot data – replace with real API later
    const robot = {
        status: 'Online',
        battery: 87,
        lastClean: 'Today, 10:45 AM',
        firmware: 'v2.3.1',
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Robot Management" subtitle="Your cleaning robot" />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
                    <Text style={[styles.value, { color: robot.status === 'Online' ? colors.primary : '#ef4444' }]}>
                        {robot.status}
                    </Text>
                </View>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Battery Level</Text>
                    <Text style={[styles.value, { color: colors.primary }]}>{robot.battery}%</Text>
                </View>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Last Cleaning</Text>
                    <Text style={[styles.value, { color: colors.text }]}>{robot.lastClean}</Text>
                </View>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Firmware Version</Text>
                    <Text style={[styles.value, { color: colors.text }]}>{robot.firmware}</Text>
                </View>

                <Button
                    title="Check for Updates"
                    icon="cloud-upload-outline"
                    onPress={() => Alert.alert('Update', 'No new firmware available')}
                    variant="primary"
                    fullWidth
                    style={{ marginTop: 24 }}
                />

                <Button
                    title="Restart Robot"
                    icon="refresh-outline"
                    onPress={() => Alert.alert('Restart', 'Robot will restart in 30 seconds')}
                    variant="outline"
                    fullWidth
                    style={{ marginTop: 12 }}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 24, paddingBottom: 40 },
    card: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    label: { fontSize: 14, marginBottom: 8 },
    value: { fontSize: 18, fontWeight: '600' },
});