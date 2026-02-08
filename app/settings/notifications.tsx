// app/settings/history.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../../src/components/Header';
import { supabase } from '@/src/services/supabase';

export default function CleaningHistory() {
    const { colors } = useThemeContext();

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchHistory = async () => {
        try {
            setError(null);

            // === PLACEHOLDER: Fetch real cleaning history from Supabase ===
            // This assumes you have a table called 'cleaning_sessions'
            // Columns: id, date, time, duration, area, status, user_id
            const { data, error } = await supabase
                .from('cleaning_sessions')
                .select('id, date, time, duration, area, status')
                .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                .order('date', { ascending: false })
                .limit(50); // last 50 sessions – adjust as needed

            if (error) throw error;

            setHistory(data || []);

            // === C++ INTEGRATION POINT: Sync real robot history here ===
            // If you want to pull live or recent sessions directly from the robot:
            // - Connect via Bluetooth, Wi-Fi, Serial, HTTP API, etc.
            // - Fetch cleaning logs from robot firmware
            // - Format as array of objects: { id, date, time, duration, area, status }
            // - Then merge or replace Supabase data:
            // const realRobotHistory = await RobotBridge.getCleaningLogs(); // your C++ bridge call
            // setHistory([...realRobotHistory, ...data]); // or prioritize robot data
        } catch (err) {
            console.error('Failed to fetch history:', err);
            setError('Could not load cleaning history');
        }
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await fetchHistory();
            setLoading(false);
        };
        load();

        // Optional: Auto-refresh every 60 seconds
        // const interval = setInterval(fetchHistory, 60000);
        // return () => clearInterval(interval);
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchHistory();
        setRefreshing(false);
    };

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

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={{ color: '#ef4444', fontSize: 16, textAlign: 'center' }}>{error}</Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <Text style={[styles.empty, { color: colors.textSecondary }]}>
                            No cleaning sessions recorded yet
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