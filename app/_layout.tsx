// app/_layout.tsx  (root layout)
import React, { useEffect } from 'react';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeContext } from '@/src/context/ThemeContext'; // ← correct path (lib)
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Prevent splash screen from auto-hiding until fonts are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    // Load your renamed Inter variable font (one file covers all weights)
    const [fontsLoaded, fontError] = useFonts({
        'Inter-Variable': require('../assets/fonts/Inter-Variable.ttf'),
    });

    useEffect(() => {
        if (fontsLoaded || fontError) {
            // Fonts loaded successfully or failed → hide splash
            SplashScreen.hideAsync();
        }

        // Debug logging (visible in terminal / Expo logs)
        if (fontsLoaded) {
            console.log('✅ Font "Inter-Variable" loaded successfully');
        }
        if (fontError) {
            console.error('❌ Font loading failed:', fontError.message);
        }
    }, [fontsLoaded, fontError]);

    // If font loading is still in progress → show nothing (prevents wrong font flash)
    if (!fontsLoaded && !fontError) {
        return null;
    }

    // Fallback UI if font fails (prevents app from being stuck forever)
    if (fontError) {
        console.warn('Font loading error – falling back to system font');
    }

    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <RootContent />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

// Inner component to safely access theme context
function RootContent() {
    const { darkMode } = useThemeContext();

    return (
        <>
            {/* Dynamic status bar: white icons in dark mode, black in light */}
            <StatusBar style={darkMode ? 'light' : 'dark'} />

            {/* Main app content – all routes go here */}
            <Slot />
        </>
    );
}