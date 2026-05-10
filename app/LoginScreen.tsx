// app/LoginScreen.tsx
import React, { useState, useRef, useCallback } from 'react';
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
    Keyboard,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import * as Haptics from 'expo-haptics';

import Header from '../src/components/Header';
import Loader from '../src/components/Loader';
import Button from '../src/components/Button';
import AppText from '../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import authService from '@/src/services/auth';

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
    refInput?: React.RefObject<TextInput | null>;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
    onSubmitEditing?: () => void;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    placeholder?: string;
}

export default function LoginScreen() {
  const { push, back, replace } = useAppNavigation();
    const { colors, darkMode } = useThemeContext();
    const { user } = useAuth();
    const { showToast } = useToast();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    // Form state
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Error states
    const [emailError, setEmailError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Login done (success card)
    const [loginDone, setLoginDone] = useState(false);

    // Error banner
    const [banner, setBanner] = useState<{ type: 'error'; text: string } | null>(null);

    // Animation refs
    const emailShake = useRef(new Animated.Value(0)).current;
    const phoneShake = useRef(new Animated.Value(0)).current;
    const passwordShake = useRef(new Animated.Value(0)).current;

    // Input refs
    const phoneRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

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
        setPhoneError('');
        setPasswordError('');

        if (!email.trim()) {
            setEmailError('Email is required');
            shakeField(emailShake);
            valid = false;
        } else if (!authService.validateEmail(email.trim())) {
            setEmailError('Enter a valid email address');
            shakeField(emailShake);
            valid = false;
        }

        // Phone is optional — validate format only if provided
        if (phone.trim()) {
            const digits = phone.replace(/\D/g, '');
            if (digits.length < 7) {
                setPhoneError('Enter a valid phone number');
                shakeField(phoneShake);
                valid = false;
            }
        }

        if (!password.trim()) {
            setPasswordError('Password is required');
            shakeField(passwordShake);
            valid = false;
        }

        return valid;
    }, [email, phone, password, shakeField]);

    /* ---------------------------------------------------------- */
    /* RESEND CONFIRMATION EMAIL */
    /* ---------------------------------------------------------- */
    const handleResendConfirmation = useCallback(async () => {
        if (!email.trim()) {
            showToast('Please enter your email address first', 'error');
            return;
        }

        try {
            const response = await authService.resendConfirmationEmail(email.trim());
            if (response.success) {
                showToast('Verification email sent! Check your inbox and spam folder.', 'success', 4000);
            } else {
                showToast(response.error?.message || 'Failed to resend email', 'error');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to resend email', 'error');
        }
    }, [email, showToast]);

    /* ---------------------------------------------------------- */
    /* LOGIN HANDLER */
    /* ---------------------------------------------------------- */
    const handleLogin = useCallback(async () => {
        if (loading) return;

        Keyboard.dismiss();

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
                if (Platform.OS === 'ios') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                showToast('Signed in successfully! Welcome back.', 'success');
                setLoginDone(true);

            } else {
                if (Platform.OS === 'ios') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }

                if (response.error?.message.includes('verify your email')) {
                    const errMsg = response.error.message;
                    setBanner({ type: 'error', text: errMsg });
                    shakeField(emailShake);
                    shakeField(passwordShake);
                    showToast('Email not verified. Please check your inbox.', 'warning', 5000);
                    Alert.alert(
                        'Email Not Verified',
                        errMsg,
                        [
                            { text: 'OK', style: 'cancel' },
                            { text: 'Resend Email', onPress: handleResendConfirmation },
                        ]
                    );
                } else {
                    setEmailError('Invalid email or password');
                    setPasswordError('Invalid email or password');
                    shakeField(emailShake);
                    shakeField(passwordShake);
                    const errMsg = response.error?.message || 'Invalid credentials. Please try again.';
                    setBanner({ type: 'error', text: errMsg });
                    showToast(errMsg, 'error');
                }
            }
        } catch (err: any) {
            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            setBanner({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
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
        push('/ForgotPasswordScreen');
    }, []);

    const handleSignUp = useCallback(() => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        push('/SignupScreen');
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

                            {loginDone ? (
                                <View style={styles.successContainer}>
                                    <View style={[styles.successIconWrap, { backgroundColor: `${colors.primary}20` }]}>
                                        <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
                                    </View>
                                    <AppText style={[styles.successTitle, { color: darkMode ? '#ffffff' : '#111827' }]}>
                                        Signed In!
                                    </AppText>
                                    <AppText style={[styles.successMsg, { color: darkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.60)' }]}>
                                        Welcome back. Taking you to your dashboard...
                                    </AppText>
                                </View>
                            ) : (
                                <>
                                    <Field
                                        label="Email Address"
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            if (emailError) setEmailError('');
                                            if (banner) setBanner(null);
                                        }}
                                        error={emailError}
                                        icon="mail-outline"
                                        colors={colors}
                                        darkMode={darkMode}
                                        shake={emailShake}
                                        keyboardType="email-address"
                                        returnKeyType="next"
                                        onSubmitEditing={() => phoneRef.current?.focus()}
                                        autoCapitalize="none"
                                        placeholder="Enter your email"
                                    />

                                    <Field
                                        label="Phone Number (Optional)"
                                        value={phone}
                                        onChangeText={(text) => {
                                            setPhone(text);
                                            if (phoneError) setPhoneError('');
                                        }}
                                        error={phoneError}
                                        icon="call-outline"
                                        colors={colors}
                                        darkMode={darkMode}
                                        shake={phoneShake}
                                        keyboardType="phone-pad"
                                        returnKeyType="next"
                                        onSubmitEditing={() => passwordRef.current?.focus()}
                                        refInput={phoneRef}
                                        placeholder="e.g. +1 234 567 8900"
                                    />

                                    <Field
                                        label="Password"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            if (passwordError) setPasswordError('');
                                            if (banner) setBanner(null);
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
                                        placeholder="Enter your password"
                                    />

                                    <TouchableOpacity
                                        style={styles.forgotContainer}
                                        onPress={handleForgotPassword}
                                        activeOpacity={0.7}
                                    >
                                        <AppText style={[styles.forgotText, { color: colors.primary }]}>
                                            Forgot password?
                                        </AppText>
                                    </TouchableOpacity>

                                    {banner ? (
                                        <View style={[styles.banner, {
                                            backgroundColor: darkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
                                            borderColor: '#ef4444',
                                        }]}>
                                            <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                                            <AppText style={[styles.bannerText, { color: '#ef4444' }]}>
                                                {banner.text}
                                            </AppText>
                                        </View>
                                    ) : null}

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
                                        <AppText style={[styles.createAccountText, { color: colors.primary }]}>
                                            Create New Account
                                        </AppText>
                                    </TouchableOpacity>
                                </>
                            )}
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
                   placeholder,
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
                        placeholder={placeholder}
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
                        allowFontScaling={false}
                    />

                    {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
                </View>
            </Animated.View>

            {error ? (
                <AppText style={[styles.errorText, { color: '#dc2626' }]}>
                    {error}
                </AppText>
            ) : null}
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
        fontFamily: 'SF-Pro-Display-Regular',
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
    successContainer: {
        alignItems: 'center',
        paddingVertical: 16,
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
        paddingHorizontal: 8,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    bannerText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
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
