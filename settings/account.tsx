// app/(tabs)/settings/account.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../src/components/Header';
import Button from '../src/components/Button';
import { router } from 'expo-router';

export default function AccountSettings() {
    const { colors } = useThemeContext();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Account Settings" subtitle="Update your details" />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
                        <Text style={[styles.value, { color: colors.text }]}>Muhindo</Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
                        <Text style={[styles.value, { color: colors.text }]}>example@email.com</Text>
                    </View>
                </View>

                <Button
                    title="Edit Profile"
                    icon="pencil-outline"
                    onPress={() => router.push('/(tabs)/profile-edit')}
                    variant="primary"
                    fullWidth
                    style={{ marginTop: 24 }}
                />

                <Button
                    title="Change Password"
                    icon="lock-closed-outline"
                    onPress={() => Alert.alert('Coming Soon', 'Password change will be available soon.')}
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
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
    card: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    label: { fontSize: 14, marginBottom: 4 },
    value: { fontSize: 16, fontWeight: '500' },
});