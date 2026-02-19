// src/components/AppText.tsx
import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { useThemeContext } from '@/src/context/ThemeContext';

type AppTextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'button' | 'label';

interface AppTextProps extends TextProps {
    variant?: AppTextVariant;
    style?: TextStyle | TextStyle[];
}

/**
 * AppText - Global text component with premium typography defaults
 *
 * - Uses theme colors from ThemeContext
 * - Variant-based styling (title, subtitle, body, etc.)
 * - Disables system font scaling for consistency
 * - Fully StyleSheet-based (no NativeWind/Tailwind)
 * - Type-safe, bug-free, easy to override
 */
export default function AppText({
                                    children,
                                    variant = 'body',
                                    style,
                                    ...props
                                }: AppTextProps) {
    const { colors, darkMode } = useThemeContext();

    // Define styles for each variant
    const variantStyles: Record<AppTextVariant, TextStyle> = {
        title: {
            fontSize: 24,
            fontWeight: '700',
            lineHeight: 32,
            letterSpacing: -0.5,
            color: colors.text,
        },
        subtitle: {
            fontSize: 20,
            fontWeight: '600',
            lineHeight: 28,
            color: darkMode ? colors.subtitle || colors.textSecondary : colors.subtitle || colors.textSecondary,
        },
        body: {
            fontSize: 16,
            fontWeight: '400',
            lineHeight: 24,
            color: colors.text,
        },
        caption: {
            fontSize: 14,
            fontWeight: '400',
            lineHeight: 20,
            color: colors.textSecondary,
        },
        button: {
            fontSize: 16,
            fontWeight: '600',
            lineHeight: 20,
            color: colors.text,
        },
        label: {
            fontSize: 14,
            fontWeight: '500',
            lineHeight: 20,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
    };

    // Get the variant style — fallback to 'body' if invalid variant
    const selectedVariantStyle = variantStyles[variant] ?? variantStyles.body;

    return (
        <Text
            style={[styles.base, selectedVariantStyle, style]}
            allowFontScaling={false} // Enforce consistent size across devices
            {...props}
        >
            {children}
        </Text>
    );
}

const styles = StyleSheet.create({
    base: {
        // Global defaults (add custom fontFamily here if loaded)
        fontFamily: 'System',
    },
});