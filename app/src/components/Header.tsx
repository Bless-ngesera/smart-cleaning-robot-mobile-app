// src/components/Header.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeContext } from '../context/ThemeContext';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

/**
 * Clean, modern header component with theme support.
 * Used across all main screens.
 */
export default function Header({ title, subtitle }: HeaderProps) {
    const { colors } = useThemeContext();

    // Safe fallbacks – prevents crashes if theme is not fully loaded
    const titleColor = colors.text ?? '#111827';
    const subtitleColor = colors.textSecondary ?? '#6B7280';

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
        // Optional subtle shadow – looks good on both light/dark
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 6,
        textAlign: 'center',
        opacity: 0.85,
    },
});