// app/settings/history.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    FlatList,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    useWindowDimensions,
    RefreshControl,
    StatusBar,
    Animated,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppNavigation } from '@/hooks/useAppNavigation';

import Loader from '../../src/components/Loader';
import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

// Types
type CleaningSession = {
    id: string;
    date: string;
    time: string;
    duration: string;
    area: string;
    status: 'Completed' | 'Failed' | 'Cancelled' | string;
    created_at: string;
};

interface ToastMessage {
    id: string;
    text: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

// Helper functions
function formatDuration(duration: string): string {
    if (!duration) return '--';
    return duration;
}

function formatArea(area: string): string {
    if (!area) return '--';
    return area;
}

function getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
        case 'completed':
            return '#10B981';
        case 'failed':
            return '#EF4444';
        case 'cancelled':
            return '#F59E0B';
        default:
            return '#6B7280';
    }
}

function getStatusIcon(status: string): keyof typeof Ionicons.glyphMap {
    switch (status?.toLowerCase()) {
        case 'completed':
            return 'checkmark-circle';
        case 'failed':
            return 'close-circle';
        case 'cancelled':
            return 'alert-circle';
        default:
            return 'time-outline';
    }
}

export default function CleaningHistory() {
    const { back } = useAppNavigation();
    const { colors, darkMode } = useThemeContext();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const [history, setHistory] = useState<CleaningSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        failed: 0,
        totalArea: 0,
        totalDuration: 0,
    });
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const toastAnimations = useRef<{ [key: string]: Animated.Value }>({});

    // Design tokens
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : '#1a1a2e';
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    const successColor = '#10B981';
    const errorColor = '#EF4444';
    const warningColor = '#F59E0B';
    const infoColor = '#3B82F6';

    // Show toast at TOP
    const showToast = useCallback((text: string, type: ToastMessage['type']) => {
        const id = Date.now().toString();
        const fadeAnim = new Animated.Value(0);
        const slideAnim = new Animated.Value(-100);
        
        toastAnimations.current[id] = fadeAnim;
        
        setToasts(prev => [...prev, { id, text, type }]);
        
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
        ]).start();
        
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
            ]).start(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
                delete toastAnimations.current[id];
            });
        }, 5000);
    }, []);

    // Parse duration string to minutes
    const parseDurationToMinutes = useCallback((duration: string): number => {
        if (!duration) return 0;
        let total = 0;
        const hoursMatch = duration.match(/(\d+(?:\.\d+)?)\s*h/);
        const minutesMatch = duration.match(/(\d+(?:\.\d+)?)\s*m/);
        if (hoursMatch) total += parseFloat(hoursMatch[1]) * 60;
        if (minutesMatch) total += parseFloat(minutesMatch[1]);
        return total;
    }, []);

    // Parse area string to number
    const parseAreaToNumber = useCallback((area: string): number => {
        if (!area) return 0;
        const match = area.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    }, []);

    // Format total duration as hours and minutes
    const formatTotalDuration = useCallback((totalMinutes: number): string => {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours === 0) return `${minutes} min`;
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
    }, []);

    // Fetch history data
    const fetchHistory = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('cleaning_sessions')
                .select('id, date, time, duration, area, status, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            const sessions = data || [];
            setHistory(sessions);

            // Calculate statistics
            let completed = 0;
            let failed = 0;
            let totalAreaValue = 0;
            let totalDurationMinutes = 0;

            for (const session of sessions) {
                if (session.status?.toLowerCase() === 'completed') completed++;
                if (session.status?.toLowerCase() === 'failed') failed++;
                totalAreaValue += parseAreaToNumber(session.area);
                totalDurationMinutes += parseDurationToMinutes(session.duration);
            }

            setStats({
                total: sessions.length,
                completed,
                failed,
                totalArea: totalAreaValue,
                totalDuration: totalDurationMinutes,
            });

            if (!silent && sessions.length > 0) {
                showToast(`Loaded ${sessions.length} cleaning sessions`, 'success');
            }
        } catch (err: any) {
            console.error('Failed to fetch history:', err);
            setError(err.message || 'Could not load cleaning history');
            if (!silent) showToast(err.message || 'Failed to load history', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [parseAreaToNumber, parseDurationToMinutes, showToast]);

    // Refresh handler
    const onRefresh = useCallback(() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        fetchHistory(true);
    }, [fetchHistory]);

    // Delete session
    const deleteSession = async (sessionId: string) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        try {
            const { error } = await supabase
                .from('cleaning_sessions')
                .delete()
                .eq('id', sessionId);

            if (error) throw error;
            
            setHistory(prev => prev.filter(s => s.id !== sessionId));
            showToast('Session deleted successfully', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to delete session', 'error');
        }
    };

    // Confirm delete
    const confirmDelete = (session: CleaningSession) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        require('react-native').Alert.alert(
            'Delete Session',
            `Delete cleaning session from ${session.date}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteSession(session.id),
                },
            ]
        );
    };

    // Render toast messages
    const renderToasts = () => {
        const statusBarHeight = StatusBar.currentHeight || (Platform.OS === 'ios' ? 47 : 0);
        
        return toasts.map((toast, index) => {
            const toastColor = toast.type === 'success' ? successColor : toast.type === 'error' ? errorColor : toast.type === 'warning' ? warningColor : infoColor;
            const fadeAnim = toastAnimations.current[toast.id] || new Animated.Value(1);
            
            return (
                <Animated.View
                    key={toast.id}
                    style={[
                        styles.toast,
                        {
                            backgroundColor: toastColor,
                            top: statusBarHeight + 10 + (index * 70),
                            left: 16,
                            right: 16,
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <Ionicons
                        name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'alert-circle' : toast.type === 'warning' ? 'warning' : 'information-circle'}
                        size={22}
                        color="#fff"
                    />
                    <AppText style={styles.toastText}>{toast.text}</AppText>
                    <TouchableOpacity
                        onPress={() => {
                            const anim = toastAnimations.current[toast.id];
                            if (anim) {
                                Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
                                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                                    delete toastAnimations.current[toast.id];
                                });
                            }
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={18} color="rgba(255,255,255,0.9)" />
                    </TouchableOpacity>
                </Animated.View>
            );
        });
    };

    // Render history item
    const renderItem = ({ item }: { item: CleaningSession }) => {
        const statusColor = getStatusColor(item.status);
        const statusIcon = getStatusIcon(item.status);
        
        return (
            <View style={[styles.historyItem, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.historyInfo}>
                    <View style={styles.historyHeader}>
                        <View style={[styles.statusIndicator, { backgroundColor: statusColor + '20' }]}>
                            <Ionicons name={statusIcon} size={14} color={statusColor} />
                            <AppText style={[styles.status, { color: statusColor }]}>
                                {item.status || 'Unknown'}
                            </AppText>
                        </View>
                        <TouchableOpacity 
                            onPress={() => confirmDelete(item)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="trash-outline" size={18} color={errorColor} />
                        </TouchableOpacity>
                    </View>
                    
                    <AppText style={[styles.date, { color: textPrimary }]}>
                        {item.date} • {item.time}
                    </AppText>
                    
                    <View style={styles.detailsRow}>
                        <View style={styles.detailBadge}>
                            <Ionicons name="time-outline" size={14} color={textSecondary} />
                            <AppText style={[styles.details, { color: textSecondary }]}>
                                {formatDuration(item.duration)}
                            </AppText>
                        </View>
                        <View style={styles.detailBadge}>
                            <Ionicons name="map-outline" size={14} color={textSecondary} />
                            <AppText style={[styles.details, { color: textSecondary }]}>
                                {formatArea(item.area)}
                            </AppText>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // Initial load
    useEffect(() => {
        fetchHistory();
    }, []);

    if (loading && !refreshing) {
        return <Loader message="Loading history..." />;
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
            
            {renderToasts()}

            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.scrollContentLarge,
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                    {/* Back Navigation */}
                    <TouchableOpacity style={styles.backButton} onPress={() => back()} activeOpacity={0.7}>
                        <Ionicons name="chevron-back" size={28} color={colors.primary} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Cleaning History
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Past cleaning sessions and statistics
                        </AppText>
                    </View>

                    {/* Statistics Cards */}
                    {history.length > 0 && (
                        <View style={styles.statsContainer}>
                            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                <Ionicons name="calendar" size={22} color={colors.primary} />
                                <AppText style={[styles.statValue, { color: colors.primary }]}>{stats.total}</AppText>
                                <AppText style={[styles.statLabel, { color: textSecondary }]}>Total Sessions</AppText>
                            </View>
                            
                            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                <Ionicons name="checkmark-circle" size={22} color={successColor} />
                                <AppText style={[styles.statValue, { color: successColor }]}>{stats.completed}</AppText>
                                <AppText style={[styles.statLabel, { color: textSecondary }]}>Completed</AppText>
                            </View>
                            
                            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                <Ionicons name="close-circle" size={22} color={errorColor} />
                                <AppText style={[styles.statValue, { color: errorColor }]}>{stats.failed}</AppText>
                                <AppText style={[styles.statLabel, { color: textSecondary }]}>Failed</AppText>
                            </View>
                        </View>
                    )}

                    {/* Total Stats Row */}
                    {history.length > 0 && (stats.totalArea > 0 || stats.totalDuration > 0) && (
                        <View style={[styles.totalStatsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={styles.totalStatItem}>
                                <Ionicons name="map-outline" size={18} color={infoColor} />
                                <AppText style={[styles.totalStatValue, { color: textPrimary }]}>
                                    {stats.totalArea.toFixed(1)} m²
                                </AppText>
                                <AppText style={[styles.totalStatLabel, { color: textSecondary }]}>Total Area</AppText>
                            </View>
                            <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
                            <View style={styles.totalStatItem}>
                                <Ionicons name="time-outline" size={18} color={infoColor} />
                                <AppText style={[styles.totalStatValue, { color: textPrimary }]}>
                                    {formatTotalDuration(stats.totalDuration)}
                                </AppText>
                                <AppText style={[styles.totalStatLabel, { color: textSecondary }]}>Total Time</AppText>
                            </View>
                        </View>
                    )}

                    {/* History List */}
                    {error ? (
                        <View style={styles.center}>
                            <Ionicons name="alert-circle-outline" size={48} color={errorColor} />
                            <AppText style={[styles.errorText, { color: errorColor }]}>
                                {error}
                            </AppText>
                            <TouchableOpacity 
                                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                                onPress={() => fetchHistory()}
                                activeOpacity={0.8}
                            >
                                <AppText style={styles.retryBtnText}>Try Again</AppText>
                            </TouchableOpacity>
                        </View>
                    ) : history.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={64} color={textSecondary} style={{ opacity: 0.5 }} />
                            <AppText style={[styles.emptyTitle, { color: textPrimary }]}>No Cleaning Sessions</AppText>
                            <AppText style={[styles.emptySubtext, { color: textSecondary }]}>
                                Your cleaning history will appear here after the first cleaning session
                            </AppText>
                        </View>
                    ) : (
                        <FlatList
                            data={history}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={styles.list}
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

    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: 16,
    },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 100,
    },
    scrollContentLarge: {
        alignItems: 'center',
    },

    wrapper: { width: '100%' },
    largeWrapper: { maxWidth: 480 },

    headerSection: {
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 35,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 15,
        fontWeight: '400',
        letterSpacing: 0.1,
    },

    // Statistics
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        alignItems: 'center',
        gap: 6,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    totalStatsCard: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 20,
        justifyContent: 'space-around',
    },
    totalStatItem: {
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    totalStatValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    totalStatLabel: {
        fontSize: 11,
        fontWeight: '500',
        opacity: 0.7,
    },
    statDivider: {
        width: 1,
        height: '100%',
    },

    // History List
    list: {
        paddingBottom: 24,
    },
    historyItem: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    historyInfo: {
        flex: 1,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    status: {
        fontSize: 12,
        fontWeight: '600',
    },
    date: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    detailBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    details: {
        fontSize: 14,
    },

    // Empty state
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 8,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.7,
        paddingHorizontal: 40,
    },

    // Error state
    center: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 16,
    },
    errorText: {
        fontSize: 15,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    retryBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 8,
    },
    retryBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    // Footer
    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },

    // Toast
    toast: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        gap: 12,
        zIndex: 9999,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    toastText: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
});