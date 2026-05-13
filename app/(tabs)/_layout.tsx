// app/(tabs)/_layout.tsx
//
// Tab navigator layout.
//
// TAB BAR FONT FIX:
//   Expo Router / React Navigation renders tab labels with its own internal
//   <Text> node that bypasses AppText and allowFontScaling entirely.
//   The fix is a custom `tabBarLabel` renderer on every tab that returns
//   <AppText>, so the tab bar uses SF Pro Display like everything else.

import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';
import AppText from '@/src/components/AppText';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

/** Icon renderer — keeps the renderProp signature React Navigation expects */
const renderIcon = (name: IoniconName) =>
    ({ color }: { color: string }) =>
        <Ionicons name={name} size={24} color={color} />;

/**
 * Label renderer — returns <AppText> so SF Pro Display is used in the tab bar.
 * `focused` drives colour; weight '600' → SF-Pro-Display-Semibold on Android.
 */
const makeLabel = (label: string, activeTintColor: string, inactiveTintColor: string) =>
    ({ focused }: { focused: boolean }) => (
        <AppText
            style={{
                fontSize:      12,
                fontWeight:    '600',
                letterSpacing: 0.3,
                marginBottom:  Platform.OS === 'ios' ? 6 : 4,
                color:         focused ? activeTintColor : inactiveTintColor,
            }}
        >
            {label}
        </AppText>
    );

/* ─────────────────────────────────────────────────────────────────────────────
   STABLE INITIAL ROUTE — prevents accidental stack resets
───────────────────────────────────────────────────────────────────────────── */
export const unstable_settings = {
    initialRouteName: '01_DashboardScreen',
};

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function TabLayout() {
    const { colors, darkMode } = useThemeContext();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // ── Auth guard ───────────────────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;
        let authSub: { unsubscribe: () => void } | null = null;

        const init = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!mounted) return;
                if (!session) { router.replace('/LoginScreen'); return; }
            } catch {
                if (mounted) router.replace('/LoginScreen');
            } finally {
                if (mounted) setIsCheckingAuth(false);
            }

            if (!mounted) return;

            const { data } = supabase.auth.onAuthStateChange(
                (_event: AuthChangeEvent, session: Session | null) => {
                    if (!session) router.replace('/LoginScreen');
                }
            );
            authSub = mounted ? data.subscription : null;
            if (!mounted) data.subscription.unsubscribe();
        };

        init();
        return () => { mounted = false; authSub?.unsubscribe(); };
    }, []); // empty deps — run once on mount, use router directly (not from hook)

    if (isCheckingAuth) return null;

    // ── Design tokens ────────────────────────────────────────────────────────
    const TAB_HEIGHT      = 72;
    const activeTint      = colors.primary;
    const inactiveTint    = darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,

                // Colours for the icon — label colour is handled inside makeLabel()
                tabBarActiveTintColor:   activeTint,
                tabBarInactiveTintColor: inactiveTint,

                // Hide the default label — we supply our own via tabBarLabel
                tabBarShowLabel: true,

                tabBarStyle: {
                    position:        'absolute',
                    left:            0,
                    right:           0,
                    bottom:          0,
                    height:          TAB_HEIGHT,
                    backgroundColor: colors.card,
                    borderTopWidth:  1,
                    borderTopColor:  darkMode
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.08)',
                    elevation:       darkMode ? 0 : 12,
                    shadowColor:     '#000',
                    shadowOpacity:   darkMode ? 0 : 0.1,
                    shadowRadius:    14,
                    shadowOffset:    { width: 0, height: -4 },
                },

                // Remove the default label style so our AppText styles are not
                // overridden by React Navigation's internal label styles
                tabBarLabelStyle:  { display: 'none' },
                tabBarIconStyle:   { marginTop: 6 },
                tabBarItemStyle:   { justifyContent: 'center' },

                tabBarActiveBackgroundColor: darkMode
                    ? `${colors.primary}20`
                    : `${colors.primary}14`,
            }}
        >
            <Tabs.Screen
                name="01_DashboardScreen"
                options={{
                    tabBarIcon:  renderIcon('grid-outline'),
                    tabBarLabel: makeLabel('Dashboard', activeTint, inactiveTint),
                }}
            />
            <Tabs.Screen
                name="02_ControlScreen"
                options={{
                    tabBarIcon:  renderIcon('game-controller-outline'),
                    tabBarLabel: makeLabel('Control', activeTint, inactiveTint),
                }}
            />
            <Tabs.Screen
                name="03_MapScreen"
                options={{
                    tabBarIcon:  renderIcon('map-outline'),
                    tabBarLabel: makeLabel('Map', activeTint, inactiveTint),
                }}
            />
            <Tabs.Screen
                name="04_ScheduleScreen"
                options={{
                    tabBarIcon:  renderIcon('calendar-outline'),
                    tabBarLabel: makeLabel('Schedule', activeTint, inactiveTint),
                }}
            />
            <Tabs.Screen
                name="05_ProfileScreen"
                options={{
                    tabBarIcon:  renderIcon('person-outline'),
                    tabBarLabel: makeLabel('Profile', activeTint, inactiveTint),
                }}
            />
        </Tabs>
    );
}