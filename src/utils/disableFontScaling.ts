// src/utils/disableFontScaling.ts
//
// Call disableSystemFontScaling() ONCE at the very top of app/_layout.tsx,
// at module-evaluation time (not inside useEffect or a component body).
//
// We cast to `any` when touching defaultProps because React Native's TypeScript
// typings dropped the defaultProps declaration in newer versions — but the
// runtime property still exists and this is the correct approach for RN.

import { Text, TextInput } from 'react-native';

let patched = false;

export function disableSystemFontScaling(): void {
    if (patched) return;
    patched = true;

    // ── Text ──────────────────────────────────────────────────────────────────
    const TextAny = Text as any;
    if (!TextAny.defaultProps) TextAny.defaultProps = {};
    TextAny.defaultProps.allowFontScaling      = false;
    TextAny.defaultProps.maxFontSizeMultiplier = 1;

    // ── TextInput ─────────────────────────────────────────────────────────────
    const InputAny = TextInput as any;
    if (!InputAny.defaultProps) InputAny.defaultProps = {};
    InputAny.defaultProps.allowFontScaling      = false;
    InputAny.defaultProps.maxFontSizeMultiplier = 1;
}