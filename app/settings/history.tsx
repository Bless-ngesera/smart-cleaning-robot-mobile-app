// app/settings/history.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../../src/components/Header';

// Mock data – replace with real Supabase query later
const history = [
    { id: '1', date: 'Feb 5, 2026', time: '10:45 AM', duration: '1h 32m', area: '142 m²', status: 'Completed' },
    { id: '2', date: 'Feb 4, 2026', time: '8:20 AM', duration: '2h 05m', area: '178 m²', status: 'Completed' },
    { id: '3', date: 'Feb 3, 2026', time: '7:15 PM', duration: '48m', area: '89 m²', status: 'Interrupted' },
    { id: '4', date: 'Feb 2, 2026', time: '9:00 AM', duration: '1h 10m', area: '115 m²', status: 'Completed' },
];

export default function CleaningHistory() {
    const { colors } = useThemeContext();

    const renderItem = ({ item }) => (
        <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View>
                <Text style={[styles.date, { color: colors.text }]}>{item.date} • {item.time}</Text>
                <Text style={[styles.details, { color: colors.textSecondary }]}>
                    {item.duration} • {item.area}
                </Text>
            </View>
            <Text
                style={[
                    styles.status,
                    { color: item.status === 'Completed' ? colors.primary : '#ef4444' },
                ]}
            >
                {item.status}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Cleaning History" subtitle="Past cleaning sessions" />

            <FlatList
                data={history}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={[styles.empty, { color: colors.textSecondary }]}>
                        No cleaning sessions yet
                    </Text>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    list: {
        padding: 24,
        paddingBottom: 40,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    date: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    details: {
        fontSize: 14,
    },
    status: {
        fontSize: 14,
        fontWeight: '600',
    },
    empty: {
        textAlign: 'center',
        fontSize: 16,
        marginTop: 40,
    },
});