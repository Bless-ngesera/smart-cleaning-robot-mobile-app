// app/_layout.tsx
import React, { useEffect, useCallback, useState } from 'react';
import { View, Platform, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeContext } from '@/src/context/ThemeContext';
import { AuthProvider, useAuth, setSuppressNextSignedIn } from '@/src/context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import * as Linking from 'expo-linking';

import { disableSystemFontScaling } from '@/src/utils/disableFontScaling';
import { supabase } from '@/src/services/supabase';
import { ToastProvider } from '@/src/context/ToastContext';
import ToastNotification from '@/src/components/ToastNotification';

disableSystemFontScaling();
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'SF-Pro-Display-Regular':  require('../assets/fonts/SF-Pro-Display-Regular.otf'),
    'SF-Pro-Display-Semibold': require('../assets/fonts/SF-Pro-Display-Semibold.otf'),
    'SF-Pro-Display-Bold':     require('../assets/fonts/SF-Pro-Display-Bold.otf'),
  });

  const [appIsReady, setAppIsReady] = useState(false);

  // ── Deep-link / email-link handler ────────────────────────────────────
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) { console.warn('[DeepLink] error:', error.message); return; }
        if (!data?.session) return;

        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('reset-password') || lowerUrl.includes('recovery')) {
          setTimeout(() => { setSuppressNextSignedIn(true); }, 100);
        }
      } catch {
        // URL has no auth code — ignore
      }
    };

    Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); });
    const sub = Linking.addEventListener('url', ({ url }) => { if (url) handleDeepLink(url); });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    async function prepare() {
      try { await new Promise(resolve => setTimeout(resolve, 100)); }
      catch (e) { console.warn('prepare error:', e); }
      finally { setAppIsReady(true); }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && appIsReady) await SplashScreen.hideAsync();
  }, [fontsLoaded, appIsReady]);

  if (!fontsLoaded || !appIsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <RootContent onLayout={onLayoutRootView} />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootContent({ onLayout }: { onLayout: () => void }) {
  const { darkMode, colors } = useThemeContext();
  const { isLoading } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(colors.card);
      NavigationBar.setButtonStyleAsync(darkMode ? 'light' : 'dark');
    }
  }, [darkMode, colors]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} onLayout={onLayout}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />

      {/*
        KEY FIX: Use a Stack at the root level.
        - (tabs) is one entry in the stack — the tab navigator lives here.
        - settings/* screens are pushed ON TOP of the tab stack.
        - router.back() from any settings screen pops back to (tabs),
          which remembers which tab was active — not the dashboard root.
      */}
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth screens — no header, no back gesture into the app */}
        <Stack.Screen name="index"              options={{ headerShown: false }} />
        <Stack.Screen name="LoginScreen"        options={{ headerShown: false }} />
        <Stack.Screen name="SignupScreen"       options={{ headerShown: false }} />
        <Stack.Screen name="ForgotPasswordScreen" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password"     options={{ headerShown: false }} />
        <Stack.Screen name="verified-account"   options={{ headerShown: false }} />

        {/* Tab navigator — treated as a single stack entry */}
        <Stack.Screen name="(tabs)"             options={{ headerShown: false }} />

        {/*
          Settings screens — pushed on top of (tabs).
          back() pops these and returns to whichever tab was active.
        */}
        <Stack.Screen name="settings/account"       options={{ headerShown: false }} />
        <Stack.Screen name="settings/robot"         options={{ headerShown: false }} />
        <Stack.Screen name="settings/history"       options={{ headerShown: false }} />
        <Stack.Screen name="settings/notifications" options={{ headerShown: false }} />
        <Stack.Screen name="settings/support"       options={{ headerShown: false }} />
        <Stack.Screen name="settings/connection"    options={{ headerShown: false }} />
      </Stack>

      <ToastNotification />
    </View>
  );
}
