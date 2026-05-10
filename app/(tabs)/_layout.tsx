// app/(tabs)/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, IoniconName> = {
  dashboard: 'grid-outline',
  control:   'game-controller-outline',
  map:       'map-outline',
  schedule:  'calendar-outline',
  profile:   'person-outline',
};

export const unstable_settings = {
  // Ensures the tab stack is always rooted here — prevents accidental resets
  initialRouteName: '01_DashboardScreen',
};

export default function TabLayout() {
  const { colors, darkMode } = useThemeContext();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const checkSessionAndListen = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (!session) {
          // Use router.replace directly — avoids hook dependency issues
          router.replace('/LoginScreen');
          return;
        }
      } catch (err) {
        console.error('Session check failed:', err);
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

      authSubscription = mounted ? data.subscription : null;
      if (!mounted) data.subscription.unsubscribe();
    };

    checkSessionAndListen();

    return () => {
      mounted = false;
      authSubscription?.unsubscribe();
    };
  }, []); // ← empty deps: runs once on mount, no replace() dependency loop

  if (isCheckingAuth) return null;

  const TAB_HEIGHT = 72;

  const renderIcon = (name: IoniconName) =>
    ({ color }: { color: string }) =>
      <Ionicons name={name} size={24} color={color} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: darkMode
          ? 'rgba(255,255,255,0.55)'
          : 'rgba(0,0,0,0.55)',
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
        tabBarLabelStyle: {
          fontSize:    12,
          fontWeight:  '600',
          fontFamily:  'SF-Pro-Display-Semibold',
          letterSpacing: 0.3,
          marginBottom: Platform.OS === 'ios' ? 6 : 4,
        },
        tabBarIconStyle:  { marginTop: 6 },
        tabBarItemStyle:  { justifyContent: 'center' },
        tabBarActiveBackgroundColor: darkMode
          ? `${colors.primary}20`
          : `${colors.primary}14`,
      }}
    >
      <Tabs.Screen
        name="01_DashboardScreen"
        options={{ title: 'Dashboard', tabBarIcon: renderIcon(TAB_ICONS.dashboard) }}
      />
      <Tabs.Screen
        name="02_ControlScreen"
        options={{ title: 'Control',   tabBarIcon: renderIcon(TAB_ICONS.control) }}
      />
      <Tabs.Screen
        name="03_MapScreen"
        options={{ title: 'Map',       tabBarIcon: renderIcon(TAB_ICONS.map) }}
      />
      <Tabs.Screen
        name="04_ScheduleScreen"
        options={{ title: 'Schedule',  tabBarIcon: renderIcon(TAB_ICONS.schedule) }}
      />
      <Tabs.Screen
        name="05_ProfileScreen"
        options={{ title: 'Profile',   tabBarIcon: renderIcon(TAB_ICONS.profile) }}
      />
    </Tabs>
  );
}
