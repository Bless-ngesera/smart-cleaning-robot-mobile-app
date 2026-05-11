// src/components/AppText.tsx
//
// Drop-in replacement for <Text> that:
//   1. Always uses Inter (loaded in app/_layout.tsx via useFonts).
//   2. Disables system font scaling on every node.
//   3. Maps fontWeight → the correct Inter .ttf filename so Android
//      never synthesises bold from a single font file.
//
// WEIGHT → FILE MAP (only fonts that actually exist in assets/fonts/)
//   '400' / 'normal'  → Inter-Regular
//   '600'             → Inter-SemiBold
//   '700' / 'bold'    → Inter-Bold
//   '800' / '900'     → Inter-ExtraBold
//   '500'             → Inter-Regular (fallback - no Medium font file)
//
// USAGE
//   <AppText style={{ fontSize: 16, color: '#fff' }} fontWeight="700">
//     Hello
//   </AppText>
//
//   Or via style prop (AppText reads fontWeight out of the style array too):
//   <AppText style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>
//     Hello
//   </AppText>

import React from 'react';
import { Text, TextProps, TextStyle, StyleSheet } from 'react-native';

/* ─────────────────────────────────────────────────────────────────────────────
   FONT MAP  — keys must match the strings passed to useFonts() in _layout.tsx
───────────────────────────────────────────────────────────────────────────── */
const FONT_MAP: Record<string, string> = {
    'Inter-Regular':   'Inter-Regular',
    'Inter-SemiBold':  'Inter-SemiBold',
    'Inter-Bold':      'Inter-Bold',
    'Inter-ExtraBold': 'Inter-ExtraBold',
};

function weightToFamily(weight?: TextStyle['fontWeight']): string {
    switch (weight) {
        case '600':
            return FONT_MAP['Inter-SemiBold'];
        case '700':
        case 'bold':
            return FONT_MAP['Inter-Bold'];
        case '800':
        case '900':
            return FONT_MAP['Inter-ExtraBold'];
        case '400':
        case '500':  // Map 500 (Medium) to Regular since Medium font doesn't exist
        case 'normal':
        default:
            return FONT_MAP['Inter-Regular'];
    }
}

/* ─────────────────────────────────────────────────────────────────────────────
   PROPS
───────────────────────────────────────────────────────────────────────────── */
interface AppTextProps extends TextProps {
    /**
     * Convenience prop — identical to setting fontWeight inside `style`.
     * If both are set, this prop wins.
     */
    fontWeight?: TextStyle['fontWeight'];
}

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function AppText({
    style,
    fontWeight,
    children,
    ...rest
}: AppTextProps) {
    // Flatten whatever style(s) were passed so we can read fontWeight out
    const flat = StyleSheet.flatten(style ?? {}) as TextStyle;

    // Prop wins over style; style wins over default
    const resolvedWeight = fontWeight ?? flat.fontWeight ?? '400';
    const fontFamily     = weightToFamily(resolvedWeight);

    return (
        <Text
            allowFontScaling={false}
            maxFontSizeMultiplier={1}
            {...rest}
            style={[
                flat,
                {
                    fontFamily,
                    // Keep fontWeight in the style so React Native's layout
                    // engine uses the right metrics even though we're supplying
                    // a specific font file.
                    fontWeight: resolvedWeight,
                },
            ]}
        >
            {children}
        </Text>
    );
}