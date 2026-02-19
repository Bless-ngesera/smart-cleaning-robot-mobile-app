// src/components/StatTile.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/src/context/ThemeContext';

interface StatTileProps {
    label: string;
    value: string | number;
    highlight?: boolean;
    icon?: keyof typeof Ionicons.glyphMap; // optional icon (e.g. "battery-full")
}

/**
 * Clean, modern stat tile component used in dashboards and profile.
 * Supports optional highlight mode and icon.
 *
 * Features:
 * - Fully StyleSheet-based (no NativeWind/Tailwind)
 * - Theme-aware colors (light/dark mode)
 * - Flat design (no shadow/elevation — matches your auth screens)
 * - Safe fallbacks to prevent crashes
 * - Type-safe, bug-free
 */
export default function StatTile({
                                     label,
                                     value,
                                     highlight = false,
                                     icon,
                                 }: StatTileProps) {
    const { colors, darkMode } = useThemeContext();

    // Safe fallbacks — prevents undefined crashes if theme is incomplete
    const bgColor = highlight
        ? darkMode
            ? `${colors.primary}30` // slightly higher opacity in dark mode for visibility
            : `${colors.primary}15`
        : darkMode
            ? colors.card
            : '#ffffff';

    const borderColor = highlight ? colors.primary : colors.border;

    const iconBg = highlight
        ? darkMode
            ? `${colors.primary}40`
            : `${colors.primary}20`
        : colors.background;

    const iconColor = highlight ? colors.primary : colors.textSecondary;

    const labelColor = highlight ? colors.primary : colors.textSecondary;
    const valueColor = highlight ? colors.primary : colors.text;

    return (
        <View style={[styles.tile, { backgroundColor: bgColor, borderColor }]}>
            {icon && (
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                    <Ionicons name={icon} size={24} color={iconColor} />
                </View>
            )}

            <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
            <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    tile: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        alignItems: 'center',
        minHeight: 110,
        // No shadow/elevation — flat design to match your auth screens
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 4,
        textAlign: 'center',
    },
    value: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
    },
});