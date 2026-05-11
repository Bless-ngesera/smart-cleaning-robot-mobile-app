// app/(tabs)/_layout.tsx
//
// WHY CUSTOM tabBarLabel?
//   Expo Router's <Tabs> renders tab labels using its own internal <Text> node
//   from React Navigation. That node is NOT the same Text that our
//   disableSystemFontScaling() patches — it lives inside the native bottom-tab
//   navigator and renders BEFORE our defaultProps patch reaches it.
//
//   The ONLY reliable fix is to supply a custom tabBarLabel renderer for every
//   tab. This renderer returns an <AppText> (which loads Inter and sets
//   allowFontScaling={false} / maxFontSizeMultiplier={1} explicitly), so the
//   phone's "Font Size" accessibility setting has zero effect on the tab bar.
//
// RULE: Every <Tabs.Screen> MUST have tabBarLabel defined as a function that
// returns <AppText>. Never rely on the string `title` prop for the visible
// label — that goes through React Navigation's internal Text node.

import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/src/context/ThemeContext';
import AppText from '@/src/components/AppText';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
type LabelProps = {
    focused: boolean;
    color: string;
};

/* ─────────────────────────────────────────────────────────────────────────────
   TAB LABEL FACTORY
   Returns a tabBarLabel render function for a given label string.
   All labels use AppText so Inter is applied and font scaling is disabled.
───────────────────────────────────────────────────────────────────────────── */
function makeLabel(label: string) {
    return ({ focused, color }: LabelProps) => (
        <AppText
            style={[
                styles.tabLabel,
                { color },
                focused ? styles.tabLabelFocused : styles.tabLabelIdle,
            ]}
            numberOfLines={1}
        >
            {label}
        </AppText>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LAYOUT
───────────────────────────────────────────────────────────────────────────── */
export default function TabLayout() {
    const { colors, darkMode } = useThemeContext();

    const tabBg      = darkMode ? '#0f1117' : '#ffffff';
    const borderTop  = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const activeColor   = colors.primary;   // blue
    const inactiveColor = darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor:   activeColor,
                tabBarInactiveTintColor: inactiveColor,
                tabBarStyle: {
                    backgroundColor: tabBg,
                    borderTopColor:  borderTop,
                    borderTopWidth:  StyleSheet.hairlineWidth,
                    height:          Platform.OS === 'ios' ? 82 : 62,
                    paddingBottom:   Platform.OS === 'ios' ? 24 : 8,
                    paddingTop:      6,
                    elevation:       0,
                    shadowOpacity:   0,
                },
                // Disable the default label entirely — we supply our own via
                // tabBarLabel on each screen so AppText is always used.
                tabBarShowLabel: true,
            }}
        >
            {/* ── 1. Dashboard ───────────────────────────────────────────── */}
            <Tabs.Screen
                name="01_DashboardScreen"
                options={{
                    title: 'Dashboard',
                    tabBarLabel: makeLabel('Dashboard'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid-outline" size={size} color={color} />
                    ),
                }}
            />

            {/* ── 2. Control ────────────────────────────────────────────── */}
            <Tabs.Screen
                name="02_ControlScreen"
                options={{
                    title: 'Control',
                    tabBarLabel: makeLabel('Control'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="game-controller-outline" size={size} color={color} />
                    ),
                }}
            />

            {/* ── 3. Map ────────────────────────────────────────────────── */}
            <Tabs.Screen
                name="03_MapScreen"
                options={{
                    title: 'Map',
                    tabBarLabel: makeLabel('Map'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="map-outline" size={size} color={color} />
                    ),
                }}
            />

            {/* ── 4. Schedule ───────────────────────────────────────────── */}
            <Tabs.Screen
                name="04_ScheduleScreen"
                options={{
                    title: 'Schedule',
                    tabBarLabel: makeLabel('Schedule'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar-outline" size={size} color={color} />
                    ),
                }}
            />

            {/* ── 5. Profile ────────────────────────────────────────────── */}
            <Tabs.Screen
                name="05_ProfileScreen"
                options={{
                    title: 'Profile',
                    tabBarLabel: makeLabel('Profile'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES
   Keep font sizes small — tab labels sit in a constrained height.
   fontWeight is read by AppText to pick the correct Inter .ttf file.
───────────────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
    tabLabel: {
        fontSize:   10,
        marginTop:  2,
        textAlign:  'center',
        // AppText will inject fontFamily based on fontWeight.
        // Do NOT set fontFamily here — AppText handles that.
    },
    tabLabelFocused: {
        fontWeight: '600',  // → Inter-SemiBold via AppText
    },
    tabLabelIdle: {
        fontWeight: '400',  // → Inter-Regular via AppText
    },
});