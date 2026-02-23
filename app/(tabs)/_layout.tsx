// app/(tabs)/_layout.tsx

import React, { useEffect, useState } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcons: Record<string, IoniconName> = {
    dashboard: 'grid-outline',
    control: 'game-controller-outline',
    map: 'map-outline',
    schedule: 'calendar-outline',
    profile: 'person-outline',
};

export default function TabLayout() {
    const { colors, darkMode } = useThemeContext();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        let authSubscription: { unsubscribe: () => void } | null = null;

        const checkSessionAndListen = async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (!session) {
                    router.replace('/LoginScreen');
                    return;
                }
            } catch (err) {
                console.error('Initial session check failed:', err);
                router.replace('/LoginScreen');
            } finally {
                setIsCheckingAuth(false);
            }

            const { data } = supabase.auth.onAuthStateChange(
                (_, session) => {
                    if (!session) {
                        router.replace('/LoginScreen');
                    }
                }
            );

            authSubscription = data.subscription;
        };

        checkSessionAndListen();

        return () => {
            authSubscription?.unsubscribe();
        };
    }, []);

    if (isCheckingAuth) return null;

    const TAB_HEIGHT = 72; // Fixed height (no safe area padding)

    return (
        <Tabs
            screenOptions={{
                headerShown: false,

                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: darkMode
                    ? 'rgba(255,255,255,0.55)'
                    : 'rgba(0,0,0,0.55)',

                tabBarStyle: {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,

                    height: TAB_HEIGHT,
                    backgroundColor: colors.card,

                    borderTopWidth: 1,
                    borderTopColor: darkMode
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.08)',

                    elevation: darkMode ? 0 : 12,
                    shadowColor: '#000',
                    shadowOpacity: darkMode ? 0 : 0.1,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: -4 },
                },

                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    letterSpacing: 0.3,
                    marginBottom: Platform.OS === 'ios' ? 6 : 4,
                },

                tabBarIconStyle: {
                    marginTop: 6,
                },

                tabBarItemStyle: {
                    justifyContent: 'center',
                },

                tabBarActiveBackgroundColor: darkMode
                    ? `${colors.primary}20`
                    : `${colors.primary}14`,
            }}
        >
            <Tabs.Screen
                name="01_DashboardScreen"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name={tabIcons.dashboard} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="02_ControlScreen"
                options={{
                    title: 'Control',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name={tabIcons.control} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="03_MapScreen"
                options={{
                    title: 'Map',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name={tabIcons.map} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="04_ScheduleScreen"
                options={{
                    title: 'Schedule',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name={tabIcons.schedule} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="05_ProfileScreen"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name={tabIcons.profile} size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}