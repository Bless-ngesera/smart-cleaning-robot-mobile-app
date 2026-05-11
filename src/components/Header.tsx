// src/components/Header.tsx
//
// Shared screen header used on every tab and settings screen.
//
// RULES (enforced here):
//   • NEVER raw <Text> — always <AppText>.
//   • NEVER fontFamily in StyleSheet — AppText maps fontWeight → Inter .ttf.
//   • allowFontScaling / maxFontSizeMultiplier are set inside AppText globally.

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
export default function Header({
    title,
    subtitle,
    onSettings,
    onBack,
    style,
}: Props) {
    const { colors, darkMode } = useThemeContext();

    // ── Dark-mode design tokens (match every other screen) ──────────────────
    const textPrimary = darkMode ? '#ffffff'                    : colors.text;
    const textSec     = darkMode ? 'rgba(255,255,255,0.65)'    : 'rgba(0,0,0,0.55)';
    const iconBg      = darkMode ? 'rgba(255,255,255,0.08)'    : 'rgba(0,0,0,0.06)';

    return (
        <View style={[styles.container, style]}>

            {/* ── Left: optional back chevron + title block ─────────────── */}
            <View style={styles.left}>

                {onBack && (
                    <TouchableOpacity
                        onPress={onBack}
                        style={[styles.iconBtn, { backgroundColor: iconBg }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={20}
                            color={textPrimary}
                        />
                    </TouchableOpacity>
                )}

                <View style={onBack ? styles.titleWithBack : styles.titleBlock}>

                    {/*
                     * fontWeight '800' → AppText maps this to Inter-ExtraBold.ttf
                     * Do NOT add fontFamily here — AppText injects it.
                     */}
                    <AppText
                        style={[
                            styles.title,
                            { color: textPrimary },
                        ]}
                        fontWeight="800"
                    >
                        {title}
                    </AppText>

                    {/*
                     * fontWeight '400' → AppText maps this to Inter-Regular.ttf
                     */}
                    {subtitle ? (
                        <AppText
                            style={[
                                styles.subtitle,
                                { color: textSec },
                            ]}
                            fontWeight="400"
                        >
                            {subtitle}
                        </AppText>
                    ) : null}

                </View>
            </View>

            {/* ── Right: optional settings cog ──────────────────────────── */}
            {onSettings && (
                <TouchableOpacity
                    onPress={onSettings}
                    style={[styles.iconBtn, { backgroundColor: iconBg }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="settings-outline"
                        size={20}
                        color={textPrimary}
                    />
                </TouchableOpacity>
            )}

        </View>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES
   ⚠️  NO fontFamily here — AppText handles that from fontWeight.
   ⚠️  NO textTransform — unreliable with custom fonts on Android.
       Call .toUpperCase() in JSX if you need all-caps.
───────────────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
    container: {
        flexDirection:     'row',
        alignItems:        'flex-start',
        justifyContent:    'space-between',
        paddingHorizontal: 20,
        paddingTop:        Platform.OS === 'android' ? 12 : 4,
        paddingBottom:     8,
    },

    left: {
        flex:          1,
        flexDirection: 'row',
        alignItems:    'flex-start',
        gap:           10,
    },

    // Used when there's a back button — let title fill remaining width
    titleWithBack: {
        flex: 1,
    },

    // Used when there's no back button — same flex so subtitle wraps properly
    titleBlock: {
        flex: 1,
    },

    title: {
        fontSize:   28,
        lineHeight: 34,
    },

    subtitle: {
        fontSize:   14,
        marginTop:  2,
        lineHeight: 20,
    },

    iconBtn: {
        width:          38,
        height:         38,
        borderRadius:   19,
        alignItems:     'center',
        justifyContent: 'center',
    },
});