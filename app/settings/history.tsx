// app/settings/history.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Loader from '../../src/components/Loader';
import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

type CleaningSession = {
    id: string;
    date: string;
    time: string;
    duration: string;
    area: string;
    status: 'Completed' | 'Failed' | 'Cancelled' | string;
};

export default function CleaningHistory() {
    const { colors, darkMode } = useThemeContext();

    const [history, setHistory] = useState<CleaningSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Same as Dashboard
    const { width } = Dimensions.get('window');
    const isLargeScreen = width >= 768;

    // Design tokens matching Dashboard
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user?.id) throw new Error('Not authenticated');

                const { data, error } = await supabase
                    .from('cleaning_sessions')
                    .select('id, date, time, duration, area, status')
                    .eq('user_id', user.id)
                    .order('date', { ascending: false })
                    .limit(20);

                if (error) throw error;

                setHistory(data || []);
            } catch (err: any) {
                console.error('Failed to fetch history:', err);
                setError('Could not load cleaning history. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const renderItem = ({ item }: { item: CleaningSession }) => (
        <View style={[styles.historyItem, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.historyInfo}>
                <AppText style={[styles.date, { color: textPrimary }]}>
                    {item.date} • {item.time}
                </AppText>
                <AppText style={[styles.details, { color: textSecondary }]}>
                    {item.duration} • {item.area}
                </AppText>
            </View>
            <AppText
                style={[
                    styles.status,
                    {
                        color: item.status === 'Completed' ? colors.primary : '#ef4444',
                    },
                ]}
            >
                {item.status}
            </AppText>
        </View>
    );

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
                    {/* Large Header */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Cleaning History
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Past cleaning sessions
                        </AppText>
                    </View>

                    {loading ? (
                        <Loader message="Loading history..." />
                    ) : error ? (
                        <View style={styles.center}>
                            <AppText style={{ color: '#ef4444', fontSize: 16, textAlign: 'center' }}>
                                {error}
                            </AppText>
                        </View>
                    ) : (
                        <FlatList
                            data={history}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={styles.list}
                            ListEmptyComponent={
                                <AppText style={[styles.empty, { color: textSecondary }]}>
                                    No cleaning sessions yet
                                </AppText>
                            }
                            scrollEnabled={false}
                        />
                    )}
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
        paddingTop: 120,
        paddingBottom: 80,
    },
    scrollContentLarge: {
        alignItems: 'center',
    },

    wrapper: { width: '100%' },
    largeWrapper: { maxWidth: 480 },

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

    list: {
        paddingBottom: 24,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    historyInfo: {
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
        marginLeft: 12,
    },
    empty: {
        textAlign: 'center',
        fontSize: 16,
        marginTop: 40,
        lineHeight: 24,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});