// app/_layout.tsx
//
// Root Expo Router layout.
//
// disableSystemFontScaling() MUST be the very first side-effect — before React,
// before Expo Router, before any provider or component import. Placing the call
// at module-evaluation time guarantees Text/TextInput are patched before any
// node renders.

// ── STEP 1: patch Text / TextInput before anything else ──────────────────────
import { disableSystemFontScaling } from '@/src/utils/disableFontScaling';
disableSystemFontScaling();

// ── STEP 2: React & Expo ──────────────────────────────────────────────────────
import React, { useEffect, useCallback, useState } from 'react';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as NavigationBar from 'expo-navigation-bar';

// ── STEP 3: App providers & services ─────────────────────────────────────────
import { AuthProvider, useAuth, setSuppressNextSignedIn } from '@/src/context/AuthContext';
import { ThemeProvider, useThemeContext } from '@/src/context/ThemeContext';
import { ToastProvider } from '@/src/context/ToastContext';
import ToastNotification from '@/src/components/ToastNotification';
import { supabase } from '@/src/services/supabase';

SplashScreen.preventAutoHideAsync();

/* ─────────────────────────────────────────────────────────────────────────────
   ROOT LAYOUT
───────────────────────────────────────────────────────────────────────────── */
export default function RootLayout() {
    // ── Font loading ──────────────────────────────────────────────────────────
    //
    // CRITICAL RULE: the string keys here MUST exactly match:
    //   • The FONT_MAP in src/components/AppText.tsx
    //   • Any fontFamily string used in StyleSheet.create() anywhere in the app
    //
    // A single-character mismatch causes Android to silently fall back to the
    // system font, which then obeys the phone's Font Size accessibility setting
    // regardless of allowFontScaling: false.
    //
    // The four Inter variants below are the actual .ttf files in assets/fonts/.
    // If you ever rename the files, rename the keys here AND in AppText.tsx.
    const [fontsLoaded, fontError] = useFonts({
        'Inter-Regular':   require('../assets/fonts/Inter-Regular.ttf'),
        'Inter-SemiBold':  require('../assets/fonts/Inter-SemiBold.ttf'),
        'Inter-Bold':      require('../assets/fonts/Inter-Bold.ttf'),
        'Inter-ExtraBold': require('../assets/fonts/Inter-ExtraBold.ttf'),
    });

    useEffect(() => {
        if (fontError) {
            // Surface font loading errors immediately in development.
            // If this fires, check that the file names in assets/fonts/ match
            // the require() paths above exactly (case-sensitive on Android).
            console.error('[RootLayout] Font loading error:', fontError);
        }
    }, [fontError]);

    const [appReady, setAppReady] = useState(false);

    // ── Deep-link / email-link handler ────────────────────────────────────────
    useEffect(() => {
        const handleDeepLink = async (url: string) => {
            try {
                const { data, error } = await supabase.auth.exchangeCodeForSession(url);
                if (error || !data?.session) return;

                const lower = url.toLowerCase();
                if (lower.includes('reset-password') || lower.includes('recovery')) {
                    setSuppressNextSignedIn(true);
                    setTimeout(() => router.replace('/reset-password'), 100);
                } else if (lower.includes('verified-account')) {
                    setTimeout(() => router.replace('/verified-account'), 100);
                }
            } catch {
                // URL carries no auth code — ignore silently
            }
        };

        Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); });
        const sub = Linking.addEventListener('url', ({ url }) => { if (url) handleDeepLink(url); });
        return () => sub.remove();
    }, []);

    // ── App preparation ───────────────────────────────────────────────────────
    useEffect(() => {
        const prepare = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 80));
            } catch (e) {
                console.warn('[RootLayout] prepare error:', e);
            } finally {
                setAppReady(true);
            }
        };
        prepare();
    }, []);

    // ── Hide splash once fonts + app are ready ────────────────────────────────
    const onLayout = useCallback(async () => {
        if ((fontsLoaded || fontError) && appReady) {
            await SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError, appReady]);

    if ((!fontsLoaded && !fontError) || !appReady) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.root} onLayout={onLayout}>
            <SafeAreaProvider>
                <AuthProvider>
                    <ThemeProvider>
                        <ToastProvider>
                            <RootContent />
                        </ToastProvider>
                    </ThemeProvider>
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROOT CONTENT
───────────────────────────────────────────────────────────────────────────── */
function RootContent() {
    const { colors, darkMode } = useThemeContext();
    const { isLoading } = useAuth();

    useEffect(() => {
        if (Platform.OS === 'android') {
            NavigationBar.setBackgroundColorAsync(colors.card).catch(() => {});
            NavigationBar.setButtonStyleAsync(darkMode ? 'light' : 'dark').catch(() => {});
        }
    }, [darkMode, colors]);

    if (isLoading) {
        return (
            <View style={[styles.loader, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <StatusBar style={darkMode ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index"                options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="LoginScreen"          options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="SignupScreen"         options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="ForgotPasswordScreen" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="reset-password"       options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="verified-account"     options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="(tabs)"               options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="settings/account"       options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="settings/robot"         options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="settings/history"       options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="settings/notifications" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="settings/support"       options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="settings/connection"    options={{ headerShown: false, animation: 'slide_from_right' }} />
            </Stack>
            <ToastNotification />
        </View>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
    root:   { flex: 1 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
});