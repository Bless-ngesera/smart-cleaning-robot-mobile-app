// app/settings/history.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../../src/components/Header';
import { supabase } from '@/src/services/supabase';

export default function CleaningHistory() {
    const { colors } = useThemeContext();

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                // === PLACEHOLDER: Fetch real cleaning history from Supabase ===
                // This uses a Supabase table called 'cleaning_sessions'
                // You can replace or enhance this with your C++ robot data sync
                const { data, error } = await supabase
                    .from('cleaning_sessions')
                    .select('*')
                    .order('date', { ascending: false })
                    .limit(20); // last 20 sessions

                if (error) throw error;

                setHistory(data || []);
            } catch (err) {
                console.error('Failed to fetch history:', err);
                setError('Could not load cleaning history');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();

        // Optional: Poll every 30 seconds for new sessions (real-time updates)
        // const interval = setInterval(fetchHistory, 30000);
        // return () => clearInterval(interval);

        // === C++ INTEGRATION POINT: Sync real robot history here ===
        // If you want to pull live data from the robot instead of Supabase:
        // - Connect via Bluetooth/Wi-Fi/Serial
        // - Fetch recent cleaning logs
        // - Format as array of { id, date, time, duration, area, status }
        // - Then call setHistory(yourRealData)
        // Example pseudo-code:
        // const realData = await RobotBridge.getCleaningHistory(); // your C++ bridge
        // setHistory(realData);
    }, []);

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

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={{ color: colors.error, fontSize: 16 }}>{error}</Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={[styles.empty, { color: colors.textSecondary }]}>
                            No cleaning sessions yet
                        </Text>
                    }
                />
            )}
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});