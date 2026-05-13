// src/components/Button.tsx
//
// Shared button used across every screen.
// Uses AppText so SF Pro Display renders on both iOS and Android.
// Supports: primary, outline, danger, disabled variants.

import React from 'react';
import {
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
    ActivityIndicator,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/src/context/ThemeContext';
import AppText from '@/src/components/AppText';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
type Variant = 'primary' | 'outline' | 'danger' | 'disabled';

type Props = {
    title:     string;
    onPress:   () => void;
    variant?:  Variant;
    icon?:     keyof typeof Ionicons.glyphMap;
    loading?:  boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    style?:    ViewStyle;
    danger?:   boolean;   // shorthand for variant='danger' on outline buttons
};

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function Button({
    title,
    onPress,
    variant  = 'primary',
    icon,
    loading  = false,
    disabled = false,
    fullWidth = false,
    style,
    danger   = false,
}: Props) {
    const { colors } = useThemeContext();

    // Resolve effective variant
    const effectiveVariant: Variant =
        disabled ? 'disabled' :
        danger   ? 'danger'   :
        variant;

    const isDisabled = effectiveVariant === 'disabled' || disabled || loading;

    // Background
    const bg =
        effectiveVariant === 'primary'  ? colors.primary            :
        effectiveVariant === 'danger'   ? '#DC2626'                  :
        effectiveVariant === 'outline'  ? 'transparent'             :
                                          'rgba(120,120,120,0.15)';

    // Text / icon colour
    const fg =
        effectiveVariant === 'primary'  ? '#ffffff'                  :
        effectiveVariant === 'danger'   ? '#ffffff'                  :
        effectiveVariant === 'outline'  ? colors.primary             :
                                          'rgba(140,140,140,0.85)';

    // Border
    const borderColor =
        effectiveVariant === 'outline'  ? colors.primary             :
        effectiveVariant === 'disabled' ? 'rgba(120,120,120,0.25)'   :
                                          'transparent';

    const hasBorder = effectiveVariant === 'outline' || effectiveVariant === 'disabled';

    return (
        <TouchableOpacity
            onPress={isDisabled ? undefined : onPress}
            activeOpacity={isDisabled ? 1 : 0.78}
            style={[
                s.btn,
                fullWidth && s.fullWidth,
                {
                    backgroundColor: bg,
                    borderColor,
                    borderWidth: hasBorder ? 1.5 : 0,
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator size="small" color={fg} />
            ) : (
                <View style={s.inner}>
                    {icon ? (
                        <Ionicons name={icon} size={18} color={fg} style={s.icon} />
                    ) : null}
                    <AppText style={[s.label, { color: fg }]}>
                        {title}
                    </AppText>
                </View>
            )}
        </TouchableOpacity>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
    btn: {
        paddingVertical:   15,
        paddingHorizontal: 20,
        borderRadius:      14,
        minHeight:         52,
        alignItems:        'center',
        justifyContent:    'center',
    },
    fullWidth: {
        width: '100%',
    },
    inner: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            8,
    },
    icon: {
        // no margin needed — gap on inner handles spacing
    },
    label: {
        fontSize:      16,
        fontWeight:    '700',   // → SF-Pro-Display-Bold via AppText
        letterSpacing: 0.2,
    },
});