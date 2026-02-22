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
        let authSubscription: { unsubscribe: () => void } | null = null;

        const checkSessionAndListen = async () => {
            try {
                // Initial session check
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.replace('/LoginScreen');
                }
            } catch (err) {
                console.error('Initial session check failed:', err);
                router.replace('/LoginScreen');
            } finally {
                setIsCheckingAuth(false);
            }

            // Listen for auth changes
            const { data } = supabase.auth.onAuthStateChange((event, session) => {
                if (!session) {
                    router.replace('/LoginScreen');
                }
            });

            authSubscription = data.subscription;
        };

        checkSessionAndListen();

        return () => {
            if (authSubscription) {
                authSubscription.unsubscribe();
            }
        };
    }, []);

    if (isCheckingAuth) {
        return null; // Or show a full-screen loader if you prefer
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: darkMode ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.50)',
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    borderTopWidth: 1,
                    height: 64,                    // Slightly taller for premium feel
                    paddingBottom: 8,
                    paddingTop: 6,
                    elevation: darkMode ? 0 : 4,
                    shadowColor: darkMode ? 'transparent' : '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: -4 },
                },
                tabBarLabelStyle: {
                    fontSize: 11.5,
                    fontWeight: '600',
                    marginBottom: 2,
                    letterSpacing: 0.1,
                },
                tabBarIconStyle: {
                    marginBottom: -2,
                },
                tabBarItemStyle: {
                    paddingVertical: 4,
                },
                // Active tab gets subtle background + scale effect feel
                tabBarActiveBackgroundColor: darkMode ? `${colors.primary}15` : `${colors.primary}10`,
            }}
        >
            <Tabs.Screen
                name="01_DashboardScreen"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name={tabIcons.dashboard} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="02_ControlScreen"
                options={{
                    title: 'Control',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name={tabIcons.control} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="03_MapScreen"
                options={{
                    title: 'Map',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name={tabIcons.map} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="04_ScheduleScreen"
                options={{
                    title: 'Schedule',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name={tabIcons.schedule} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="05_ProfileScreen"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name={tabIcons.profile} size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}