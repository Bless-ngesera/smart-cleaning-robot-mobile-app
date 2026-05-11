// app/(tabs)/05_ProfileScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppNavigation } from '@/hooks/useAppNavigation';

import AppText from '@/src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

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

/* ------------------------------------------------------------------ */
/*  MENU ITEMS  (absolute paths — fixes back-navigation bug)           */
/* ------------------------------------------------------------------ */
const MENU_ITEMS: MenuItem[] = [
    { id: 1, title: 'Account Settings',  subtitle: 'Manage your personal information',  icon: 'person-outline',         route: '/settings/account'       },
    { id: 2, title: 'Robot Management',  subtitle: 'Configure your cleaning robot',      icon: 'hardware-chip-outline',  route: '/settings/robot'         },
    { id: 3, title: 'Cleaning History',  subtitle: 'View past cleaning sessions',        icon: 'time-outline',           route: '/settings/history'       },
    { id: 4, title: 'Notifications',     subtitle: 'Manage alerts and reminders',        icon: 'notifications-outline',  route: '/settings/notifications' },
    { id: 5, title: 'Help & Support',    subtitle: 'Get help and contact support',       icon: 'help-circle-outline',    route: '/settings/support'       },
    { id: 6, title: 'Connection',        subtitle: 'Connect to the robot',               icon: 'link-outline',           route: '/settings/connection'    },
];

const QUICK_LINKS = [
    { icon: 'grid-outline'            as keyof typeof Ionicons.glyphMap, label: 'Dashboard', route: '/(tabs)/01_DashboardScreen', color: '#6366f1' },
    { icon: 'game-controller-outline' as keyof typeof Ionicons.glyphMap, label: 'Control',   route: '/(tabs)/02_ControlScreen',   color: '#10B981' },
    { icon: 'map-outline'             as keyof typeof Ionicons.glyphMap, label: 'Map',        route: '/(tabs)/03_MapScreen',       color: '#14b8a6' },
    { icon: 'calendar-outline'        as keyof typeof Ionicons.glyphMap, label: 'Schedule',   route: '/(tabs)/04_ScheduleScreen',  color: '#f59e0b' },
];

/* ------------------------------------------------------------------ */
/*  ACTION BUTTON  (replaces <Button> for guaranteed text contrast)    */
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
    const [totalRuntimeHours, setTotalRuntime]  = useState(0);
    const [efficiency, setEfficiency]           = useState(0);

    /* ---- design tokens -------------------------------------------- */
    const cardBg        = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder    = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary   = darkMode ? '#ffffff'                : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor  = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    /* ---------------------------------------------------------------- */
    /*  DATA FETCHING                                                    */
    /* ---------------------------------------------------------------- */
    const fetchUser = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

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

            const { data: sessions } = await supabase
                .from('cleaning_sessions')
                .select('status, duration')
                .eq('user_id', user.id);

            if (sessions && sessions.length > 0) {
                const completed  = sessions.filter(s => s.status === 'Completed').length;
                const totalMins  = sessions.reduce((acc, s) => {
                    if (!s.duration) return acc;
                    const h = s.duration.match(/(\d+)\s*h/);
                    const m = s.duration.match(/(\d+)\s*m/);
                    return acc + (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
                }, 0);

                setTotalCleanings(sessions.length);
                setTotalRuntime(Math.round(totalMins / 60));
                setEfficiency(Math.round((completed / sessions.length) * 100));
            }
        } catch (err) {
            console.error('Failed to fetch user:', err);
            Alert.alert('Error', 'Could not load profile data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [replace]);

    /* initial load */
    useEffect(() => {
        fetchUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
            if (!session) replace('/LoginScreen');
            else fetchUser();
        });

        return () => subscription.unsubscribe();
    }, [fetchUser]);

    /* pull-to-refresh */
    const onRefresh = useCallback(() => {
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
                        try {
                            const { error } = await supabase.auth.signOut();
                            if (error) throw error;
                        } catch (err: any) {
                            Alert.alert('Logout Failed', err.message || 'Something went wrong');
                        }
                    },
                },
            ]
        );
    };

    /* ---------------------------------------------------------------- */
    /*  LOADING STATE                                                    */
    /* ---------------------------------------------------------------- */
    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <AppText style={{ color: textSecondary }}>Loading profile…</AppText>
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
                                { value: String(totalCleanings),  label: 'Cleanings'  },
                                { value: `${totalRuntimeHours}h`, label: 'Runtime'    },
                                { value: `${efficiency}%`,        label: 'Efficiency' },
                            ].map((stat, i, arr) => (
                                <React.Fragment key={stat.label}>
                                    <View style={styles.statItem}>
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
                            onPress={toggleTheme}
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
                                onPress={() => push(item.route)}
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

                    {/* ─── Quick Links ─────────────────────────────────── */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="flash-outline" size={20} color={colors.primary} />
                            <AppText style={[styles.cardTitle, { color: textPrimary }]}>Quick Links</AppText>
                        </View>

                        <View style={styles.quickGrid}>
                            {QUICK_LINKS.map(item => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[
                                        styles.quickTile,
                                        {
                                            backgroundColor: `${item.color}${darkMode ? '1a' : '12'}`,
                                            borderColor:     `${item.color}30`,
                                        },
                                    ]}
                                    onPress={() => push(item.route)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={item.icon} size={24} color={item.color} />
                                    <AppText style={[styles.quickLabel, { color: textPrimary }]}>
                                        {item.label}
                                    </AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
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
        paddingBottom: 80,
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
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        height: '100%',
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
        gap: 12,
    },
    quickTile: {
        flex: 1,
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