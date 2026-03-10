// app/_layout.tsx

import React, { useEffect, useCallback, useState } from 'react';
import { View, Platform, ActivityIndicator } from 'react-native';
import { Slot, router, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeContext } from '@/src/context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { supabase } from '@/src/services/supabase';

import { disableSystemFontScaling } from '@/src/utils/disableFontScaling';

disableSystemFontScaling();
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        'SF-Pro-Display-Regular': require('../assets/fonts/SF-Pro-Display-Regular.otf'),
        'SF-Pro-Display-Semibold': require('../assets/fonts/SF-Pro-Display-Semibold.otf'),
        'SF-Pro-Display-Bold': require('../assets/fonts/SF-Pro-Display-Bold.otf'),
    });

    const [appIsReady, setAppIsReady] = useState(false);

    useEffect(() => {
        async function prepare() {
            try {
                // Check for existing session
                const { data: { session } } = await supabase.auth.getSession();

                // You can do any additional initialization here
                await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for smooth transition
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
                <RootContent onLayout={onLayoutRootView} />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

function RootContent({ onLayout }: { onLayout: () => void }) {
    const { darkMode, colors } = useThemeContext();
    const segments = useSegments();
    const [isNavigationReady, setIsNavigationReady] = useState(false);
    const [initialRoute, setInitialRoute] = useState<string | null>(null);

    // 🔥 ANDROID NAVIGATION BAR FIX
    useEffect(() => {
        if (Platform.OS === 'android') {
            NavigationBar.setBackgroundColorAsync(colors.card);
            NavigationBar.setButtonStyleAsync(darkMode ? 'light' : 'dark');
        }
    }, [darkMode, colors]);

    // 🔥 AUTH STATE LISTENER
    useEffect(() => {
        // Check initial session
        checkUser();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);

            if (event === 'SIGNED_IN' && session) {
                // User signed in, go to dashboard
                if (session.user.email_confirmed_at) {
                    router.replace('/(tabs)/01_DashboardScreen');
                } else {
                    router.replace('/verified-account');
                }
            } else if (event === 'SIGNED_OUT') {
                // User signed out, go to login
                router.replace('/LoginScreen');
            } else if (event === 'PASSWORD_RECOVERY') {
                // Password recovery email clicked
                router.replace('/reset-password');
            } else if (event === 'USER_UPDATED') {
                // User updated (email verified, etc)
                if (session?.user.email_confirmed_at) {
                    router.replace('/(tabs)/01_DashboardScreen');
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 🔥 NAVIGATION GUARD
    useEffect(() => {
        if (!isNavigationReady || !initialRoute) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inTabsGroup = segments[0] === '(tabs)';
        const inPublicRoute = ['LoginScreen', 'SignupScreen', 'ForgotPasswordScreen', 'reset-password', 'verified-account'].includes(segments[0] || '');

        // Check if current route is protected
        const isProtectedRoute = inTabsGroup || segments[0] === 'settings';

        if (initialRoute === '/LoginScreen' && isProtectedRoute) {
            // User is not authenticated but trying to access protected route
            router.replace('/LoginScreen');
        } else if (initialRoute === '/(tabs)/01_DashboardScreen' && (inPublicRoute || inAuthGroup)) {
            // User is authenticated but trying to access public route
            router.replace('/(tabs)/01_DashboardScreen');
        }
    }, [segments, isNavigationReady, initialRoute]);

    // 🔥 CHECK USER SESSION
    const checkUser = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            let route = '/LoginScreen';

            if (session) {
                if (session.user.email_confirmed_at) {
                    route = '/(tabs)/01_DashboardScreen';
                } else {
                    route = '/verified-account';
                }
            }

            setInitialRoute(route);

            // Small delay to ensure navigation is ready
            setTimeout(() => {
                setIsNavigationReady(true);
                router.replace(route);
            }, 100);

        } catch (error) {
            console.error('Auth check error:', error);
            setInitialRoute('/LoginScreen');
            setIsNavigationReady(true);
            router.replace('/LoginScreen');
        }
    };

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
        </View>
    );
}