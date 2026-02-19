// src/components/Header.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeContext } from '@/src/context/ThemeContext';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

/**
 * Clean, modern header component with theme support.
 * Used across all main screens (Login, Signup, Forgot Password, etc.).
 *
 * Features:
 * - Fully StyleSheet-based (no NativeWind/Tailwind)
 * - Theme-aware colors (light/dark mode)
 * - Premium typography (sizes, weights, spacing)
 * - Type-safe, bug-free, no shadows/elevation (flat design match)
 */
export default function Header({ title, subtitle }: HeaderProps) {
    const { colors, darkMode } = useThemeContext();

    // Safe fallbacks in case theme is incomplete
    const titleColor = colors.text ?? (darkMode ? '#f3f4f6' : '#111827');
    const subtitleColor = colors.textSecondary ?? (darkMode ? '#9ca3af' : '#6b7280');

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: titleColor }]}>{title}</Text>

            {subtitle && (
                <Text style={[styles.subtitle, { color: subtitleColor }]}>
                    {subtitle}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
        alignItems: 'center',
        // No shadow/elevation — flat design consistent with your auth screens
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 6,
        textAlign: 'center',
        opacity: 0.85,
    },
});