// app/_layout.tsx
import React, { useEffect } from 'react';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeContext } from '@/src/context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// ──────────────────────────────────────────────
// Import the global font scaling override
// ──────────────────────────────────────────────
import { disableSystemFontScaling } from '@/src/utils/disableFontScaling';

// Run the override **before** anything renders
disableSystemFontScaling();

// Prevent splash screen from auto-hiding until fonts are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    // Load SF Pro Display fonts (all weights)
    const [fontsLoaded, fontError] = useFonts({
        'SF-Pro-Display-Regular': require('../assets/fonts/SF-Pro-Display-Regular.otf'),
        'SF-Pro-Display-Semibold': require('../assets/fonts/SF-Pro-Display-Semibold.otf'),
        'SF-Pro-Display-Bold': require('../assets/fonts/SF-Pro-Display-Bold.otf'),
    });

    useEffect(() => {
        if (fontsLoaded || fontError) {
            // Fonts are ready (or failed) → hide splash screen
            SplashScreen.hideAsync();
        }

        // Debug logs – very useful during development
        if (fontsLoaded) {
            console.log('✅ All SF Pro Display fonts loaded successfully');
            console.log('   • Regular: SF-Pro-Display-Regular');
            console.log('   • Semibold: SF-Pro-Display-Semibold');
            console.log('   • Bold: SF-Pro-Display-Bold');
        }

        if (fontError) {
            console.error('❌ Font loading failed:', fontError.message);
            console.warn('Falling back to system font – check file paths and extensions');
        }
    }, [fontsLoaded, fontError]);

    // While fonts are loading → show nothing (prevents wrong font flash)
    if (!fontsLoaded && !fontError) {
        return null;
    }

    // Optional: Show a fallback UI if fonts fail completely
    if (fontError) {
        console.warn('Font loading error – using system font fallback');
    }

    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <RootContent />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

// Inner component – safely accesses theme context
function RootContent() {
    const { darkMode } = useThemeContext();

    return (
        <>
            {/* Dynamic status bar: light icons in dark mode, dark in light */}
            <StatusBar style={darkMode ? 'light' : 'dark'} />

            {/* Main app content – all routes render here */}
            <Slot />
        </>
    );
}