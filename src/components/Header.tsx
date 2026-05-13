// src/components/Header.tsx
//
// Shared screen header — tab screens and settings screens both use this.
//
// FONT RULE: every string goes through <AppText> which maps fontWeight to the
// correct SF Pro Display .otf file. Never use raw <Text> here.
// No external responsive-utils dependency — plain pixel values only.

import React from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Platform,
    ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/src/context/ThemeContext';
import AppText from '@/src/components/AppText';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
type Props = {
    title:       string;
    subtitle?:   string;
    onSettings?: () => void;
    onBack?:     () => void;
    style?:      ViewStyle;
};

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function Header({ title, subtitle, onSettings, onBack, style }: Props) {
    const { colors, darkMode } = useThemeContext();

    const textPrimary = darkMode ? '#ffffff'                 : colors.text;
    const textSec     = darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';
    const iconBg      = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    return (
        <View style={[s.container, style]}>

            {/* Left: optional back chevron + title block */}
            <View style={s.left}>

                {onBack ? (
                    <TouchableOpacity
                        onPress={onBack}
                        style={[s.iconBtn, { backgroundColor: iconBg }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={22} color={textPrimary} />
                    </TouchableOpacity>
                ) : null}

                <View style={s.titleBlock}>
                    {/*
                      fontWeight '800' in the style object → AppText reads it
                      and injects fontFamily:'SF-Pro-Display-Bold' automatically.
                      Do NOT set fontFamily here.
                    */}
                    <AppText style={[s.title, { color: textPrimary }]}>
                        {title}
                    </AppText>

                    {subtitle ? (
                        <AppText style={[s.subtitle, { color: textSec }]}>
                            {subtitle}
                        </AppText>
                    ) : null}
                </View>
            </View>

            {/* Right: optional settings cog */}
            {onSettings ? (
                <TouchableOpacity
                    onPress={onSettings}
                    style={[s.iconBtn, { backgroundColor: iconBg }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="settings-outline" size={22} color={textPrimary} />
                </TouchableOpacity>
            ) : null}

        </View>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES
   ⚠  No fontFamily — AppText resolves that from fontWeight.
   ⚠  No textTransform:'uppercase' — unreliable on Android with custom fonts.
      Use .toUpperCase() in JSX when you need all-caps.
───────────────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
    container: {
        flexDirection:     'row',
        alignItems:        'flex-start',
        justifyContent:    'space-between',
        paddingHorizontal: 24,
        paddingTop:        Platform.OS === 'android' ? 12 : 4,
        paddingBottom:     8,
    },

    left: {
        flex:          1,
        flexDirection: 'row',
        alignItems:    'flex-start',
        gap:           10,
    },

    titleBlock: {
        flex: 1,
    },

    title: {
        fontSize:      32,
        fontWeight:    '800',  // → SF-Pro-Display-Bold via AppText
        lineHeight:    38,
        letterSpacing: -0.5,
    },

    subtitle: {
        fontSize:      15,
        fontWeight:    '400',  // → SF-Pro-Display-Regular via AppText
        marginTop:     4,
        lineHeight:    20,
        letterSpacing: 0.1,
    },

    iconBtn: {
        width:          40,
        height:         40,
        borderRadius:   20,
        alignItems:     'center',
        justifyContent: 'center',
        marginTop:      4,   // visually align with top of title
    },
});