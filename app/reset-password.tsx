// app/reset-password.tsx
import React, { useState, useEffect, useRef } from 'react';
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

export default function ResetPasswordScreen() {
    const { colors, darkMode } = useThemeContext();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isValidSession, setIsValidSession] = useState(true);
    const [checkingSession, setCheckingSession] = useState(true);

    // Error states
    const [passwordError, setPasswordError] = useState('');
    const [confirmError, setConfirmError] = useState('');

    // Animation refs
    const passwordShake = useRef(new Animated.Value(0)).current;
    const confirmShake = useRef(new Animated.Value(0)).current;

    // Input refs
    const confirmRef = useRef<TextInput>(null);

    // Validation state
    const [isValid, setIsValid] = useState(false);

    // Check if we have a valid session (user clicked email link)
    useEffect(() => {
        checkSession();
    }, []);

    // Validate password on change
    useEffect(() => {
        validateForm();
    }, [password, confirmPassword]);

    const checkSession = async () => {
        try {
            const { session } = await authService.getSession();

            if (!session) {
                setIsValidSession(false);
                Alert.alert(
                    'Invalid or Expired Link',
                    'This password reset link is invalid or has expired. Please request a new one.',
                    [
                        {
                            text: 'Go to Forgot Password',
                            onPress: () => router.replace('/ForgotPasswordScreen'),
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Session check error:', error);
            setIsValidSession(false);
        } finally {
            setCheckingSession(false);
        }
    };

    const shakeField = (anim: Animated.Value) => {
        Animated.sequence([
            Animated.timing(anim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 5, duration: 50, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -5, duration: 50, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const validateForm = () => {
        let valid = true;
        setPasswordError('');
        setConfirmError('');

        // Password validation using authService
        const passwordValidation = authService.validatePassword(password);
        if (!password) {
            setPasswordError('Password is required');
            valid = false;
        } else if (!passwordValidation.isValid) {
            setPasswordError(passwordValidation.errors[0]);
            valid = false;
        }

        // Confirm password validation
        if (!confirmPassword) {
            setConfirmError('Please confirm your password');
            valid = false;
        } else if (confirmPassword !== password) {
            setConfirmError('Passwords do not match');
            valid = false;
        }

        setIsValid(valid);
        return valid;
    };

    const handleResetPassword = async () => {
        if (loading) return;

        // Haptic feedback
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        if (!validateForm()) {
            // Shake fields that have errors
            if (passwordError) shakeField(passwordShake);
            if (confirmError) shakeField(confirmShake);
            return;
        }

        setLoading(true);

        try {
            const response = await authService.resetPassword(password);

            if (response.success) {
                // Success haptic
                if (Platform.OS === 'ios') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                Alert.alert(
                    'Password Updated',
                    'Your password has been changed successfully. Please log in with your new password.',
                    [
                        {
                            text: 'Go to Login',
                            onPress: () => router.replace('/LoginScreen'),
                        }
                    ]
                );
            } else {
                throw new Error(response.error?.message);
            }
        } catch (err: any) {
            console.error('Reset password error:', err);

            // Error haptic
            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            Alert.alert('Error', err.message || 'Failed to reset password. Please try again.');
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

    // Password strength indicators
    const getPasswordStrength = () => {
        if (!password) return null;

        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const isLongEnough = password.length >= 8;

        const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar, isLongEnough]
            .filter(Boolean).length;

        if (strength <= 2) return { label: 'Weak', color: '#ef4444' };
        if (strength <= 4) return { label: 'Medium', color: '#f59e0b' };
        return { label: 'Strong', color: '#10b981' };
    };

    if (checkingSession) {
        return <Loader message="Verifying reset link..." />;
    }

    if (!isValidSession) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                    <AppText style={[styles.errorTitle, { color: darkMode ? '#ffffff' : colors.text }]}>
                        Invalid Reset Link
                    </AppText>
                    <AppText style={[styles.errorMessage, { color: darkMode ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                        This password reset link has expired or is invalid.
                    </AppText>
                    <Button
                        title="Request New Link"
                        onPress={() => router.replace('/ForgotPasswordScreen')}
                        variant="primary"
                        style={styles.errorButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    const passwordStrength = getPasswordStrength();

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
                            title="Create New Password"
                            subtitle="Enter your new password below"
                        />

                        <View style={[styles.card, {
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                            borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                            borderWidth: 1
                        }]}>
                            {/* New Password Field */}
                            <Field
                                label="New Password"
                                value={password}
                                onChangeText={(t: string) => {
                                    setPassword(t);
                                    if (passwordError) setPasswordError('');
                                }}
                                error={passwordError}
                                icon="lock-closed-outline"
                                colors={colors}
                                darkMode={darkMode}
                                shake={passwordShake}
                                secureTextEntry={!showPassword}
                                rightIcon={
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={22}
                                            color={darkMode ? '#d1d5db' : colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                }
                                returnKeyType="next"
                                onSubmitEditing={() => confirmRef.current?.focus()}
                            />

                            {/* Password Strength Indicator */}
                            {password.length > 0 && passwordStrength && (
                                <View style={styles.strengthContainer}>
                                    <View style={styles.strengthBarContainer}>
                                        <View style={[styles.strengthBar, {
                                            width: passwordStrength.label === 'Weak' ? '33%' :
                                                passwordStrength.label === 'Medium' ? '66%' : '100%',
                                            backgroundColor: passwordStrength.color,
                                        }]} />
                                    </View>
                                    <AppText style={[styles.strengthText, { color: passwordStrength.color }]}>
                                        {passwordStrength.label} password
                                    </AppText>
                                </View>
                            )}

                            {/* Confirm Password Field */}
                            <Field
                                label="Confirm Password"
                                value={confirmPassword}
                                onChangeText={(t: string) => {
                                    setConfirmPassword(t);
                                    if (confirmError) setConfirmError('');
                                }}
                                error={confirmError}
                                icon="lock-closed-outline"
                                colors={colors}
                                darkMode={darkMode}
                                shake={confirmShake}
                                secureTextEntry={!showConfirmPassword}
                                rightIcon={
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        <Ionicons
                                            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={22}
                                            color={darkMode ? '#d1d5db' : colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                }
                                returnKeyType="done"
                                onSubmitEditing={handleResetPassword}
                                refInput={confirmRef}
                            />

                            {/* Password Requirements */}
                            <View style={styles.requirementsContainer}>
                                <AppText style={[styles.requirementsTitle, { color: darkMode ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                                    Password must contain:
                                </AppText>

                                <View style={styles.requirementRow}>
                                    <Ionicons
                                        name={password.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={18}
                                        color={password.length >= 6 ? '#10B981' : (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')}
                                    />
                                    <AppText style={[styles.requirementText, {
                                        color: password.length >= 6 ? '#10B981' : (darkMode ? 'rgba(255,255,255,0.5)' : colors.textSecondary)
                                    }]}>
                                        At least 6 characters
                                    </AppText>
                                </View>

                                <View style={styles.requirementRow}>
                                    <Ionicons
                                        name={/[A-Z]/.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={18}
                                        color={/[A-Z]/.test(password) ? '#10B981' : (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')}
                                    />
                                    <AppText style={[styles.requirementText, {
                                        color: /[A-Z]/.test(password) ? '#10B981' : (darkMode ? 'rgba(255,255,255,0.5)' : colors.textSecondary)
                                    }]}>
                                        One uppercase letter
                                    </AppText>
                                </View>

                                <View style={styles.requirementRow}>
                                    <Ionicons
                                        name={/[0-9]/.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={18}
                                        color={/[0-9]/.test(password) ? '#10B981' : (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')}
                                    />
                                    <AppText style={[styles.requirementText, {
                                        color: /[0-9]/.test(password) ? '#10B981' : (darkMode ? 'rgba(255,255,255,0.5)' : colors.textSecondary)
                                    }]}>
                                        One number
                                    </AppText>
                                </View>

                                <View style={styles.requirementRow}>
                                    <Ionicons
                                        name={password === confirmPassword && password.length > 0 ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={18}
                                        color={password === confirmPassword && password.length > 0 ? '#10B981' : (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')}
                                    />
                                    <AppText style={[styles.requirementText, {
                                        color: password === confirmPassword && password.length > 0 ? '#10B981' : (darkMode ? 'rgba(255,255,255,0.5)' : colors.textSecondary)
                                    }]}>
                                        Passwords match
                                    </AppText>
                                </View>
                            </View>

                            <Button
                                title="Reset Password"
                                icon="lock-open-outline"
                                onPress={handleResetPassword}
                                variant="primary"
                                fullWidth
                                loading={loading}
                                disabled={!isValid || loading}
                                style={{ marginTop: 24 }}
                            />

                            <TouchableOpacity
                                style={styles.backLink}
                                onPress={handleBackToLogin}
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

    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },

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

    errorTitle: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 12,
    },

    errorMessage: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },

    errorButton: {
        minWidth: 200,
    },

    strengthContainer: {
        marginTop: -8,
        marginBottom: 16,
    },

    strengthBarContainer: {
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2,
        marginBottom: 6,
    },

    strengthBar: {
        height: 4,
        borderRadius: 2,
    },

    strengthText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'right',
    },

    requirementsContainer: {
        marginTop: 8,
        marginBottom: 8,
        gap: 8,
    },

    requirementsTitle: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 4,
    },

    requirementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    requirementText: {
        fontSize: 13,
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