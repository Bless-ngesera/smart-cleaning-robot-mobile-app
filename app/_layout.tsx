// app/_layout.tsx

import React, { useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeContext } from '@/src/context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Disable system font scaling globally
import { disableSystemFontScaling } from '@/src/utils/disableFontScaling';

// Run BEFORE render
disableSystemFontScaling();

// Prevent splash auto-hide
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        'SF-Pro-Display-Regular': require('../assets/fonts/SF-Pro-Display-Regular.otf'),
        'SF-Pro-Display-Semibold': require('../assets/fonts/SF-Pro-Display-Semibold.otf'),
        'SF-Pro-Display-Bold': require('../assets/fonts/SF-Pro-Display-Bold.otf'),
    });

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded || fontError) {
            await SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError]);

    if (!fontsLoaded && !fontError) {
        return null;
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

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.card, // 🔥 CRITICAL FIX (removes white bottom space)
            }}
            onLayout={onLayout}
        >
            <StatusBar style={darkMode ? 'light' : 'dark'} />
            <Slot />
        </View>
    );
}