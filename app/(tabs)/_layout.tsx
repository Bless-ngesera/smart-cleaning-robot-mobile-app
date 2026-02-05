// app/(tabs)/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

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
        // Initial session check
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.replace('/LoginScreen');
                }
            } catch (err) {
                console.error('Session check failed:', err);
                router.replace('/LoginScreen');
            } finally {
                setIsCheckingAuth(false);
            }
        };

        checkSession();

        // Real-time auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!session) {
                router.replace('/LoginScreen');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Show nothing while checking auth (prevents flash of tabs)
    if (isCheckingAuth) {
        return null;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                    borderTopWidth: darkMode ? 0 : 1,
                    height: 62,
                    paddingBottom: 8,
                    paddingTop: 6,
                    elevation: darkMode ? 0 : 4,
                    shadowOpacity: darkMode ? 0 : 0.08,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: -2 },
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginBottom: 4,
                },
                tabBarIconStyle: {
                    marginBottom: -2,
                },
                tabBarActiveBackgroundColor: darkMode ? `${colors.primary}10` : undefined,
            }}
        >
            <Tabs.Screen
                name="01_DashboardScreen"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name={tabIcons.dashboard} size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="02_ControlScreen"
                options={{
                    title: 'Control',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name={tabIcons.control} size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="03_MapScreen"
                options={{
                    title: 'Map',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name={tabIcons.map} size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="04_ScheduleScreen"
                options={{
                    title: 'Schedule',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name={tabIcons.schedule} size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="05_ProfileScreen"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name={tabIcons.profile} size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}