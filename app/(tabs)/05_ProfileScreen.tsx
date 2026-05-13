// app/(tabs)/05_ProfileScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { disableSystemFontScaling } from '@/src/utils/disableFontScaling';
disableSystemFontScaling();
import {
    View,
    Alert,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
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

import AppText from '@/src/components/AppText';
import Loader from '@/src/components/Loader';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

// Toast Message Interface
interface ToastMessage {
    id: string;
    text: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */
interface MenuItem {
    id: number;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: string;
}

interface CleaningSession {
    id: string;
    user_id: string;
    date: string;
    time: string;
    duration: string;
    area: string;
    status: string;
    created_at: string;
}

/* ------------------------------------------------------------------ */
/*  MENU ITEMS  (absolute paths — fixes back-navigation bug)           */
/* ------------------------------------------------------------------ */
const MENU_ITEMS: MenuItem[] = [
    { id: 1, title: 'Account Settings',  subtitle: 'Manage your personal information',  icon: 'person-outline',         route: '/settings/account'       },
    { id: 2, title: 'Robot Management',  subtitle: 'Configure your cleaning robot',      icon: 'hardware-chip-outline',  route: '/settings/robot'         },
    { id: 3, title: 'Connection',        subtitle: 'Connect to the robot',               icon: 'link-outline',           route: '/settings/connection'    },
    { id: 4, title: 'Cleaning History',  subtitle: 'View past cleaning sessions',        icon: 'time-outline',           route: '/settings/history'       },
    { id: 5, title: 'Notifications',     subtitle: 'Manage alerts and reminders',        icon: 'notifications-outline',  route: '/settings/notifications' },
    { id: 6, title: 'Help & Support',    subtitle: 'Get help and contact support',       icon: 'help-circle-outline',    route: '/settings/support'       },
];

/* ------------------------------------------------------------------ */
/*  ACTION BUTTON                                                      */
/* ------------------------------------------------------------------ */
interface ActionButtonProps {
    title: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    variant?: 'primary' | 'outline' | 'disabled';
    danger?: boolean;
    primaryColor: string;
    style?: object;
}

function ActionButton({ title, icon, onPress, variant = 'primary', danger = false, primaryColor, style }: ActionButtonProps) {
    const isDisabled = variant === 'disabled';
    const isOutline  = variant === 'outline';

    const accentColor = danger ? '#EF4444' : primaryColor;

    const bg = isDisabled
        ? 'rgba(255,255,255,0.08)'
        : isOutline
        ? 'transparent'
        : accentColor;

    const borderColor = isDisabled ? 'rgba(255,255,255,0.12)' : accentColor;

    const textColor = isDisabled
        ? 'rgba(255,255,255,0.35)'
        : isOutline
        ? accentColor
        : '#ffffff';

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={isDisabled ? 1 : 0.78}
            style={[
                abS.btn,
                { backgroundColor: bg, borderColor, borderWidth: isOutline || isDisabled ? 1.5 : 0 },
                style,
            ]}
        >
            {icon && (
                <Ionicons
                    name={icon}
                    size={18}
                    color={textColor}
                    style={{ marginRight: 6 }}
                />
            )}
            <AppText style={[abS.label, { color: textColor }]}>
                {title}
            </AppText>
        </TouchableOpacity>
    );
}

const abS = StyleSheet.create({
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                           */
/* ------------------------------------------------------------------ */
export default function ProfileScreen() {
    const { push, replace } = useAppNavigation();
    const { colors, darkMode, toggleTheme } = useThemeContext();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    /* ---- state ---------------------------------------------------- */
    const [userName, setUserName]               = useState('Guest');
    const [userEmail, setUserEmail]             = useState('');
    const [loading, setLoading]                 = useState(true);
    const [refreshing, setRefreshing]           = useState(false);
    const [totalCleanings, setTotalCleanings]   = useState(0);
    const [totalRuntimeMinutes, setTotalRuntimeMinutes] = useState(0);
    const [totalArea, setTotalArea]             = useState(0);
    const [efficiency, setEfficiency]           = useState(0);
    const [toasts, setToasts]                   = useState<ToastMessage[]>([]);
    const toastAnimations = useRef<{ [key: string]: Animated.Value }>({});

    /* ---- design tokens -------------------------------------------- */
    const cardBg        = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder    = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary   = darkMode ? '#ffffff'                : '#1a1a2e';
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor  = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    const successColor  = '#10B981';
    const errorColor    = '#EF4444';
    const warningColor  = '#F59E0B';
    const infoColor     = '#3B82F6';

    // Show toast message
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
                setToasts(prev => prev.filter(toast => toast.id !== id));
                delete toastAnimations.current[id];
            });
        }, 5000);
    }, []);

    // Parse duration string to minutes
    const parseDurationToMinutes = useCallback((duration: string): number => {
        if (!duration) return 0;
        let total = 0;
        const hoursMatch = duration.match(/(\d+)\s*h/);
        const minutesMatch = duration.match(/(\d+)\s*m/);
        if (hoursMatch) total += parseInt(hoursMatch[1]) * 60;
        if (minutesMatch) total += parseInt(minutesMatch[1]);
        return total;
    }, []);

    // Parse area string to number
    const parseAreaToNumber = useCallback((area: string): number => {
        if (!area) return 0;
        const match = area.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    }, []);

    /* ---------------------------------------------------------------- */
    /*  DATA FETCHING                                                    */
    /* ---------------------------------------------------------------- */
    const fetchUser = useCallback(async () => {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError) throw userError;

            if (!user) {
                replace('/LoginScreen');
                return;
            }

            setUserEmail(user.email ?? '');
            setUserName(
                user.user_metadata?.full_name ||
                user.email?.split('@')[0]     ||
                'User'
            );

            // Fetch cleaning sessions
            const { data: sessions, error: sessionsError } = await supabase
                .from('cleaning_sessions')
                .select('status, duration, area, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (sessionsError) throw sessionsError;

            if (sessions && sessions.length > 0) {
                const completed = sessions.filter(s => s.status === 'Completed' || s.status === 'completed').length;
                
                let totalMins = 0;
                let totalAreaCleaned = 0;
                
                for (const session of sessions) {
                    totalMins += parseDurationToMinutes(session.duration || '');
                    totalAreaCleaned += parseAreaToNumber(session.area || '');
                }

                setTotalCleanings(sessions.length);
                setTotalRuntimeMinutes(totalMins);
                setTotalArea(totalAreaCleaned);
                setEfficiency(Math.round((completed / sessions.length) * 100));
            } else {
                setTotalCleanings(0);
                setTotalRuntimeMinutes(0);
                setTotalArea(0);
                setEfficiency(0);
            }
        } catch (err: any) {
            console.error('Failed to fetch user:', err);
            showToast(err.message || 'Could not load profile data', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [replace, parseDurationToMinutes, parseAreaToNumber, showToast]);

    // Format runtime as hours and minutes
    const formatRuntime = useCallback(() => {
        const hours = Math.floor(totalRuntimeMinutes / 60);
        const minutes = totalRuntimeMinutes % 60;
        if (hours === 0) return `${minutes} min`;
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
    }, [totalRuntimeMinutes]);

    /* initial load */
    useEffect(() => {
        fetchUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
            if (!session) {
                replace('/LoginScreen');
            } else {
                fetchUser();
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchUser, replace]);

    /* pull-to-refresh */
    const onRefresh = useCallback(() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        fetchUser();
    }, [fetchUser]);

    /* ---------------------------------------------------------------- */
    /*  LOGOUT                                                           */
    /* ---------------------------------------------------------------- */
    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        try {
                            const { error } = await supabase.auth.signOut();
                            if (error) throw error;
                            showToast('Logged out successfully', 'success');
                        } catch (err: any) {
                            showToast(err.message || 'Logout failed', 'error');
                        }
                    },
                },
            ]
        );
    };

    /* ---------------------------------------------------------------- */
    /*  RENDER TOASTS                                                    */
    /* ---------------------------------------------------------------- */
    const renderToasts = () => {
        const statusBarHeight = StatusBar.currentHeight || (Platform.OS === 'ios' ? 47 : 0);
        
        return toasts.map((toast, index) => {
            const toastColor = toast.type === 'success' ? successColor : toast.type === 'error' ? errorColor : toast.type === 'warning' ? warningColor : infoColor;
            const fadeAnim = toastAnimations.current[toast.id] || new Animated.Value(1);
            
            return (
                <Animated.View
                    key={toast.id}
                    style={[
                        toastStyles.toast,
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
                    <AppText style={toastStyles.toastText}>{toast.text}</AppText>
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

    /* ---------------------------------------------------------------- */
    /*  LOADING STATE                                                    */
    /* ---------------------------------------------------------------- */
    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
                <View style={styles.loadingContainer}>
                    <Loader message="Loading profile..." />
                </View>
            </SafeAreaView>
        );
    }

    /* ---------------------------------------------------------------- */
    /*  RENDER                                                           */
    /* ---------------------------------------------------------------- */
    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={['top']}
        >
            <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
            
            {renderToasts()}

            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.scrollContentLarge,
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>

                    {/* ─── Header ─────────────────────────────────────── */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Profile
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Manage your account &amp; preferences
                        </AppText>
                    </View>

                    {/* ─── Profile Card ────────────────────────────────── */}
                    <View style={[styles.profileCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}>
                            <Ionicons name="person" size={48} color={colors.primary} />
                        </View>

                        <AppText style={[styles.userName, { color: textPrimary }]}>
                            {userName}
                        </AppText>
                        <AppText style={[styles.userEmail, { color: textSecondary }]}>
                            {userEmail}
                        </AppText>

                        {/* Stats row */}
                        <View style={[styles.statsRow, { borderTopColor: dividerColor }]}>
                            {[
                                { value: String(totalCleanings),  label: 'Cleanings', icon: 'checkmark-circle' as const },
                                { value: formatRuntime(),        label: 'Runtime',   icon: 'time' as const },
                                { value: `${efficiency}%`,        label: 'Efficiency', icon: 'stats-chart' as const },
                                { value: `${Math.round(totalArea)}m²`, label: 'Area',     icon: 'map' as const },
                            ].map((stat, i, arr) => (
                                <React.Fragment key={stat.label}>
                                    <View style={styles.statItem}>
                                        <Ionicons name={stat.icon} size={18} color={colors.primary} style={{ marginBottom: 4 }} />
                                        <AppText style={[styles.statValue, { color: colors.primary }]}>
                                            {stat.value}
                                        </AppText>
                                        <AppText style={[styles.statLabel, { color: textSecondary }]}>
                                            {stat.label}
                                        </AppText>
                                    </View>
                                    {i < arr.length - 1 && (
                                        <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
                                    )}
                                </React.Fragment>
                            ))}
                        </View>
                    </View>

                    {/* ─── Appearance Card ─────────────────────────────── */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name={darkMode ? 'moon' : 'sunny'} size={20} color={colors.primary} />
                            <AppText style={[styles.cardTitle, { color: textPrimary }]}>Appearance</AppText>
                        </View>

                        <TouchableOpacity
                            style={styles.themeRow}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                toggleTheme();
                                showToast(`${darkMode ? 'Light' : 'Dark'} mode enabled`, 'success');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.themeRowLeft}>
                                <Ionicons
                                    name={darkMode ? 'moon-outline' : 'sunny-outline'}
                                    size={20}
                                    color={textPrimary}
                                />
                                <AppText style={[styles.themeLabel, { color: textPrimary }]}>
                                    {darkMode ? 'Dark Mode' : 'Light Mode'}
                                </AppText>
                            </View>
                            <View style={[styles.switchTrack, { backgroundColor: darkMode ? colors.primary : cardBorder }]}>
                                <View style={[styles.switchThumb, darkMode && styles.switchThumbOn]} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* ─── Settings Menu Card ──────────────────────────── */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="settings-outline" size={20} color={colors.primary} />
                            <AppText style={[styles.cardTitle, { color: textPrimary }]}>Settings</AppText>
                        </View>

                        {MENU_ITEMS.map((item, index) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.menuItem,
                                    index < MENU_ITEMS.length - 1 && {
                                        borderBottomWidth: 1,
                                        borderBottomColor: dividerColor,
                                    },
                                ]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    push(item.route);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: `${colors.primary}15` }]}>
                                    <Ionicons name={item.icon} size={22} color={colors.primary} />
                                </View>
                                <View style={styles.menuText}>
                                    <AppText style={[styles.menuTitle, { color: textPrimary }]}>
                                        {item.title}
                                    </AppText>
                                    <AppText style={[styles.menuSubtitle, { color: textSecondary }]}>
                                        {item.subtitle}
                                    </AppText>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ─── Logout ──────────────────────────────────────── */}
                    <View style={styles.logoutContainer}>
                        <ActionButton
                            title="Logout"
                            icon="log-out-outline"
                            onPress={handleLogout}
                            variant="outline"
                            danger
                            primaryColor={colors.primary}
                        />
                    </View>
                </View>

                {/* Footer */}
                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ------------------------------------------------------------------ */
/*  STYLES                                                              */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
    container: { flex: 1 },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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

    wrapper:      { width: '100%' },
    largeWrapper: { maxWidth: 480 },

    /* Header */
    headerSection: {
        marginBottom: 28,
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

    /* Profile card */
    profileCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
        alignItems: 'center',
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 6,
    },
    userEmail: {
        fontSize: 15,
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        paddingTop: 20,
        borderTopWidth: 1,
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        height: '80%',
        alignSelf: 'center',
    },

    /* Generic card */
    card: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },

    /* Theme toggle */
    themeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    themeRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    themeLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    switchTrack: {
        width: 52,
        height: 30,
        borderRadius: 15,
        padding: 3,
        justifyContent: 'center',
    },
    switchThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    switchThumbOn: {
        alignSelf: 'flex-end',
    },

    /* Menu items */
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    menuIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuText: { flex: 1 },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 13,
    },

    /* Logout */
    logoutContainer: {
        marginBottom: 20,
    },

    /* Quick links */
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    quickTile: {
        flex: 1,
        minWidth: '45%',
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 20,
        alignItems: 'center',
        gap: 10,
    },
    quickLabel: {
        fontSize: 13,
        fontWeight: '600',
    },

    /* Footer */
    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});

// Toast styles
const toastStyles = StyleSheet.create({
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

// Quick Links constant
const QUICK_LINKS = [
    { icon: 'grid-outline' as const, label: 'Dashboard', route: '/(tabs)/01_DashboardScreen', color: '#6366f1' },
    { icon: 'game-controller-outline' as const, label: 'Control', route: '/(tabs)/02_ControlScreen', color: '#10B981' },
    { icon: 'map-outline' as const, label: 'Map', route: '/(tabs)/03_MapScreen', color: '#14b8a6' },
    { icon: 'calendar-outline' as const, label: 'Schedule', route: '/(tabs)/04_ScheduleScreen', color: '#f59e0b' },
];