// src/components/Header.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeContext } from '@/src/context/ThemeContext';
import AppText from './AppText';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
    const { colors, darkMode } = useThemeContext();

    const titleColor = colors.text ?? (darkMode ? '#f3f4f6' : '#111827');
    const subtitleColor = colors.textSecondary ?? (darkMode ? '#9ca3af' : '#6b7280');

    return (
        <View style={styles.container}>
            <AppText style={[styles.title, { color: titleColor }]}>{title}</AppText>

            {subtitle && (
                <AppText style={[styles.subtitle, { color: subtitleColor }]}>
                    {subtitle}
                </AppText>
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
