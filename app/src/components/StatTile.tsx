// src/components/StatTile.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../lib/ThemeContext';

interface StatTileProps {
    label: string;
    value: string | number;
    highlight?: boolean;
    icon?: keyof typeof Ionicons.glyphMap; // optional icon (e.g. "battery-full")
}

/**
 * Clean, modern stat tile component used in dashboards and profile.
 * Supports optional highlight mode and icon.
 */
export default function StatTile({
                                     label,
                                     value,
                                     highlight = false,
                                     icon,
                                 }: StatTileProps) {
    const { colors } = useThemeContext();

    // Safe fallbacks – no crashes if theme is incomplete
    const bgColor = highlight ? `${colors.primary}15` : colors.card;
    const borderColor = highlight ? colors.primary : colors.border;
    const labelColor = highlight ? colors.primary : colors.textSecondary ?? '#6b7280';
    const valueColor = highlight ? colors.primary : colors.text ?? '#111827';

    return (
        <View style={[styles.tile, { backgroundColor: bgColor, borderColor }]}>
            {icon && (
                <View style={[styles.iconContainer, { backgroundColor: highlight ? `${colors.primary}20` : colors.background }]}>
                    <Ionicons
                        name={icon}
                        size={24}
                        color={highlight ? colors.primary : colors.textSecondary}
                    />
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        minHeight: 110,
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