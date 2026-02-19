// src/components/Button.tsx
import React from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    View,
    StyleSheet,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/src/context/ThemeContext';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    icon?: IoniconName;
    loading?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

/**
 * Modern, theme-aware button component.
 * Fully functional with variants, sizes, icons, loading, disabled states.
 * Uses StyleSheet + theme context — no NativeWind.
 */
export default function Button({
                                   title,
                                   onPress,
                                   variant = 'primary',
                                   size = 'medium',
                                   disabled = false,
                                   icon,
                                   loading = false,
                                   fullWidth = false,
                                   style,
                                   textStyle,
                               }: ButtonProps) {
    const { colors, darkMode } = useThemeContext();

    // Safe fallback colors (prevents crashes if theme is incomplete)
    const primaryColor = colors.primary ?? '#2563eb';
    const textBase = colors.text ?? (darkMode ? '#f3f4f6' : '#111827');
    const disabledBg = colors.muted ?? (darkMode ? '#374151' : '#d1d5db');
    const borderColor = colors.border ?? (darkMode ? '#374151' : '#e5e7eb');

    // Variant logic
    const getBackground = () => {
        if (disabled) return disabledBg;
        if (variant === 'primary') return primaryColor;
        if (variant === 'danger') return '#ef4444';
        if (variant === 'secondary') return colors.card ?? '#ffffff';
        return 'transparent'; // outline
    };

    const getBorder = () => {
        if (disabled) return disabledBg;
        if (variant === 'outline' || variant === 'secondary') return borderColor;
        return 'transparent';
    };

    const getTextColor = () => {
        if (disabled) return darkMode ? '#9ca3af' : '#6b7280';
        if (variant === 'primary' || variant === 'danger') return '#ffffff';
        return primaryColor;
    };

    // Size config
    const sizeConfig = {
        small: {
            paddingVertical: 10,
            paddingHorizontal: 16,
            fontSize: 14,
            iconSize: 18,
        },
        medium: {
            paddingVertical: 14,
            paddingHorizontal: 20,
            fontSize: 16,
            iconSize: 20,
        },
        large: {
            paddingVertical: 16,
            paddingHorizontal: 24,
            fontSize: 18,
            iconSize: 24,
        },
    };

    const currentSize = sizeConfig[size];

    // Final button style
    const buttonStyle: ViewStyle = {
        width: fullWidth ? '100%' : undefined,
        height: currentSize.paddingVertical * 2 + currentSize.fontSize + 4, // approximate height
        paddingVertical: currentSize.paddingVertical,
        paddingHorizontal: currentSize.paddingHorizontal,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: getBackground(),
        borderColor: getBorder(),
        borderWidth: variant === 'outline' || variant === 'secondary' ? 1.5 : 0,
        opacity: disabled || loading ? 0.6 : 1,
        ...style,
    };

    const textStyleFinal: TextStyle = {
        fontSize: currentSize.fontSize,
        fontWeight: '600',
        color: getTextColor(),
        marginLeft: icon ? 8 : 0,
        ...textStyle,
    };

    return (
        <TouchableOpacity
            style={buttonStyle}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={disabled || loading ? 1 : 0.85}
            accessibilityLabel={title}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || loading }}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} size="small" />
            ) : (
                <View style={styles.content}>
                    {icon && (
                        <Ionicons
                            name={icon}
                            size={currentSize.iconSize}
                            color={getTextColor()}
                        />
                    )}
                    <Text style={textStyleFinal}>{title}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
});