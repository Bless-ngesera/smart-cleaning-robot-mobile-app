// app/(tabs)/settings/history.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../src/components/Header';

const mockHistory = [
    { id: '1', date: 'Feb 4, 2026', duration: '1h 45m', area: '145 m²', status: 'Completed' },
    { id: '2', date: 'Feb 3, 2026', duration: '2h 10m', area: '180 m²', status: 'Completed' },
    { id: '3', date: 'Feb 2, 2026', duration: '55m', area: '92 m²', status: 'Completed' },
    { id: '4', date: 'Feb 1, 2026', duration: '1h 20m', area: '130 m²', status: 'Interrupted' },
];

export default function CleaningHistory() {
    const { colors } = useThemeContext();

    const renderItem = ({ item }) => (
        <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.left}>
                <Text style={[styles.date, { color: colors.text }]}>{item.date}</Text>
                <Text style={[styles.details, { color: colors.textSecondary }]}>
                    {item.duration} • {item.area}
                </Text>
            </View>
            <Text
                style={[
                    styles.status,
                    {
                        color: item.status === 'Completed' ? colors.primary : '#ef4444',
                    },
                ]}
            >
                {item.status}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Cleaning History" subtitle="View past cleaning sessions" />

            <FlatList
                data={mockHistory}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={[styles.empty, { color: colors.textSecondary }]}>
                        No cleaning history yet
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
    left: {
        flex: 1,
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