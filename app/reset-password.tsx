// app/reset-password.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated,
    useWindowDimensions,
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
import { setSuppressNextUserUpdated } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';

export default function ResetPasswordScreen() {
    const { colors, darkMode } = useThemeContext();
    const { showToast } = useToast();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isValidSession, setIsValidSession] = useState(true);
    const [checkingSession, setCheckingSession] = useState(true);

    // Success card state
    const [resetDone, setResetDone] = useState(false);

    // Error states
    const [passwordError, setPasswordError] = useState('');
    const [confirmError, setConfirmError] = useState('');
    const [submitError, setSubmitError] = useState('');

    // Animation refs
    const passwordShake = useRef(new Animated.Value(0)).current;
    const confirmShake = useRef(new Animated.Value(0)).current;

    // Input refs
    const confirmRef = useRef<TextInput>(null);

    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        checkSession();
    }, []);

    useEffect(() => {
        if (password || confirmPassword) validateForm();
    }, [password, confirmPassword]);

    const checkSession = async () => {
        try {
            const { session } = await authService.getSession();
            if (!session) {
                setIsValidSession(false);
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
        let pErr = '';
        let cErr = '';

        const passwordValidation = authService.validatePassword(password);
        if (!password) {
            pErr = 'Password is required';
            valid = false;
        } else if (!passwordValidation.isValid) {
            pErr = passwordValidation.errors[0];
            valid = false;
        }

        if (!confirmPassword) {
            cErr = 'Please confirm your password';
            valid = false;
        } else if (confirmPassword !== password) {
            cErr = 'Passwords do not match';
            valid = false;
        }

        setPasswordError(pErr);
        setConfirmError(cErr);
        setIsValid(valid);
        return { valid, pErr, cErr };
    };

    const handleResetPassword = async () => {
        if (loading) return;

        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        const { valid, pErr, cErr } = validateForm();
        if (!valid) {
            if (pErr) shakeField(passwordShake);
            if (cErr) shakeField(confirmShake);
            return;
        }

        setSubmitError('');
        setLoading(true);

        // Suppress USER_UPDATED auto-redirect so we can show the success card
        setSuppressNextUserUpdated(true);

        try {
            const response = await authService.resetPassword(password);

            if (response.success) {
                if (Platform.OS === 'ios') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                showToast('Password reset successfully! Log in with your new password.', 'success', 5000);
                setResetDone(true);

                // Sign out after 2.5 s so the user logs in fresh with the new password.
                // SIGNED_OUT event in AuthContext navigates to /LoginScreen.
                setTimeout(async () => {
                    await authService.signOut();
                }, 2500);
            } else {
                // Flag no longer needed — clear it
                setSuppressNextUserUpdated(false);
                throw new Error(response.error?.message);
            }
        } catch (err: any) {
            console.error('Reset password error:', err);

            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            setSubmitError(err.message || 'Failed to reset password. Please try again.');
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

    const getPasswordStrength = () => {
        if (!password) return null;

        const checks = [
            /[A-Z]/.test(password),
            /[a-z]/.test(password),
            /\d/.test(password),
            /[!@#$%^&*(),.?":{}|<>]/.test(password),
            password.length >= 8,
        ];
        const strength = checks.filter(Boolean).length;

        if (strength <= 2) return { label: 'Weak', color: '#ef4444' };
        if (strength <= 4) return { label: 'Medium', color: '#f59e0b' };
        return { label: 'Strong', color: '#10b981' };
    };

    if (checkingSession) {
        return <Loader message="Verifying reset link..." />;
    }

    // Invalid / expired link — inline error state (no Alert)
    if (!isValidSession) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centered}>
                    <View style={[styles.errorIconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                        <Ionicons name="alert-circle" size={64} color="#ef4444" />
                    </View>
                    <AppText style={[styles.errorTitle, { color: darkMode ? '#ffffff' : colors.text }]}>
                        Invalid Reset Link
                    </AppText>
                    <AppText style={[styles.errorMessage, { color: darkMode ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                        This password reset link has expired or has already been used. Please request a new one.
                    </AppText>
                    <Button
                        title="Request New Link"
                        icon="mail-outline"
                        onPress={() => router.replace('/ForgotPasswordScreen')}
                        variant="primary"
                        style={styles.errorButton}
                    />
                    <TouchableOpacity style={styles.backLink} onPress={handleBackToLogin}>
                        <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
                        <AppText style={[styles.backLinkText, { color: colors.primary }]}>Back to Login</AppText>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const passwordStrength = getPasswordStrength();

    if (loading) {
        return <Loader message="Updating your password..." />;
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
                            title="Create New Password"
                            subtitle={resetDone ? 'Password updated successfully!' : 'Enter your new password below'}
                        />

                        <View style={[styles.card, {
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                            borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                            borderWidth: 1,
                        }]}>

                            {/* ── Success card ── */}
                            {resetDone ? (
                                <View style={styles.successContainer}>
                                    <View style={[styles.successIconWrap, { backgroundColor: `${colors.primary}20` }]}>
                                        <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
                                    </View>

                                    <AppText style={[styles.successTitle, { color: darkMode ? '#ffffff' : '#111827' }]}>
                                        Password Updated!
                                    </AppText>

                                    <AppText style={[styles.successMsg, { color: darkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.60)' }]}>
                                        Your password has been changed successfully. You'll be redirected to the login screen in a moment.
                                    </AppText>

                                    <Button
                                        title="Go to Login"
                                        icon="log-in-outline"
                                        onPress={handleBackToLogin}
                                        variant="primary"
                                        fullWidth
                                        style={{ marginTop: 8 }}
                                    />
                                </View>
                            ) : (
                                <>
                                    {/* ── New Password ── */}
                                    <Field
                                        label="New Password"
                                        value={password}
                                        onChangeText={(t: string) => {
                                            setPassword(t);
                                            if (passwordError) setPasswordError('');
                                            if (submitError) setSubmitError('');
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

                                    {/* Password strength bar */}
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

                                    {/* ── Confirm Password ── */}
                                    <Field
                                        label="Confirm Password"
                                        value={confirmPassword}
                                        onChangeText={(t: string) => {
                                            setConfirmPassword(t);
                                            if (confirmError) setConfirmError('');
                                            if (submitError) setSubmitError('');
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

                                    {/* Password requirements checklist */}
                                    <View style={styles.requirementsContainer}>
                                        <AppText style={[styles.requirementsTitle, { color: darkMode ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                                            Password must contain:
                                        </AppText>

                                        {[
                                            { label: 'At least 6 characters', met: password.length >= 6 },
                                            { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
                                            { label: 'One number', met: /[0-9]/.test(password) },
                                            { label: 'One special character (!@#$%^&*)', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
                                            { label: 'Passwords match', met: password === confirmPassword && password.length > 0 },
                                        ].map((req) => (
                                            <View key={req.label} style={styles.requirementRow}>
                                                <Ionicons
                                                    name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
                                                    size={18}
                                                    color={req.met ? '#10B981' : (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')}
                                                />
                                                <AppText style={[styles.requirementText, {
                                                    color: req.met ? '#10B981' : (darkMode ? 'rgba(255,255,255,0.5)' : colors.textSecondary),
                                                }]}>
                                                    {req.label}
                                                </AppText>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Submit error banner */}
                                    {submitError ? (
                                        <View style={[styles.errorBanner, {
                                            backgroundColor: darkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
                                            borderColor: '#ef4444',
                                        }]}>
                                            <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                                            <AppText style={styles.errorBannerText}>{submitError}</AppText>
                                        </View>
                                    ) : null}

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

                                    <TouchableOpacity style={styles.backLink} onPress={handleBackToLogin}>
                                        <Ionicons name="arrow-back-outline" size={20} color={colors.primary} />
                                        <AppText style={[styles.backLinkText, { color: colors.primary }]}>
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

/* ─── Field component ─────────────────────────────────────── */
function Field({
    label, value, onChangeText, error, icon, colors, darkMode, shake,
    secureTextEntry = false, rightIcon, refInput, ...rest
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
    refInput?: React.RefObject<TextInput | null>;
    [key: string]: any;
}) {
    const borderColor = error ? '#ef4444' : darkMode ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.24)';
    const iconColor = error ? '#ef4444' : darkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.60)';
    const backgroundColor = error
        ? (darkMode ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)')
        : (darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)');

    return (
        <View style={styles.field}>
            <AppText style={[styles.label, {
                color: error ? '#ef4444' : (darkMode ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.80)'),
                fontWeight: '500',
            }]}>
                {label}
            </AppText>

            <Animated.View style={{ transform: [{ translateX: shake }] }}>
                <View style={styles.inputWrapper}>
                    <Ionicons name={icon} size={22} color={iconColor} style={styles.inputIconLeft} />
                    <TextInput
                        ref={refInput}
                        value={value}
                        onChangeText={onChangeText}
                        secureTextEntry={secureTextEntry}
                        style={[styles.input, { borderColor, color: darkMode ? '#ffffff' : colors.text, backgroundColor }]}
                        placeholderTextColor={darkMode ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)'}
                        allowFontScaling={false}
                        {...rest}
                    />
                    {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
                </View>
            </Animated.View>

            {error ? (
                <AppText style={[styles.errorText, { color: '#dc2626' }]}>{error}</AppText>
            ) : null}
        </View>
    );
}

/* ─── Styles ──────────────────────────────────────────────── */
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
        paddingVertical: 40,
    },

    card: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
    },

    // ── Success card
    successContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    successIconWrap: {
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
        marginBottom: 10,
    },
    successMsg: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 8,
    },

    // ── Invalid session state
    errorIconWrap: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
    },
    errorMessage: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 22,
    },
    errorButton: {
        minWidth: 220,
        marginBottom: 16,
    },

    // ── Submit error banner
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 4,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#ef4444',
        lineHeight: 20,
    },

    // ── Form fields
    field: { marginBottom: 20 },
    label: { marginBottom: 6, fontSize: 14.5, fontWeight: '500' },
    inputWrapper: { position: 'relative' },
    input: {
        height: 54,
        borderWidth: 1.5,
        borderRadius: 14,
        paddingLeft: 48,
        paddingRight: 50,
        fontSize: 16,
        fontWeight: '400',
        fontFamily: 'SF-Pro-Display-Regular',
    },
    inputIconLeft: { position: 'absolute', left: 14, top: 16, zIndex: 1 },
    rightIcon: { position: 'absolute', right: 14, top: 16, zIndex: 1 },
    errorText: { color: '#dc2626', marginTop: 6, fontSize: 13.5, fontWeight: '500' },

    // ── Password strength
    strengthContainer: { marginTop: -8, marginBottom: 16 },
    strengthBarContainer: { height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, marginBottom: 6 },
    strengthBar: { height: 4, borderRadius: 2 },
    strengthText: { fontSize: 12, fontWeight: '600', textAlign: 'right' },

    // ── Requirements checklist
    requirementsContainer: { marginTop: 8, marginBottom: 8, gap: 8 },
    requirementsTitle: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
    requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    requirementText: { fontSize: 13 },

    // ── Navigation
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        paddingVertical: 10,
        gap: 8,
    },
    backLinkText: { fontSize: 16, fontWeight: '600' },

    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});
