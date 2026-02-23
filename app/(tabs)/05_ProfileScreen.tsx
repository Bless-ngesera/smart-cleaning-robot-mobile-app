// app/(tabs)/05_ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Alert,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import AppText from '../../src/components/AppText';
import Button from '../../src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

export default function ProfileScreen() {
    const { colors, darkMode, toggleTheme } = useThemeContext();

    const [userName, setUserName] = useState('Guest');
    const [userEmail, setUserEmail] = useState('');
    const [loading, setLoading] = useState(true);

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
        const fetchUser = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserEmail(user.email || '');
                    setUserName(
                        user.user_metadata?.full_name ||
                        user.email?.split('@')[0] ||
                        'User'
                    );
                } else {
                    router.replace('/LoginScreen');
                }
            } catch (err) {
                console.error('Failed to fetch user:', err);
                Alert.alert('Error', 'Could not load profile data');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!session) {
                router.replace('/LoginScreen');
            } else {
                fetchUser();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to log out?', [
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
        ]);
    };

    // Menu items
    const menuItems = [
        { id: 1, title: 'Account Settings', subtitle: 'Manage your personal information', icon: 'person-outline', route: '../settings/account' },
        { id: 2, title: 'Robot Management', subtitle: 'Configure your cleaning robot', icon: 'hardware-chip-outline', route: '../settings/robot' },
        { id: 3, title: 'Cleaning History', subtitle: 'View past cleaning sessions', icon: 'time-outline', route: '../settings/history' },
        { id: 4, title: 'Notifications', subtitle: 'Manage alerts and reminders', icon: 'notifications-outline', route: '../settings/notifications' },
        { id: 5, title: 'Help & Support', subtitle: 'Get help and contact support', icon: 'help-circle-outline', route: '../settings/support' },
        { id: 6, title: 'Connection', subtitle: 'Connect to the robot', icon: 'link', route: '../settings/connection' },
    ];

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <AppText style={{ color: textSecondary }}>Loading profile...</AppText>
            </SafeAreaView>
        );
    }

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
                            Profile
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Manage your account & preferences
                        </AppText>
                    </View>

                    {/* Profile Header Card */}
                    <View style={[styles.profileCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.avatarContainer}>
                            <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}>
                                <Ionicons name="person" size={48} color={colors.primary} />
                            </View>
                        </View>

                        <AppText style={[styles.userName, { color: textPrimary }]}>
                            {userName}
                        </AppText>
                        <AppText style={[styles.userEmail, { color: textSecondary }]}>
                            {userEmail}
                        </AppText>

                        {/* Stats */}
                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <AppText style={[styles.statValue, { color: colors.primary }]}>24</AppText>
                                <AppText style={[styles.statLabel, { color: textSecondary }]}>Cleanings</AppText>
                            </View>

                            <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />

                            <View style={styles.statItem}>
                                <AppText style={[styles.statValue, { color: colors.primary }]}>156h</AppText>
                                <AppText style={[styles.statLabel, { color: textSecondary }]}>Runtime</AppText>
                            </View>

                            <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />

                            <View style={styles.statItem}>
                                <AppText style={[styles.statValue, { color: colors.primary }]}>95%</AppText>
                                <AppText style={[styles.statLabel, { color: textSecondary }]}>Efficiency</AppText>
                            </View>
                        </View>
                    </View>

                    {/* Theme Toggle Card */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleContainer}>
                                <Ionicons name={darkMode ? 'moon' : 'sunny'} size={20} color={colors.primary} />
                                <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                    Appearance
                                </AppText>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.toggleContainer, { backgroundColor: cardBg }]}
                            onPress={toggleTheme}
                            activeOpacity={0.7}
                        >
                            <View style={styles.toggleLeft}>
                                <Ionicons
                                    name={darkMode ? 'moon-outline' : 'sunny-outline'}
                                    size={20}
                                    color={textPrimary}
                                />
                                <AppText style={[styles.toggleText, { color: textPrimary }]}>
                                    {darkMode ? 'Dark Mode' : 'Light Mode'}
                                </AppText>
                            </View>

                            <View
                                style={[
                                    styles.toggleSwitch,
                                    { backgroundColor: darkMode ? colors.primary : cardBorder },
                                ]}
                            >
                                <View
                                    style={[
                                        styles.toggleThumb,
                                        darkMode && styles.toggleThumbActive,
                                    ]}
                                />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Settings Menu */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleContainer}>
                                <Ionicons name="settings" size={20} color={colors.primary} />
                                <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                    Settings
                                </AppText>
                            </View>
                        </View>

                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.menuItem,
                                    index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: dividerColor },
                                ]}
                                onPress={() => router.push(item.route)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.menuIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                    <Ionicons name={item.icon} size={22} color={colors.primary} />
                                </View>

                                <View style={styles.menuContent}>
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

                    {/* Logout Button */}
                    <View style={styles.logoutContainer}>
                        <Button
                            title="Logout"
                            icon="log-out-outline"
                            onPress={handleLogout}
                            variant="outline"
                            danger
                        />
                    </View>

                    {/* Quick Links - matching Dashboard Quick Actions */}
                    <View style={[styles.actionsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.actionsHeader}>
                            <AppText style={[styles.actionsTitle, { color: textPrimary }]}>
                                Quick Links
                            </AppText>
                        </View>

                        <View style={styles.actionsGrid}>
                            {[
                                {
                                    icon: 'grid-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Dashboard',
                                    route: '/(tabs)/01_DashboardScreen',
                                    color: '#6366f1'
                                },
                                {
                                    icon: 'game-controller-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Control',
                                    route: '/(tabs)/02_ControlScreen',
                                    color: '#10B981'
                                },
                                {
                                    icon: 'map-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Map',
                                    route: '/(tabs)/03_MapScreen',
                                    color: '#14b8a6'
                                },
                                {
                                    icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Schedule',
                                    route: '/(tabs)/04_ScheduleScreen',
                                    color: '#f59e0b'
                                },
                            ].map((item) => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[
                                        styles.actionTile,
                                        {
                                            backgroundColor: `${item.color}${darkMode ? '1a' : '12'}`,
                                            borderColor: `${item.color}30`,
                                        }
                                    ]}
                                    onPress={() => router.push(item.route)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={item.icon} size={24} color={item.color} />
                                    <AppText style={[styles.actionLabel, { color: textPrimary }]}>
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

    profileCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
        alignItems: 'center',
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    userEmail: {
        fontSize: 15,
        marginBottom: 20,
    },
    statsContainer: {
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

    sectionCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },

    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
    },
    toggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    toggleText: {
        fontSize: 16,
        fontWeight: '500',
    },
    toggleSwitch: {
        width: 52,
        height: 30,
        borderRadius: 15,
        padding: 3,
        justifyContent: 'center',
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },

    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    menuIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 13,
        fontWeight: '400',
    },

    logoutContainer: {
        marginTop: 8,
        marginBottom: 16,
    },

    actionsCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
    },
    actionsHeader: {
        marginBottom: 16,
    },
    actionsTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionTile: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 20,
        alignItems: 'center',
        gap: 10,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});