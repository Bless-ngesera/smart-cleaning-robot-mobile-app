// src/components/AppText.tsx
import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useThemeContext } from '@/src/context/ThemeContext';

type AppTextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'button' | 'label';

interface AppTextProps extends TextProps {
    variant?: AppTextVariant;
    style?: TextStyle | TextStyle[];
}

function resolveFontFamily(fontWeight?: string | number): string {
    const w = typeof fontWeight === 'number' ? fontWeight : parseInt(String(fontWeight ?? '400'), 10);
    if (w >= 700) return 'SF-Pro-Display-Bold';
    if (w >= 500) return 'SF-Pro-Display-Semibold';
    return 'SF-Pro-Display-Regular';
}

function extractFontWeight(styles: (TextStyle | null | undefined | false)[]): string | number | undefined {
    let weight: string | number | undefined;
    for (const s of styles) {
        if (s && typeof s === 'object' && 'fontWeight' in s) {
            weight = (s as TextStyle).fontWeight as string | number;
        }
    }
    return weight;
}

export default function AppText({
    children,
    variant = 'body',
    style,
    ...props
}: AppTextProps) {
    const { colors, darkMode } = useThemeContext();

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

    const selectedVariantStyle = variantStyles[variant] ?? variantStyles.body;
    const styleArr = Array.isArray(style) ? style : (style ? [style] : []);
    const effectiveFontWeight = extractFontWeight([selectedVariantStyle, ...styleArr]);
    const fontFamily = resolveFontFamily(effectiveFontWeight);

    return (
        <Text
            style={[{ fontFamily }, selectedVariantStyle, style]}
            allowFontScaling={false}
            {...props}
        >
            {children}
        </Text>
    );
}
