// src/components/Loader.tsx
import React from 'react';
import {
    ActivityIndicator,
    View,
    Text,
    StyleSheet,
    Platform,
} from 'react-native';
import { useThemeContext } from '@/src/context/ThemeContext';

interface LoaderProps {
    message?: string;
    size?: 'small' | 'large';
    color?: string; // optional override
}

/**
 * Full-screen centered loading indicator with theme-aware styling.
 * Used when loading data, sending reset links, signing up, etc.
 *
 * Features:
 * - Fully StyleSheet-based (no NativeWind/Tailwind)
 * - Theme colors from context (light/dark mode)
 * - Safe fallbacks to prevent crashes
 * - Accessibility support
 * - Type-safe, bug-free
 */
export default function Loader({
                                   message = 'Loading...',
                                   size = 'large',
                                   color: overrideColor,
                               }: LoaderProps) {
    const { colors, darkMode } = useThemeContext();

    // Safe fallbacks — prevents undefined crashes if theme is incomplete
    const spinnerColor = overrideColor ?? colors.primary ?? '#2563eb';
    const textColor = colors.textSecondary ?? (darkMode ? '#9ca3af' : '#6b7280');
    const bgColor = colors.background ?? (darkMode ? '#0f172a' : '#f9fafb');

    return (
        <View
            style={[styles.container, { backgroundColor: bgColor }]}
            accessibilityRole="progressbar"
            accessibilityLabel={message}
            accessibilityHint="Loading in progress"
            accessibilityLiveRegion="polite"
        >
            <ActivityIndicator
                size={size}
                color={spinnerColor}
                animating
            />

            {message && (
                <Text style={[styles.message, { color: textColor }]}>
                    {message}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    message: {
        marginTop: 16,
        fontSize: Platform.OS === 'ios' ? 15 : 16,
        fontWeight: '500',
        textAlign: 'center',
        letterSpacing: 0.2,
    },
});