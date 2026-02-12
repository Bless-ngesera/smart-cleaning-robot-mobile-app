// src/components/AppText.tsx
import React from 'react';
import { Text, TextProps } from 'react-native';

/**
 * AppText - Global text component with premium typography defaults
 *
 * Features:
 * - Uses SF Pro Display fonts (via Tailwind classes)
 * - Enforces your design tokens (font family, colors, sizes)
 * - Disables system font scaling by default (premium consistency)
 * - Fully responsive via NativeWind rem units
 * - Easy to override with className
 * - Type-safe & bug-free
 */

export default function AppText({
                                    className = '',
                                    style,
                                    children,
                                    ...props
                                }: TextProps) {
    return (
        <Text
            // Core defaults — always applied first
            className={`
        font-regular           // Default: SF-Pro-Display-Regular
        text-textPrimary       // Default text color from your theme
        text-base              // Default size: 16px / 1rem
        leading-normal         // Clean line height
        ${className}           // Allow overrides: font-bold, text-xl, etc.
      `}
            style={style}
            allowFontScaling={false} // Enforce: no system size override
            {...props}
        >
            {children}
        </Text>
    );
}

// Optional: Variant helper (very clean & premium usage)
type AppTextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'button' | 'label';

interface AppTextVariantProps extends TextProps {
    variant?: AppTextVariant;
}

const variantClasses: Record<AppTextVariant, string> = {
    title:    'font-bold text-2xl leading-tight tracking-tight',
    subtitle: 'font-semibold text-xl leading-snug',
    body:     'font-regular text-base leading-relaxed',
    caption:  'font-regular text-sm text-textSecondary leading-snug',
    button:   'font-semibold text-base leading-none',
    label:    'font-medium text-sm text-textSecondary uppercase tracking-wide',
};

export function AppTextVariant({
                                   variant = 'body',
                                   className = '',
                                   ...props
                               }: AppTextVariantProps) {
    return (
        <AppText
            className={`${variantClasses[variant]} ${className}`}
            {...props}
        />
    );
}