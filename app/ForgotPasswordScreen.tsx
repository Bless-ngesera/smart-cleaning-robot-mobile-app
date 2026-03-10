// app/ForgotPasswordScreen.tsx
import React, { useState, useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import Header from '../src/components/Header';
import Loader from '../src/components/Loader';
import Button from '../src/components/Button';
import AppText from '../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import authService from '@/src/services/auth';

const { width } = Dimensions.get('window');
const isLargeScreen = width >= 768;

export default function ForgotPasswordScreen() {
    const { colors, darkMode } = useThemeContext();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [emailError, setEmailError] = useState('');

    const emailShake = useRef(new Animated.Value(0)).current;
    const emailRef = useRef<TextInput>(null);

    const shakeField = () => {
        Animated.sequence([
            Animated.timing(emailShake, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(emailShake, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(emailShake, { toValue: 5, duration: 50, useNativeDriver: true }),
            Animated.timing(emailShake, { toValue: -5, duration: 50, useNativeDriver: true }),
            Animated.timing(emailShake, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const validateEmail = (): boolean => {
        setEmailError('');

        if (!email.trim()) {
            setEmailError('Email is required');
            shakeField();
            return false;
        }

        if (!authService.validateEmail(email.trim())) {
            setEmailError('Enter a valid email address');
            shakeField();
            return false;
        }

        return true;
    };

    const handleResetPassword = async () => {
        if (loading) return;

        // Haptic feedback
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        if (!validateEmail()) return;

        setLoading(true);

        try {
            const response = await authService.forgotPassword(email.trim());

            if (response.success) {
                // Success haptic
                if (Platform.OS === 'ios') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                setSent(true);

                // Show success message
                Alert.alert(
                    'Reset Link Sent',
                    response.data?.message || 'Check your email (including spam/junk) for the password reset link.'
                );
            } else {
                throw new Error(response.error?.message);
            }
        } catch (err: any) {
            console.error('Forgot password error:', err);

            // Error haptic
            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            const errorMessage = err.message || 'Failed to send reset link. Please try again.';

            if (errorMessage.includes('not found')) {
                setEmailError('No account found with this email');
                shakeField();
            }

            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        if (loading) return;

        // Haptic feedback
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        setLoading(true);

        try {
            const response = await authService.forgotPassword(email.trim());

            if (response.success) {
                if (Platform.OS === 'ios') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                Alert.alert('Success', 'Reset link has been resent. Please check your email.');
            } else {
                throw new Error(response.error?.message);
            }
        } catch (err: any) {
            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            Alert.alert('Error', err.message || 'Failed to resend email');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        router.replace('/LoginScreen');
    };

    const handleGoBack = () => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        router.back();
    };

    if (loading) {
        return <Loader message="Sending reset link..." />;
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        isLargeScreen && { alignItems: 'center' },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                        <Header
                            title="Reset Password"
                            subtitle={sent ? "We've sent you a reset link" : "We'll send you a link to reset your password"}
                        />

                        <View style={[styles.card, {
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                            borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                            borderWidth: 1
                        }]}>
                            {sent ? (
                                <View style={styles.successContainer}>
                                    <View style={[styles.successIcon, { backgroundColor: `${colors.primary}20` }]}>
                                        <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
                                    </View>

                                    <AppText
                                        style={[
                                            styles.successTitle,
                                            { color: darkMode ? '#ffffff' : colors.text }
                                        ]}
                                    >
                                        Check Your Email
                                    </AppText>

                                    <AppText
                                        style={[
                                            styles.successMessage,
                                            { color: darkMode ? 'rgba(255,255,255,0.85)' : colors.textSecondary }
                                        ]}
                                    >
                                        We sent a password reset link to
                                    </AppText>

                                    <View style={[styles.emailChip, {
                                        backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                        borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                                    }]}>
                                        <Ionicons name="mail-outline" size={16} color={colors.primary} />
                                        <AppText style={[styles.emailText, { color: colors.primary }]}>
                                            {email}
                                        </AppText>
                                    </View>

                                    <AppText
                                        style={[
                                            styles.successNote,
                                            { color: darkMode ? 'rgba(255,255,255,0.65)' : colors.textSecondary }
                                        ]}
                                    >
                                        Check your inbox and spam folder. The link will expire in 1 hour for security.
                                    </AppText>

                                    <View style={styles.successActions}>
                                        <Button
                                            title="Resend Email"
                                            onPress={handleResendEmail}
                                            variant="outline"
                                            fullWidth
                                            style={styles.resendButton}
                                        />

                                        <Button
                                            title="Back to Login"
                                            icon="arrow-back-outline"
                                            onPress={handleBackToLogin}
                                            variant="primary"
                                            fullWidth
                                            style={styles.backButton}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <>
                                    <Field
                                        label="Email Address"
                                        value={email}
                                        onChangeText={(t: string) => {
                                            setEmail(t);
                                            if (emailError) setEmailError('');
                                        }}
                                        error={emailError}
                                        icon="mail-outline"
                                        colors={colors}
                                        darkMode={darkMode}
                                        shake={emailShake}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        returnKeyType="done"
                                        onSubmitEditing={handleResetPassword}
                                        refInput={emailRef}
                                    />

                                    <View style={[styles.infoBox, {
                                        backgroundColor: darkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
                                        borderColor: darkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
                                    }]}>
                                        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                                        <AppText
                                            style={[
                                                styles.infoText,
                                                { color: darkMode ? 'rgba(255,255,255,0.85)' : colors.textSecondary },
                                            ]}
                                        >
                                            Enter the email address you used to create your account. We'll send you a link to reset your password.
                                        </AppText>
                                    </View>

                                    <Button
                                        title="Send Reset Link"
                                        icon="mail-outline"
                                        onPress={handleResetPassword}
                                        variant="primary"
                                        fullWidth
                                        loading={loading}
                                        disabled={loading || !email}
                                        style={{ marginTop: 16 }}
                                    />

                                    <TouchableOpacity
                                        style={styles.backLink}
                                        onPress={handleGoBack}
                                    >
                                        <Ionicons name="arrow-back-outline" size={20} color={colors.primary} />
                                        <AppText
                                            style={[
                                                styles.backLinkText,
                                                { color: colors.primary },
                                            ]}
                                        >
                                            Back to Login
                                        </AppText>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>

                    <AppText style={[styles.footer, { color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>
                        Version 1.0.0 • Smart Cleaner Pro © 2026
                    </AppText>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function Field({
                   label,
                   value,
                   onChangeText,
                   error,
                   icon,
                   colors,
                   darkMode,
                   shake,
                   secureTextEntry = false,
                   rightIcon,
                   refInput,
                   ...rest
               }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    error?: string;
    icon: keyof typeof Ionicons.glyphMap;
    colors: any;
    darkMode: boolean;
    shake: Animated.Value;
    secureTextEntry?: boolean;
    rightIcon?: React.ReactNode;
    refInput?: React.RefObject<TextInput>;
    [key: string]: any;
}) {
    const borderColor = error
        ? '#ef4444'
        : darkMode
            ? 'rgba(255,255,255,0.28)'
            : 'rgba(0,0,0,0.24)';

    const iconColor = error
        ? '#ef4444'
        : darkMode
            ? 'rgba(255,255,255,0.75)'
            : 'rgba(0,0,0,0.60)';

    const backgroundColor = error
        ? darkMode ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)'
        : darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

    return (
        <View style={styles.field}>
            <AppText
                style={[
                    styles.label,
                    {
                        color: error ? '#ef4444' : (darkMode ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.80)'),
                        fontWeight: '500',
                    },
                ]}
            >
                {label}
            </AppText>

            <Animated.View style={{ transform: [{ translateX: shake }] }}>
                <View style={styles.inputWrapper}>
                    <Ionicons
                        name={icon}
                        size={22}
                        color={iconColor}
                        style={styles.inputIconLeft}
                    />

                    <TextInput
                        ref={refInput}
                        value={value}
                        onChangeText={onChangeText}
                        secureTextEntry={secureTextEntry}
                        style={[
                            styles.input,
                            {
                                borderColor,
                                color: darkMode ? '#ffffff' : colors.text,
                                backgroundColor,
                            },
                        ]}
                        placeholderTextColor={darkMode ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)'}
                        {...rest}
                    />

                    {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
                </View>
            </Animated.View>

            {error && (
                <AppText style={[styles.errorText, { color: '#dc2626' }]}>
                    {error}
                </AppText>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 60,
        justifyContent: 'center',
    },

    wrapper: { width: '100%' },

    largeWrapper: { maxWidth: 480 },

    card: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
    },

    field: {
        marginBottom: 20,
    },

    label: {
        marginBottom: 6,
        fontSize: 14.5,
        fontWeight: '500',
    },

    inputWrapper: { position: 'relative' },

    input: {
        height: 54,
        borderWidth: 1.5,
        borderRadius: 14,
        paddingLeft: 48,
        paddingRight: 50,
        fontSize: 16,
        fontWeight: '400',
    },

    inputIconLeft: {
        position: 'absolute',
        left: 14,
        top: 16,
        zIndex: 1,
    },

    rightIcon: {
        position: 'absolute',
        right: 14,
        top: 16,
        zIndex: 1,
    },

    errorText: {
        color: '#dc2626',
        marginTop: 6,
        fontSize: 13.5,
        fontWeight: '500',
    },

    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        marginVertical: 16,
    },

    infoText: {
        flex: 1,
        fontSize: 13.5,
        lineHeight: 18,
    },

    successContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },

    successIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },

    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },

    successMessage: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 12,
    },

    emailChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 20,
    },

    emailText: {
        fontSize: 16,
        fontWeight: '600',
    },

    successNote: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 28,
        paddingHorizontal: 20,
    },

    successActions: {
        width: '100%',
        gap: 12,
    },

    resendButton: {
        marginBottom: 8,
    },

    backButton: {
        marginTop: 4,
    },

    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        paddingVertical: 10,
        gap: 8,
    },

    backLinkText: {
        fontSize: 16,
        fontWeight: '600',
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});