// app/_layout.tsx
import React, { useEffect, useCallback, useState } from 'react';
import { View, Platform, ActivityIndicator } from 'react-native';
import { Slot, router } from 'expo-router';
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
        'SF-Pro-Display-Regular': require('../assets/fonts/SF-Pro-Display-Regular.otf'),
        'SF-Pro-Display-Semibold': require('../assets/fonts/SF-Pro-Display-Semibold.otf'),
        'SF-Pro-Display-Bold': require('../assets/fonts/SF-Pro-Display-Bold.otf'),
    });

    const [appIsReady, setAppIsReady] = useState(false);

    // ─── Deep-link / email-link handler ─────────────────────────────────────
    // This is the single place that exchanges PKCE auth codes from email links
    // (email verification + password reset). After a successful exchange the
    // auth events in AuthContext fire and handle most navigation, but we add
    // an explicit fallback here because:
    //   • PASSWORD_RECOVERY → AuthContext already routes to /reset-password ✓
    //   • SIGNED_IN (fallback for older Supabase or edge cases) → we suppress
    //     the auto-redirect and navigate to /reset-password ourselves.
    useEffect(() => {
        const handleDeepLink = async (url: string) => {
            try {
                const { data, error } = await supabase.auth.exchangeCodeForSession(url);

                if (error) {
                    console.warn('[DeepLink] exchangeCodeForSession error:', error.message);
                    return;
                }

                if (!data?.session) return;

                const lowerUrl = url.toLowerCase();

                if (lowerUrl.includes('reset-password') || lowerUrl.includes('recovery')) {
                    // PASSWORD_RECOVERY event in AuthContext should have fired first
                    // and already navigated. The setTimeout here is a 100ms safety net
                    // that handles the case where only SIGNED_IN fired instead.
                    setTimeout(() => {
                        setSuppressNextSignedIn(true); // block SIGNED_IN → dashboard
                        router.replace('/reset-password');
                    }, 100);
                } else if (lowerUrl.includes('verified-account')) {
                    // Navigate to the verified-account screen so the success
                    // animation plays. AuthContext's SIGNED_IN (1.5s delay) will
                    // then redirect to the dashboard.
                    setTimeout(() => {
                        router.replace('/verified-account');
                    }, 100);
                }
            } catch {
                // URL does not contain an auth code — ignore silently
            }
        };

        // Cold start: app opened directly from email link
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink(url);
        });

        // Warm start: app already open, email link tapped
        const sub = Linking.addEventListener('url', ({ url }) => {
            if (url) handleDeepLink(url);
        });

        return () => sub.remove();
    }, []);

    useEffect(() => {
        async function prepare() {
            try {
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {
                console.warn('Error during app preparation:', e);
            } finally {
                setAppIsReady(true);
            }
        }

        prepare();
    }, []);

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded && appIsReady) {
            await SplashScreen.hideAsync();
        }
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

    // Android navigation bar
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
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
            onLayout={onLayout}
        >
            <StatusBar style={darkMode ? 'light' : 'dark'} />
            <Slot />
            <ToastNotification />
        </View>
    );
}
