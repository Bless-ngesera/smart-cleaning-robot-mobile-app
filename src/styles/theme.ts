// src/styles/theme.ts
import { StyleSheet } from 'react-native';
import { useThemeContext } from '@/src/context/ThemeContext';

export const useAppStyles = () => {
    const { colors, darkMode } = useThemeContext();

    return StyleSheet.create({
        // Global
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },

        // Card (used in Login, Signup, ForgotPassword)
        card: {
            borderRadius: 24,
            padding: 28,
            borderWidth: 1,
            borderColor: darkMode ? 'rgba(255,255,255,0.12)' : colors.border,
            backgroundColor: darkMode ? colors.card : '#ffffff',
        },

        // Form fields
        field: {
            marginBottom: 26,
        },
        label: {
            marginBottom: 6,
            fontSize: 14,
            color: darkMode ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
        },

        // Input
        inputWrapper: {
            position: 'relative',
        },
        input: {
            height: 56,
            borderWidth: 1.2,
            borderRadius: 14,
            paddingLeft: 46,
            paddingRight: 48,
            fontSize: 16,
            borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            color: darkMode ? '#ffffff' : colors.text,
            backgroundColor: 'transparent',
        },
        inputIconLeft: {
            position: 'absolute',
            left: 14,
            top: 18,
            zIndex: 1,
        },
        rightIcon: {
            position: 'absolute',
            right: 14,
            top: 18,
            zIndex: 1,
        },

        // Error
        errorText: {
            color: '#ef4444',
            marginTop: 6,
            fontSize: 13,
        },

        // Buttons
        primaryButton: {
            backgroundColor: colors.primary,
            height: 56,
            borderRadius: 14,
            justifyContent: 'center',
            alignItems: 'center',
        },
        outlineButton: {
            borderWidth: 1.5,
            borderColor: colors.primary,
            height: 56,
            borderRadius: 14,
            justifyContent: 'center',
            alignItems: 'center',
        },

        // Divider
        divider: {
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: 28,
        },
        line: {
            flex: 1,
            height: 1,
            backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        },

        // Links
        link: {
            color: colors.primary,
            textDecorationLine: 'underline',
            fontWeight: '500',
        },

        // Footer
        footer: {
            textAlign: 'center',
            marginTop: 32,
            fontSize: 12,
            color: darkMode ? '#ffffff80' : colors.textSecondary,
            opacity: 0.7,
        },
    });
};