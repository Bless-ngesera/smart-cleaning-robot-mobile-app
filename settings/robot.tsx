// app/(tabs)/settings/robot.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../src/components/Header';
import Button from '../src/components/Button';

export default function RobotManagement() {
    const { colors } = useThemeContext();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Robot Management" subtitle="Configure your cleaning robot" />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.text }]}>Robot Status</Text>
                    <Text style={[styles.status, { color: colors.primary }]}>Connected • Online</Text>
                </View>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.text }]}>Current Battery</Text>
                    <Text style={[styles.value, { color: colors.primary }]}>85%</Text>
                </View>

                <Button
                    title="Update Firmware"
                    icon="cloud-upload-outline"
                    onPress={() => Alert.alert('Coming Soon', 'Firmware update feature coming soon.')}
                    variant="primary"
                    fullWidth
                    style={{ marginTop: 24 }}
                />

                <Button
                    title="Reset Robot"
                    icon="refresh-outline"
                    onPress={() => Alert.alert('Warning', 'Are you sure? This will reset all settings.', [
                        { text: 'Cancel' },
                        { text: 'Reset', style: 'destructive' },
                    ])}
                    variant="outline"
                    danger
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
    title: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    status: { fontSize: 18, fontWeight: '700' },
    value: { fontSize: 32, fontWeight: '700' },
});