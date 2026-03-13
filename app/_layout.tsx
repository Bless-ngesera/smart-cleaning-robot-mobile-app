// app/_layout.tsx
import React, { useEffect, useCallback, useState } from 'react';
import { View, Platform, ActivityIndicator } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeContext } from '@/src/context/ThemeContext';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';

import { disableSystemFontScaling } from '@/src/utils/disableFontScaling';

disableSystemFontScaling();
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        'SF-Pro-Display-Regular': require('../assets/fonts/SF-Pro-Display-Regular.otf'),
        'SF-Pro-Display-Semibold': require('../assets/fonts/SF-Pro-Display-Semibold.otf'),
        'SF-Pro-Display-Bold': require('../assets/fonts/SF-Pro-Display-Bold.otf'),
    });

    const [appIsReady, setAppIsReady] = useState(false);

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
                    <RootContent onLayout={onLayoutRootView} />
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
        </View>
    );
}