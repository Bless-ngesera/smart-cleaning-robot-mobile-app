// src/utils/disableFontScaling.ts
//
// Patches React Native's Text and TextInput at the defaultProps level so the
// phone's "Font Size" / "Display Size" accessibility setting has zero effect.
//
// Call disableSystemFontScaling() ONCE as the very first side-effect in
// app/_layout.tsx — before any other import that could render a Text node.
//
// DO NOT call this inside screen files. By the time a screen module is
// evaluated, React Native may have already constructed Text nodes.
//
// NOTE: This patch is INSUFFICIENT on its own for two cases:
//   1. React Navigation / Expo Router tab bar labels — those use an internal
//      Text that doesn't pick up defaultProps. Fix: custom tabBarLabel with
//      <AppText> on every <Tabs.Screen> in app/(tabs)/_layout.tsx.
//   2. Any third-party component that renders its own <Text> internally.
//      Fix: wrap or replace those components so they use <AppText> instead.
//
// For our own code, AppText also sets allowFontScaling={false} and
// maxFontSizeMultiplier={1} explicitly on every render (belt-and-suspenders).

import { Text, TextInput } from 'react-native';

export function disableSystemFontScaling(): void {
    // ── Text ─────────────────────────────────────────────────────────────────
    const T = Text as any;
    T.defaultProps = {
        ...(T.defaultProps ?? {}),
        allowFontScaling:      false,
        maxFontSizeMultiplier: 1,
    };

    // ── TextInput ─────────────────────────────────────────────────────────────
    const TI = TextInput as any;
    TI.defaultProps = {
        ...(TI.defaultProps ?? {}),
        allowFontScaling:      false,
        maxFontSizeMultiplier: 1,
    };

    // ── Dev-mode verification ──────────────────────────────────────────────────
    // Warns if a future RN version stops honouring defaultProps on host
    // components. AppText's explicit props are the real last line of defence.
    if (__DEV__) {
        const tProps = (Text as any).defaultProps ?? {};
        if (tProps.allowFontScaling !== false || tProps.maxFontSizeMultiplier !== 1) {
            console.warn(
                '[disableFontScaling] Text.defaultProps patch may not have applied. ' +
                'Check your React Native version. AppText explicit props still protect ' +
                'all <AppText> nodes, but raw <Text> nodes may still scale.'
            );
        }
    }
}