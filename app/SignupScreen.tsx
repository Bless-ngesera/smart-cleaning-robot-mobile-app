// app/SignupScreen.tsx
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

export default function SignupScreen() {
    const { colors, darkMode } = useThemeContext();

    // Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // Error states
    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmError, setConfirmError] = useState('');

    // Animation refs
    const nameShake = useRef(new Animated.Value(0)).current;
    const emailShake = useRef(new Animated.Value(0)).current;
    const passwordShake = useRef(new Animated.Value(0)).current;
    const confirmShake = useRef(new Animated.Value(0)).current;

    // Input refs
    const emailRef = useRef<TextInput>(null);
    const passRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);

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

        setNameError('');
        setEmailError('');
        setPasswordError('');
        setConfirmError('');

        // Full name validation
        if (!fullName.trim()) {
            setNameError('Full name is required');
            shakeField(nameShake);
            valid = false;
        } else if (fullName.trim().length < 2) {
            setNameError('Name must be at least 2 characters');
            shakeField(nameShake);
            valid = false;
        }

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
        const passwordCheck = authService.validatePassword(password);
        if (!password) {
            setPasswordError('Password is required');
            shakeField(passwordShake);
            valid = false;
        } else if (!passwordCheck.isValid) {
            setPasswordError(passwordCheck.errors[0]);
            shakeField(passwordShake);
            valid = false;
        }

        // Confirm password validation
        if (!confirmPassword) {
            setConfirmError('Please confirm your password');
            shakeField(confirmShake);
            valid = false;
        } else if (confirmPassword !== password) {
            setConfirmError('Passwords do not match');
            shakeField(confirmShake);
            valid = false;
        }

        // Terms acceptance
        if (!acceptedTerms) {
            Alert.alert(
                'Terms Required',
                'Please accept the Terms of Service and Privacy Policy to continue.'
            );
            valid = false;
        }

        return valid;
    }, [fullName, email, password, confirmPassword, acceptedTerms, shakeField]);

    /* ---------------------------------------------------------- */
    /* SIGNUP HANDLER */
    /* ---------------------------------------------------------- */
    const handleSignUp = useCallback(async () => {
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
            const response = await authService.signUp(
                email.trim().toLowerCase(),
                password,
                fullName.trim()
            );

            if (!response.success) {
                throw new Error(response.error?.message);
            }

            // Success haptic
            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            if (response.data?.needsEmailConfirmation) {
                Alert.alert(
                    'Verify Your Email',
                    'We\'ve sent a verification link to your email. Please check your inbox and click the link to verify your account.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.replace('/LoginScreen'),
                        }
                    ]
                );
            } else {
                // This case is rare - usually email confirmation is required
                router.replace('/(tabs)/01_DashboardScreen');
            }
        } catch (err: any) {
            console.error('Signup error:', err);

            // Error haptic
            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            const message = err.message || 'Unable to create account. Please try again.';

            // Handle specific error cases
            if (message.includes('already registered')) {
                setEmailError('This email is already registered');
                shakeField(emailShake);
            } else if (message.includes('password')) {
                setPasswordError(message);
                shakeField(passwordShake);
            }

            Alert.alert('Signup Failed', message);
        } finally {
            setLoading(false);
        }
    }, [loading, validateForm, email, password, fullName, shakeField, emailShake, passwordShake]);

    /* ---------------------------------------------------------- */
    /* NAVIGATION */
    /* ---------------------------------------------------------- */
    const handleLogin = useCallback(() => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        router.push('/LoginScreen');
    }, []);

    const toggleTerms = useCallback(() => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setAcceptedTerms(prev => !prev);
    }, []);

    /* ---------------------------------------------------------- */
    /* RENDER */
    /* ---------------------------------------------------------- */
    if (loading) {
        return <Loader message="Creating your account..." />;
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
                            title="Create Account"
                            subtitle="Join Smart Cleaner Pro today"
                        />

                        {/* Form Card */}
                        <View style={[styles.card, {
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                            borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                        }]}>
                            <Field
                                label="Full Name"
                                value={fullName}
                                onChangeText={(text) => {
                                    setFullName(text);
                                    if (nameError) setNameError('');
                                }}
                                error={nameError}
                                icon="person-outline"
                                colors={colors}
                                darkMode={darkMode}
                                shake={nameShake}
                                returnKeyType="next"
                                onSubmitEditing={() => emailRef.current?.focus()}
                                autoCapitalize="words"
                            />

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
                                refInput={emailRef}
                                returnKeyType="next"
                                onSubmitEditing={() => passRef.current?.focus()}
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
                                refInput={passRef}
                                rightIcon={
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={22}
                                            color={colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                }
                                returnKeyType="next"
                                onSubmitEditing={() => confirmRef.current?.focus()}
                            />

                            <Field
                                label="Confirm Password"
                                value={confirmPassword}
                                onChangeText={(text) => {
                                    setConfirmPassword(text);
                                    if (confirmError) setConfirmError('');
                                }}
                                error={confirmError}
                                icon="lock-closed-outline"
                                colors={colors}
                                darkMode={darkMode}
                                shake={confirmShake}
                                secureTextEntry={!showConfirmPassword}
                                refInput={confirmRef}
                                rightIcon={
                                    <TouchableOpacity
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Ionicons
                                            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={22}
                                            color={colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                }
                                returnKeyType="done"
                                onSubmitEditing={handleSignUp}
                            />

                            {/* Password strength indicator */}
                            {password.length > 0 && password.length < 6 && (
                                <View style={styles.passwordHint}>
                                    <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
                                    <AppText style={styles.passwordHintText}>
                                        Use at least 6 characters with uppercase letters and numbers for a stronger password
                                    </AppText>
                                </View>
                            )}

                            {/* Terms and Conditions */}
                            <TouchableOpacity
                                style={styles.termsContainer}
                                onPress={toggleTerms}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, {
                                    borderColor: acceptedTerms ? colors.primary : (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'),
                                    backgroundColor: acceptedTerms ? `${colors.primary}20` : 'transparent',
                                }]}>
                                    {acceptedTerms && (
                                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                                    )}
                                </View>
                                <AppText
                                    style={[
                                        styles.termsText,
                                        { color: darkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.70)' },
                                    ]}
                                >
                                    I agree to the{' '}
                                    <AppText style={[styles.termsLink, { color: colors.primary }]}>
                                        Terms of Service
                                    </AppText>
                                    {' and '}
                                    <AppText style={[styles.termsLink, { color: colors.primary }]}>
                                        Privacy Policy
                                    </AppText>
                                </AppText>
                            </TouchableOpacity>

                            <Button
                                title="Create Account"
                                icon="person-add-outline"
                                onPress={handleSignUp}
                                variant="primary"
                                fullWidth
                                disabled={loading || !fullName || !email || !password || !confirmPassword || !acceptedTerms}
                                loading={loading}
                                style={styles.signupButton}
                            />

                            {/* Login Link */}
                            <View style={styles.divider}>
                                <View style={[styles.line, { backgroundColor: darkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)' }]} />
                                <AppText style={[styles.orText, { color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }]}>
                                    OR
                                </AppText>
                                <View style={[styles.line, { backgroundColor: darkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)' }]} />
                            </View>

                            <TouchableOpacity
                                style={styles.loginLink}
                                onPress={handleLogin}
                                activeOpacity={0.7}
                            >
                                <AppText style={[styles.loginLinkText, { color: colors.primary }]}>
                                    Already have an account? Sign in
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
                   ...rest
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
        paddingRight: 52,
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
        marginTop: 6,
        fontSize: 13.5,
        color: '#dc2626',
    },
    passwordHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: -8,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    passwordHintText: {
        flex: 1,
        fontSize: 12,
        color: '#F59E0B',
        lineHeight: 16,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 20,
        paddingHorizontal: 4,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    termsText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    termsLink: {
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    signupButton: {
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
    loginLink: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    loginLinkText: {
        fontSize: 16,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});