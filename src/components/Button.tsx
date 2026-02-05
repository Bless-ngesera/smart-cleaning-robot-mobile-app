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
import { useThemeContext } from '../context/ThemeContext';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

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
}

/**
 * Modern, theme-aware button component.
 * Supports variants, sizes, icons, loading state, and disabled.
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
                               }: ButtonProps) {
    const { colors } = useThemeContext();

    // Safe fallbacks – no crashes if theme is incomplete
    const primaryColor = colors.primary ?? '#2563eb';
    const textColorBase = colors.text ?? '#111827';
    const bgDisabled = colors.border ?? '#d1d5db';

    // Variant styles
    const getBackground = () => {
        if (disabled) return bgDisabled;
        switch (variant) {
            case 'primary': return primaryColor;
            case 'danger': return '#ef4444';
            case 'secondary': return colors.card ?? '#ffffff';
            case 'outline': return 'transparent';
            default: return primaryColor;
        }
    };

    const getBorder = () => {
        if (disabled) return bgDisabled;
        if (variant === 'outline') return colors.border ?? '#d1d5db';
        if (variant === 'secondary') return colors.border ?? '#d1d5db';
        return 'transparent';
    };

    const getTextColor = () => {
        if (disabled) return '#9ca3af';
        if (variant === 'primary' || variant === 'danger') return '#ffffff';
        return textColorBase;
    };

    // Size styles
    const sizeStyles = {
        small: {
            paddingVertical: 8,
            paddingHorizontal: 16,
            fontSize: 14,
            iconSize: 18,
        },
        medium: {
            paddingVertical: 12,
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

    const currentSize = sizeStyles[size];

    const buttonStyle: ViewStyle = {
        width: fullWidth ? '100%' : undefined,
        paddingVertical: currentSize.paddingVertical,
        paddingHorizontal: currentSize.paddingHorizontal,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: getBackground(),
        borderColor: getBorder(),
        borderWidth: variant === 'outline' || variant === 'secondary' ? 1.5 : 0,
        opacity: disabled ? 0.6 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: variant === 'primary' ? 0.15 : 0.06,
        shadowRadius: 6,
        elevation: variant === 'primary' ? 4 : 2,
        ...style,
    };

    const textStyle: TextStyle = {
        fontSize: currentSize.fontSize,
        fontWeight: '600',
        color: getTextColor(),
        marginLeft: icon ? 8 : 0,
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
            {/* C++ BRIDGE: If button triggers native robot commands,
          connect here via RobotBridge.start(), stop(), etc. */}

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
                    <Text style={textStyle}>{title}</Text>
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