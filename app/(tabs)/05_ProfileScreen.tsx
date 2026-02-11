// app/(tabs)/05_ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Alert,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import Header from '../../src/components/Header';
import Button from '../../src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

export default function ProfileScreen() {
    const { colors, darkMode, toggleTheme } = useThemeContext();

    const [userName, setUserName] = useState('Guest');
    const [userEmail, setUserEmail] = useState('');
    const [loading, setLoading] = useState(true);

    // Fetch user data + listen for auth changes
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

        // Real-time auth listener (logout, session expire, etc.)
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
                        // Supabase clears session automatically
                    } catch (err: any) {
                        Alert.alert('Logout Failed', err.message || 'Something went wrong');
                    }
                },
            },
        ]);
    };

    // Menu items with real nested routes
    const menuItems = [
        {
            id: 1,
            title: 'Account Settings',
            subtitle: 'Manage your personal information',
            icon: 'person-outline',
            route: '../settings/account',
        },
        {
            id: 2,
            title: 'Robot Management',
            subtitle: 'Configure your cleaning robot',
            icon: 'hardware-chip-outline',
            route: '../settings/robot',
        },
        {
            id: 3,
            title: 'Cleaning History',
            subtitle: 'View past cleaning sessions',
            icon: 'time-outline',
            route: '../settings/history',
        },
        {
            id: 4,
            title: 'Notifications',
            subtitle: 'Manage alerts and reminders',
            icon: 'notifications-outline',
            route: '' +
                '../settings/notifications',
        },
        {
            id: 5,
            title: 'Help & Support',
            subtitle: 'Get help and contact support',
            icon: 'help-circle-outline',
            route: '../settings/support',
        },
        {
            id: 6,
            title: 'Connection',
            subtitle: 'connect to the robot',
            icon: 'help-circle-outline',
            route: '/connectionScreen',
        },
    ];

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary }}>Loading profile...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Header title="Profile" subtitle="Manage your account & preferences" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}>
                            <Ionicons name="person" size={48} color={colors.primary} />
                        </View>
                    </View>

                    <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>
                    <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{userEmail}</Text>

                    {/* Stats (placeholders – replace with real data later) */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.primary }]}>24</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cleanings</Text>
                        </View>

                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.primary }]}>156h</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Runtime</Text>
                        </View>

                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.primary }]}>95%</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Efficiency</Text>
                        </View>
                    </View>
                </View>

                {/* Theme Toggle Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardTitleContainer}>
                            <Ionicons name={darkMode ? 'moon' : 'sunny'} size={20} color={colors.primary} />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Appearance</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.toggleContainer, { backgroundColor: colors.background }]}
                        onPress={toggleTheme}
                        activeOpacity={0.7}
                    >
                        <View style={styles.toggleLeft}>
                            <Ionicons
                                name={darkMode ? 'moon-outline' : 'sunny-outline'}
                                size={20}
                                color={colors.text}
                            />
                            <Text style={[styles.toggleText, { color: colors.text }]}>
                                {darkMode ? 'Dark Mode' : 'Light Mode'}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.toggleSwitch,
                                { backgroundColor: darkMode ? colors.primary : colors.border },
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
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardTitleContainer}>
                            <Ionicons name="settings" size={20} color={colors.primary} />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Settings</Text>
                        </View>
                    </View>

                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.menuItem,
                                index < menuItems.length - 1 && {
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border,
                                },
                            ]}
                            onPress={() => router.push(item.route)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.menuIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                <Ionicons name={item.icon} size={22} color={colors.primary} />
                            </View>

                            <View style={styles.menuContent}>
                                <Text style={[styles.menuTitle, { color: colors.text }]}>
                                    {item.title}
                                </Text>
                                <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
                                    {item.subtitle}
                                </Text>
                            </View>

                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
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

                <Text style={[styles.versionText, { color: colors.textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    profileCard: {
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        marginTop: 16,
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
        fontWeight: '700',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        height: '100%',
    },

    card: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    cardHeader: {
        marginBottom: 16,
    },
    cardTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
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

    versionText: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 8,
    },
});