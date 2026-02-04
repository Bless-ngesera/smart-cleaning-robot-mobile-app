// src/components/Loader.tsx
import React from 'react';
import {
    ActivityIndicator,
    View,
    Text,
    StyleSheet,
    Platform,
} from 'react-native';
import { useThemeContext } from '../lib/ThemeContext';

interface LoaderProps {
    message?: string;
    size?: 'small' | 'large'; // optional override
    color?: string;           // optional override
}

/**
 * Full-screen centered loading indicator with theme-aware styling.
 */
export default function Loader({
                                   message = 'Loading...',
                                   size = 'large',
                                   color: overrideColor,
                               }: LoaderProps) {
    const { colors } = useThemeContext();

    // Safe fallbacks – prevents undefined crashes
    const spinnerColor = overrideColor ?? colors.primary ?? '#2563eb';
    const textColor = colors.textSecondary ?? colors.text ?? '#6b7280';
    const bgColor = colors.background ?? '#f9fafb';

    return (
        <View
            style={[styles.container, { backgroundColor: bgColor }]}
            accessibilityRole="progressbar"
            accessibilityLabel={message}
            accessibilityHint="Loading in progress"
        >
            <ActivityIndicator
                size={size}
                color={spinnerColor}
                animating
            />

            {message && (
                <Text style={[styles.message, { color: textColor }]}>
                    {message}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    message: {
        marginTop: 16,
        fontSize: Platform.OS === 'ios' ? 15 : 16,
        fontWeight: '500',
        textAlign: 'center',
        letterSpacing: 0.2,
    },
});