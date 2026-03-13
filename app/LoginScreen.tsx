// app/LoginScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Keyboard,
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
import { onAuthStateChange } from '@/src/services/supabase';

const { width } = Dimensions.get('window');
const isLargeScreen = width >= 768;

// Types
interface FieldProps {
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
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
    onSubmitEditing?: () => void;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export default function LoginScreen() {
    const { colors, darkMode } = useThemeContext();

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Error states
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Animation refs
    const emailShake = useRef(new Animated.Value(0)).current;
    const passwordShake = useRef(new Animated.Value(0)).current;

    // Input refs
    const passwordRef = useRef<TextInput>(null);

    // Mounted ref for cleanup
    const mountedRef = useRef(true);

    /* ---------------------------------------------------------- */
    /* SESSION CHECK */
    /* ---------------------------------------------------------- */
    useEffect(() => {
        mountedRef.current = true;

        const checkSession = async () => {
            try {
                const { session } = await authService.getSession();
                if (mountedRef.current && session?.user?.email_confirmed_at) {
                    router.replace('/(tabs)/01_DashboardScreen');
                }
            } catch (err) {
                console.warn('Session check failed', err);
            }
        };

        checkSession();

        // Listen for auth changes using the supabase helper
        const unsubscribe = onAuthStateChange((_event, session) => {
            if (mountedRef.current && session?.user?.email_confirmed_at) {
                router.replace('/(tabs)/01_DashboardScreen');
            }
        });

        return () => {
            mountedRef.current = false;
            unsubscribe();
        };
    }, []);

    /* ---------------------------------------------------------- */
    /* ANIMATION */
    /* ---------------------------------------------------------- */
    const shakeField = useCallback((anim: Animated.Value) => {
        Animated.sequence([
            Animated.timing(anim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 5, duration: 50, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -5, duration: 50, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    }, []);

    /* ---------------------------------------------------------- */
    /* FORM VALIDATION */
    /* ---------------------------------------------------------- */
    const validateForm = useCallback((): boolean => {
        let valid = true;
        setEmailError('');
        setPasswordError('');

        // Email validation
        if (!email.trim()) {
            setEmailError('Email is required');
            shakeField(emailShake);
            valid = false;
        } else if (!authService.validateEmail(email.trim())) {
            setEmailError('Enter a valid email address');
            shakeField(emailShake);
            valid = false;
        }

        // Password validation
        if (!password.trim()) {
            setPasswordError('Password is required');
            shakeField(passwordShake);
            valid = false;
        }

        return valid;
    }, [email, password, shakeField]);

    /* ---------------------------------------------------------- */
    /* RESEND CONFIRMATION EMAIL */
    /* ---------------------------------------------------------- */
    const handleResendConfirmation = useCallback(async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address first');
            return;
        }

        try {
            const response = await authService.resendConfirmationEmail(email.trim());
            if (response.success) {
                Alert.alert(
                    'Email Sent',
                    'Confirmation email has been resent. Please check your inbox and spam folder.'
                );
            } else {
                Alert.alert('Error', response.error?.message || 'Failed to resend email');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to resend email');
        }
    }, [email]);

    /* ---------------------------------------------------------- */
    /* LOGIN HANDLER */
    /* ---------------------------------------------------------- */
    const handleLogin = useCallback(async () => {
        if (loading) return;

        // Dismiss keyboard
        Keyboard.dismiss();

        // Haptic feedback
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        if (!validateForm()) return;

        setLoading(true);

        try {
            const response = await authService.signIn(
                email.trim().toLowerCase(),
                password
            );

            if (response.success) {
                // Success haptic
                if (Platform.OS === 'ios') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                // Navigation is handled by the auth state listener
                // But we'll do a direct navigation as well
                router.replace('/(tabs)/01_DashboardScreen');
            } else {
                // Handle specific error cases
                if (response.error?.message.includes('verify your email')) {
                    Alert.alert(
                        'Email Not Verified',
                        response.error.message,
                        [
                            { text: 'OK', style: 'cancel' },
                            {
                                text: 'Resend Email',
                                onPress: handleResendConfirmation,
                            },
                        ]
                    );

                    // Shake fields for visual feedback
                    shakeField(emailShake);
                    shakeField(passwordShake);
                } else {
                    // General error
                    setEmailError('Invalid credentials');
                    setPasswordError('Invalid credentials');
                    shakeField(emailShake);
                    shakeField(passwordShake);

                    // Error haptic
                    if (Platform.OS === 'ios') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    }

                    Alert.alert('Login Failed', response.error?.message || 'Please check your credentials and try again.');
                }
            }
        } catch (err: any) {
            console.error('Login error:', err);

            // Error haptic
            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [loading, validateForm, email, password, handleResendConfirmation, shakeField]);

    /* ---------------------------------------------------------- */
    /* NAVIGATION */
    /* ---------------------------------------------------------- */
    const handleForgotPassword = useCallback(() => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        router.push('/ForgotPasswordScreen');
    }, []);

    const handleSignUp = useCallback(() => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        router.push('/SignupScreen');
    }, []);

    /* ---------------------------------------------------------- */
    /* RENDER */
    /* ---------------------------------------------------------- */
    if (loading) {
        return <Loader message="Signing you in..." />;
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        isLargeScreen && styles.scrollContentLarge,
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                        <Header
                            title="Welcome Back"
                            subtitle="Sign in to control your Smart Cleaner Pro"
                        />

                        {/* Login Form Card */}
                        <View style={[styles.card, {
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                            borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                        }]}>
                            <Field
                                label="Email Address"
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    if (emailError) setEmailError('');
                                }}
                                error={emailError}
                                icon="mail-outline"
                                colors={colors}
                                darkMode={darkMode}
                                shake={emailShake}
                                keyboardType="email-address"
                                returnKeyType="next"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                                autoCapitalize="none"
                            />

                            <Field
                                label="Password"
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    if (passwordError) setPasswordError('');
                                }}
                                error={passwordError}
                                icon="lock-closed-outline"
                                colors={colors}
                                darkMode={darkMode}
                                shake={passwordShake}
                                secureTextEntry={!showPassword}
                                rightIcon={
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={22}
                                            color={darkMode ? '#d1d5db' : colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                }
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                                refInput={passwordRef}
                            />

                            <TouchableOpacity
                                style={styles.forgotContainer}
                                onPress={handleForgotPassword}
                                activeOpacity={0.7}
                            >
                                <AppText
                                    style={[
                                        styles.forgotText,
                                        { color: colors.primary },
                                    ]}
                                >
                                    Forgot password?
                                </AppText>
                            </TouchableOpacity>

                            <Button
                                title="Sign In"
                                icon="log-in-outline"
                                onPress={handleLogin}
                                variant="primary"
                                fullWidth
                                loading={loading}
                                disabled={loading || !email || !password}
                                style={styles.loginButton}
                            />

                            <View style={styles.divider}>
                                <View style={[styles.line, { backgroundColor: darkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)' }]} />
                                <AppText style={[styles.orText, { color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }]}>
                                    OR
                                </AppText>
                                <View style={[styles.line, { backgroundColor: darkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)' }]} />
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.createAccountButton,
                                    {
                                        backgroundColor: darkMode
                                            ? 'rgba(59,130,246,0.16)'
                                            : 'rgba(59,130,246,0.12)',
                                    },
                                ]}
                                onPress={handleSignUp}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="person-add-outline"
                                    size={20}
                                    color={colors.primary}
                                    style={styles.createAccountIcon}
                                />
                                <AppText
                                    style={[
                                        styles.createAccountText,
                                        { color: colors.primary },
                                    ]}
                                >
                                    Create New Account
                                </AppText>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
                    <AppText style={[styles.footer, { color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>
                        Version 1.0.0 • Smart Cleaner Pro © 2026
                    </AppText>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/* ---------------------------------------------------------- */
/* FIELD COMPONENT */
/* ---------------------------------------------------------- */
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
                   keyboardType = 'default',
                   returnKeyType = 'done',
                   onSubmitEditing,
                   autoCapitalize = 'none',
               }: FieldProps) {
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
                        placeholderTextColor={darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        keyboardType={keyboardType}
                        returnKeyType={returnKeyType}
                        onSubmitEditing={onSubmitEditing}
                        autoCapitalize={autoCapitalize}
                        autoCorrect={false}
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

/* ---------------------------------------------------------- */
/* STYLES */
/* ---------------------------------------------------------- */
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 60,
        justifyContent: 'center',
    },
    scrollContentLarge: {
        alignItems: 'center',
    },
    wrapper: {
        width: '100%',
    },
    largeWrapper: {
        maxWidth: 480,
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
    inputWrapper: {
        position: 'relative',
    },
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
    forgotContainer: {
        alignSelf: 'flex-end',
        marginTop: 2,
        marginBottom: 20,
        paddingVertical: 6,
    },
    forgotText: {
        fontSize: 15,
        fontWeight: '600',
    },
    loginButton: {
        marginTop: 16,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    line: {
        flex: 1,
        height: 1.2,
    },
    orText: {
        fontSize: 14,
        fontWeight: '500',
        marginHorizontal: 18,
    },
    createAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        borderRadius: 14,
        marginTop: 8,
    },
    createAccountIcon: {
        marginRight: 12,
    },
    createAccountText: {
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