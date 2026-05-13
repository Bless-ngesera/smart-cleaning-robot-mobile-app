// src/components/AppText.tsx
//
// Drop-in replacement for React Native <Text>.
// Reads fontWeight from your style and injects the correct SF Pro Display
// font file as fontFamily — fixes Android which cannot synthesise bold from
// a single font file the way iOS does.
//
// FONTS required in assets/fonts/ (registered in app/_layout.tsx):
//   SF-Pro-Display-Regular.otf
//   SF-Pro-Display-Semibold.otf
//   SF-Pro-Display-Bold.otf

import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';

type Props = TextProps & {
    style?: TextStyle | TextStyle[] | null;
};

function resolveFontFamily(style?: TextStyle | TextStyle[] | null): string {
    const flat = StyleSheet.flatten(style ?? {}) as TextStyle;
    const w = flat?.fontWeight;
    if (w === 'bold' || w === '700' || w === '800' || w === '900') return 'SF-Pro-Display-Bold';
    if (w === '600' || w === '500')                                  return 'SF-Pro-Display-Semibold';
    return 'SF-Pro-Display-Regular';
}

export default function AppText({ style, ...props }: Props) {
    return (
        <Text
            allowFontScaling={false}
            style={[s.base, style, { fontFamily: resolveFontFamily(style) }]}
            {...props}
        />
    );
}

const s = StyleSheet.create({
    base: { fontFamily: 'SF-Pro-Display-Regular' },
});