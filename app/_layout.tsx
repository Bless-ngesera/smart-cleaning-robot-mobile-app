// app/_layout.tsx  (root layout)
import React from 'react';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeContext } from './src/context/ThemeContext'; // correct path
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <RootContent />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

// Separated content so we can access theme context safely
function RootContent() {
    const { darkMode } = useThemeContext();

    return (
        <>
            {/* Dynamic status bar – white icons in dark mode, black in light */}
            <StatusBar style={darkMode ? 'light' : 'dark'} />

            {/* Main app content */}
            <Slot />
        </>
    );
}