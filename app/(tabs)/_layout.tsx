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

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!session) {
                router.replace('/LoginScreen');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    if (isCheckingAuth) {
        return null;
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
                    height: 60,                    // tighter, more modern
                    paddingBottom: 6,
                    paddingTop: 4,
                    elevation: darkMode ? 0 : 3,   // subtle in light mode only
                    shadowColor: darkMode ? 'transparent' : '#000',
                    shadowOpacity: 0.06,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: -3 },
                },
                tabBarLabelStyle: {
                    fontSize: 11.5,
                    fontWeight: '600',
                    marginBottom: 2,
                    letterSpacing: 0.1,
                },
                tabBarIconStyle: {
                    marginBottom: -1,
                },
                tabBarItemStyle: {
                    paddingVertical: 4,
                },
                // Active tab gets a subtle background tint + dot indicator feel
                tabBarActiveBackgroundColor: darkMode ? `${colors.primary}12` : `${colors.primary}10`,
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