// src/components/StatTile.tsx
//
// Compact stat tile used on Dashboard, Map, Schedule, and Profile screens.
//
// RULES:
//   • Never use raw <Text> — always <AppText>.
//   • Never set fontFamily in StyleSheet — AppText injects it from fontWeight.
//   • Label is uppercased in JSX, not via textTransform (consistent cross-platform).
//   • numberOfLines={1} + adjustsFontSizeToFit on the value prevents overflow.

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/src/context/ThemeContext';
import AppText from '@/src/components/AppText';
import { rs, rp, rf } from '@/src/utils/responsive';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
type Props = {
    label:      string;
    value:      string | number;
    icon?:      keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    style?:     ViewStyle;
};

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function StatTile({ label, value, icon, iconColor, style }: Props) {
    const { colors, darkMode } = useThemeContext();

    const cardBg     = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSec     = darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
    const resolvedIconColor = iconColor ?? colors.primary;

    return (
        <View
            style={[
                styles.tile,
                {
                    backgroundColor: cardBg,
                    borderColor:     cardBorder,
                },
                style,
            ]}
        >
            {icon && (
                <Ionicons
                    name={icon}
                    size={rs(22)}
                    color={resolvedIconColor}
                    style={styles.icon}
                />
            )}

            {/* Value — Inter-Bold, never wraps */}
            <AppText
                style={[styles.value, { color: textPrimary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
            >
                {String(value)}
            </AppText>

            {/* Label — Inter-SemiBold, uppercased, never wraps */}
            <AppText
                style={[styles.label, { color: textSec }]}
                numberOfLines={1}
            >
                {String(label).toUpperCase()}
            </AppText>
        </View>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES
   No fontFamily — AppText handles that via fontWeight.
───────────────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
    tile: {
        flex:           1,
        alignItems:     'center',
        justifyContent: 'center',
        borderRadius:   rs(14),
        borderWidth:    1,
        padding:        rp(12),
        minHeight:      rs(80),
    },
    icon: {
        marginBottom: rs(4),
    },
    value: {
        fontSize:   rf(20),
        fontWeight: '700',  // → Inter-Bold via AppText
        lineHeight: rf(26),
    },
    label: {
        fontSize:   rf(10),
        fontWeight: '600',  // → Inter-SemiBold via AppText
        marginTop:  rs(2),
        letterSpacing: 0.5,
        textAlign:  'center',
    },
});