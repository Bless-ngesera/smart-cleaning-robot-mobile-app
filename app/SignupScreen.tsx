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
    Keyboard,
    useWindowDimensions,
    ActivityIndicator,
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
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';

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
    onFocus?: () => void;
    onBlur?: () => void;
    editable?: boolean;
    placeholder?: string;
}

interface PasswordRequirement {
    id: string;
    label: string;
    validator: (password: string) => boolean;
}

export default function SignupScreen() {
    const { colors, darkMode } = useThemeContext();
    const { user } = useAuth();
    const { showToast } = useToast();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    // Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // Success state
    const [signupDone, setSignupDone] = useState(false);

    // Generic error banner
    const [signupError, setSignupError] = useState('');

    // Real-time email availability check state
    const [emailCheckState, setEmailCheckState] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

    // Rate limit state
    const [rateLimited, setRateLimited] = useState(false);
    const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);

    // Focus states
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

    // Warning visibility
    const [showPasswordWarning, setShowPasswordWarning] = useState(false);
    const warningAnim = useRef(new Animated.Value(0)).current;

    // Error states
    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmError, setConfirmError] = useState('');

    // Animation refs
    const nameShake = useRef(new Animated.Value(0)).current;
    const emailShake = useRef(new Animated.Value(0)).current;
    const phoneShake = useRef(new Animated.Value(0)).current;
    const passwordShake = useRef(new Animated.Value(0)).current;
    const confirmShake = useRef(new Animated.Value(0)).current;

    // Input refs
    const emailRef = useRef<TextInput>(null);
    const phoneRef = useRef<TextInput>(null);
    const passRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);

    // Timer refs
    const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Mounted ref for cleanup
    const mountedRef = useRef(true);

    // Password requirements
    const passwordRequirements: PasswordRequirement[] = [
        {
            id: 'length',
            label: 'At least 6 characters',
            validator: (pwd) => pwd.length >= 6,
        },
        {
            id: 'uppercase',
            label: 'At least one uppercase letter',
            validator: (pwd) => /[A-Z]/.test(pwd),
        },
        {
            id: 'lowercase',
            label: 'At least one lowercase letter',
            validator: (pwd) => /[a-z]/.test(pwd),
        },
        {
            id: 'number',
            label: 'At least one number',
            validator: (pwd) => /[0-9]/.test(pwd),
        },
        {
            id: 'special',
            label: 'At least one special character (!@#$%^&*)',
            validator: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
        },
    ];

    const getRequirementStatus = useCallback((pwd: string) => {
        return passwordRequirements.map(req => ({
            ...req,
            met: req.validator(pwd),
        }));
    }, []);

    const areAllRequirementsMet = useCallback((pwd: string) => {
        return passwordRequirements.every(req => req.validator(pwd));
    }, []);

    const requirementStatus = getRequirementStatus(password);
    const allRequirementsMet = areAllRequirementsMet(password);

    /* ---------------------------------------------------------- */
    /* RATE LIMIT COOLDOWN TIMER */
    /* ---------------------------------------------------------- */
    useEffect(() => {
        if (cooldownUntil && mountedRef.current) {
            const updateCooldown = () => {
                const now = new Date();
                const diff = cooldownUntil.getTime() - now.getTime();

                if (diff <= 0) {
                    setRateLimited(false);
                    setCooldownUntil(null);
                    setCooldownSeconds(0);
                    if (cooldownTimerRef.current) {
                        clearInterval(cooldownTimerRef.current);
                        cooldownTimerRef.current = null;
                    }
                } else {
                    setCooldownSeconds(Math.ceil(diff / 1000));
                }
            };

            updateCooldown();
            cooldownTimerRef.current = setInterval(updateCooldown, 1000);

            return () => {
                if (cooldownTimerRef.current) {
                    clearInterval(cooldownTimerRef.current);
                    cooldownTimerRef.current = null;
                }
            };
        }
    }, [cooldownUntil]);

    /* ---------------------------------------------------------- */
    /* WARNING VISIBILITY MANAGEMENT */
    /* ---------------------------------------------------------- */
    const showWarning = useCallback(() => {
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
            warningTimerRef.current = null;
        }

        setShowPasswordWarning(true);
        Animated.timing(warningAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        warningTimerRef.current = setTimeout(() => {
            if (mountedRef.current) {
                Animated.timing(warningAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    setShowPasswordWarning(false);
                });
            }
        }, 10000);
    }, []);

    const hideWarning = useCallback(() => {
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
            warningTimerRef.current = null;
        }

        Animated.timing(warningAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setShowPasswordWarning(false);
        });
    }, []);

    useEffect(() => {
        if (password && !allRequirementsMet && (isPasswordFocused || isConfirmPasswordFocused)) {
            showWarning();
        } else if (allRequirementsMet) {
            hideWarning();
        }
    }, [password, allRequirementsMet, isPasswordFocused, isConfirmPasswordFocused]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (warningTimerRef.current) {
                clearTimeout(warningTimerRef.current);
            }
            if (cooldownTimerRef.current) {
                clearInterval(cooldownTimerRef.current);
            }
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
    /* EMAIL AVAILABILITY CHECK (on blur)                        */
    /* ---------------------------------------------------------- */
    const handleEmailBlur = useCallback(async () => {
        const trimmed = email.trim();
        if (!trimmed || !authService.validateEmail(trimmed)) {
            setEmailCheckState('idle');
            return;
        }
        setEmailCheckState('checking');
        try {
            const isTaken = await authService.checkUserExists(trimmed.toLowerCase());
            if (!mountedRef.current) return;
            if (isTaken) {
                setEmailCheckState('taken');
                setEmailError('Email already used by another user');
                shakeField(emailShake);
            } else {
                setEmailCheckState('available');
                // Clear stale "already used" error since we confirmed the email is now free
                setEmailError((prev: string) => prev === 'Email already used by another user' ? '' : prev);
            }
        } catch {
            setEmailCheckState('idle');
        }
    }, [email, shakeField, emailShake]);

    /* ---------------------------------------------------------- */
    /* FORM VALIDATION */
    /* ---------------------------------------------------------- */
    const validateForm = useCallback((): boolean => {
        let valid = true;

        setNameError('');
        setEmailError('');
        setPhoneError('');
        setPasswordError('');
        setConfirmError('');

        if (!fullName.trim()) {
            setNameError('Full name is required');
            shakeField(nameShake);
            valid = false;
        } else if (fullName.trim().length < 2) {
            setNameError('Name must be at least 2 characters');
            shakeField(nameShake);
            valid = false;
        }

        if (!email.trim()) {
            setEmailError('Email is required');
            shakeField(emailShake);
            valid = false;
        } else if (!authService.validateEmail(email.trim())) {
            setEmailError('Enter a valid email address');
            shakeField(emailShake);
            valid = false;
        } else if (emailCheckState === 'taken') {
            setEmailError('Email already used by another user');
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

        if (!password) {
            setPasswordError('Password is required');
            shakeField(passwordShake);
            valid = false;
        } else if (!allRequirementsMet) {
            setPasswordError('Please meet all password requirements');
            shakeField(passwordShake);
            showWarning();
            valid = false;
        }

        if (!confirmPassword) {
            setConfirmError('Please confirm your password');
            shakeField(confirmShake);
            valid = false;
        } else if (confirmPassword !== password) {
            setConfirmError('Passwords do not match');
            shakeField(confirmShake);
            valid = false;
        }

        if (!acceptedTerms) {
            Alert.alert(
                'Terms Required',
                'Please accept the Terms of Service and Privacy Policy to continue.'
            );
            valid = false;
        }

        return valid;
    }, [fullName, email, emailCheckState, phone, password, confirmPassword, acceptedTerms, allRequirementsMet, shakeField, showWarning]);

    /* ---------------------------------------------------------- */
    /* SIGNUP HANDLER */
    /* ---------------------------------------------------------- */
    const handleSignUp = useCallback(async () => {
        if (loading || rateLimited) return;

        if (cooldownUntil && new Date() < cooldownUntil) {
            const minutesLeft = Math.ceil((cooldownUntil.getTime() - Date.now()) / 60000);
            const secondsLeft = Math.ceil((cooldownUntil.getTime() - Date.now()) / 1000);

            if (minutesLeft > 0) {
                Alert.alert(
                    'Rate Limit Active',
                    `Please wait ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} before trying again. This is a security measure to prevent abuse.`
                );
            } else {
                Alert.alert(
                    'Rate Limit Active',
                    `Please wait ${secondsLeft} second${secondsLeft > 1 ? 's' : ''} before trying again.`
                );
            }
            return;
        }

        Keyboard.dismiss();

        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        if (!validateForm()) return;

        setLoading(true);

        try {
            const response = await authService.signUp(
                email.trim().toLowerCase(),
                password,
                fullName.trim(),
                phone.trim() || undefined
            );

            if (!response.success) {
                throw response.error;
            }

            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            if (response.data?.needsEmailConfirmation) {
                setEmailCheckState('idle');
                showToast('Account created! Please verify your email to continue.', 'success', 5000);
                setSignupDone(true);
            } else {
                setEmailCheckState('idle');
                showToast('Account created successfully! Welcome aboard.', 'success');
                router.replace('/(tabs)/01_DashboardScreen');
            }
        } catch (err: any) {
            console.error('Signup error:', err);

            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            if (err?.status === 429 || err?.code === 'RATE_LIMIT_EXCEEDED') {
                setRateLimited(true);
                const cooldownDate = new Date(Date.now() + 60 * 60 * 1000);
                setCooldownUntil(cooldownDate);
                showToast('Too many attempts. Please wait about 1 hour before trying again.', 'error', 6000);
                return;
            }

            if (err?.code === 'USER_EXISTS' ||
                err?.message?.toLowerCase().includes('already registered') ||
                err?.message?.toLowerCase().includes('already used')) {
                setEmailCheckState('taken');
                setEmailError('Email already used by another user');
                shakeField(emailShake);
                showToast('Email already used by another user', 'warning', 4000);
                Alert.alert(
                    'Email Already In Use',
                    'This email address is already associated with an account. Would you like to sign in instead?',
                    [
                        { text: 'Try Again', style: 'cancel' },
                        { text: 'Sign In', onPress: () => router.push('/LoginScreen') }
                    ]
                );
            } else if (err?.code === 'INVALID_EMAIL') {
                setEmailError(err?.message || 'Invalid email address');
                shakeField(emailShake);
            } else if (err?.code === 'INVALID_PASSWORD' || err?.message?.includes('password')) {
                setPasswordError(err?.message || 'Invalid password');
                shakeField(passwordShake);
            } else if (err?.code === 'WEAK_PASSWORD') {
                setPasswordError(err?.message || 'Password is too weak');
                shakeField(passwordShake);
                showWarning();
            } else {
                setSignupError(err?.message || 'Unable to create account. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }, [loading, rateLimited, cooldownUntil, validateForm, email, phone, password, fullName, shakeField, emailShake, passwordShake, showWarning]);

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

                        {/* Rate Limit Banner */}
                        {rateLimited && cooldownSeconds > 0 ? (
                            <View style={[styles.rateLimitBanner, {
                                backgroundColor: darkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
                                borderColor: darkMode ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)',
                            }]}>
                                <Ionicons name="timer-outline" size={20} color="#ef4444" />
                                <View style={styles.rateLimitTextContainer}>
                                    <AppText style={styles.rateLimitTitle}>Rate Limit Active</AppText>
                                    <AppText style={styles.rateLimitTime}>
                                        {Math.floor(cooldownSeconds / 60)}:{(cooldownSeconds % 60).toString().padStart(2, '0')} remaining
                                    </AppText>
                                </View>
                            </View>
                        ) : null}

                        {/* Form Card */}
                        <View style={[styles.card, {
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                            borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                            opacity: (!signupDone && rateLimited) ? 0.5 : 1,
                        }]}>

                        {signupDone ? (
                            <View style={styles.successContainer}>
                                <View style={[styles.successIconWrap, { backgroundColor: `${colors.primary}20` }]}>
                                    <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
                                </View>

                                <AppText style={[styles.successTitle, { color: darkMode ? '#ffffff' : '#111827' }]}>
                                    Account Created!
                                </AppText>

                                <AppText style={[styles.successMsg, { color: darkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.60)' }]}>
                                    We sent a verification link to
                                </AppText>

                                <View style={[styles.emailChip, {
                                    backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                    borderColor: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)',
                                }]}>
                                    <Ionicons name="mail-outline" size={16} color={colors.primary} />
                                    <AppText style={[styles.emailChipText, { color: colors.primary }]}>
                                        {email}
                                    </AppText>
                                </View>

                                <AppText style={[styles.successNote, { color: darkMode ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.55)' }]}>
                                    Click the link in your email to verify your account before logging in. Check your spam folder if you don't see it.
                                </AppText>

                                <Button
                                    title="Go to Login"
                                    icon="log-in-outline"
                                    onPress={() => router.replace('/LoginScreen')}
                                    variant="primary"
                                    fullWidth
                                    style={{ marginTop: 8 }}
                                />
                            </View>
                        ) : (
                            <>
                            <Field
                                label="Full Name"
                                value={fullName}
                                onChangeText={(text) => {
                                    setFullName(text);
                                    if (nameError) setNameError('');
                                    if (signupError) setSignupError('');
                                }}
                                error={nameError}
                                icon="person-outline"
                                colors={colors}
                                darkMode={darkMode}
                                shake={nameShake}
                                returnKeyType="next"
                                onSubmitEditing={() => emailRef.current?.focus()}
                                autoCapitalize="words"
                                editable={!rateLimited}
                                placeholder="Enter your full name"
                            />

                            <Field
                                label="Email Address"
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    if (emailError) setEmailError('');
                                    setEmailCheckState('idle');
                                }}
                                error={emailError}
                                icon="mail-outline"
                                colors={colors}
                                darkMode={darkMode}
                                shake={emailShake}
                                keyboardType="email-address"
                                refInput={emailRef}
                                returnKeyType="next"
                                onSubmitEditing={() => phoneRef.current?.focus()}
                                autoCapitalize="none"
                                editable={!rateLimited}
                                placeholder="Enter your email"
                                onBlur={handleEmailBlur}
                                rightIcon={
                                    emailCheckState === 'checking' ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    ) : emailCheckState === 'available' ? (
                                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                    ) : emailCheckState === 'taken' ? (
                                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                                    ) : undefined
                                }
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
                                refInput={phoneRef}
                                returnKeyType="next"
                                onSubmitEditing={() => passRef.current?.focus()}
                                editable={!rateLimited}
                                placeholder="e.g. +1 234 567 8900"
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
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => setIsPasswordFocused(false)}
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
                                editable={!rateLimited}
                                placeholder="Create a strong password"
                            />

                            {/* Password Requirements Warning */}
                            {showPasswordWarning && !allRequirementsMet ? (
                                <Animated.View
                                    style={[
                                        styles.warningContainer,
                                        {
                                            opacity: warningAnim,
                                            transform: [{
                                                translateY: warningAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [-20, 0],
                                                }),
                                            }],
                                            backgroundColor: darkMode ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)',
                                            borderColor: darkMode ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.2)',
                                        },
                                    ]}
                                >
                                    <View style={styles.warningHeader}>
                                        <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                                        <AppText style={styles.warningTitle}>Password Requirements</AppText>
                                    </View>

                                    {requirementStatus.map((req) => (
                                        <View key={req.id} style={styles.warningRequirement}>
                                            <Ionicons
                                                name={req.met ? 'checkmark-circle' : 'close-circle'}
                                                size={16}
                                                color={req.met ? '#10B981' : '#ef4444'}
                                            />
                                            <AppText
                                                style={[
                                                    styles.warningText,
                                                    {
                                                        color: req.met
                                                            ? '#10B981'
                                                            : (darkMode ? '#ef4444' : '#dc2626'),
                                                        textDecorationLine: req.met ? 'line-through' : 'none',
                                                    },
                                                ]}
                                            >
                                                {req.label}
                                            </AppText>
                                        </View>
                                    ))}

                                    <View style={styles.warningFooter}>
                                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                                        <AppText style={[styles.warningTimeout, { color: colors.textSecondary }]}>
                                            This message will disappear in 10 seconds
                                        </AppText>
                                    </View>
                                </Animated.View>
                            ) : null}

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
                                onFocus={() => setIsConfirmPasswordFocused(true)}
                                onBlur={() => setIsConfirmPasswordFocused(false)}
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
                                editable={!rateLimited}
                                placeholder="Re-enter your password"
                            />

                            {/* Password Match Indicator */}
                            {confirmPassword.length > 0 ? (
                                <View style={styles.matchIndicator}>
                                    <Ionicons
                                        name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                                        size={16}
                                        color={password === confirmPassword ? '#10B981' : '#ef4444'}
                                    />
                                    <AppText
                                        style={[
                                            styles.matchText,
                                            { color: password === confirmPassword ? '#10B981' : '#ef4444' },
                                        ]}
                                    >
                                        {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                                    </AppText>
                                </View>
                            ) : null}

                            {/* Terms and Conditions */}
                            <TouchableOpacity
                                style={styles.termsContainer}
                                onPress={toggleTerms}
                                activeOpacity={0.7}
                                disabled={rateLimited}
                            >
                                <View style={[styles.checkbox, {
                                    borderColor: acceptedTerms ? colors.primary : (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'),
                                    backgroundColor: acceptedTerms ? `${colors.primary}20` : 'transparent',
                                }]}>
                                    {acceptedTerms ? (
                                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                                    ) : null}
                                </View>
                                <AppText
                                    style={[
                                        styles.termsText,
                                        { color: darkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.70)' },
                                    ]}
                                >
                                    {'I agree to the '}
                                    <AppText style={[styles.termsLink, { color: colors.primary }]}>
                                        Terms of Service
                                    </AppText>
                                    {' and '}
                                    <AppText style={[styles.termsLink, { color: colors.primary }]}>
                                        Privacy Policy
                                    </AppText>
                                </AppText>
                            </TouchableOpacity>

                            {signupError ? (
                                <View style={[styles.errorBanner, {
                                    backgroundColor: darkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
                                    borderColor: '#ef4444',
                                }]}>
                                    <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                                    <AppText style={styles.errorBannerText}>{signupError}</AppText>
                                </View>
                            ) : null}

                            <Button
                                title={rateLimited ? "Too Many Attempts" : "Create Account"}
                                icon="person-add-outline"
                                onPress={handleSignUp}
                                variant={rateLimited ? "secondary" : "primary"}
                                fullWidth
                                disabled={loading || !fullName || !email || !password || !confirmPassword || !acceptedTerms || rateLimited}
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
                   onFocus,
                   onBlur,
                   editable = true,
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
                        opacity: editable ? 1 : 0.5,
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
                        style={[styles.inputIconLeft, { opacity: editable ? 1 : 0.5 }]}
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
                                opacity: editable ? 1 : 0.5,
                            },
                        ]}
                        placeholderTextColor={darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        keyboardType={keyboardType}
                        returnKeyType={returnKeyType}
                        onSubmitEditing={onSubmitEditing}
                        autoCapitalize={autoCapitalize}
                        autoCorrect={false}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        editable={editable}
                        allowFontScaling={false}
                    />

                    {rightIcon ? <View style={[styles.rightIcon, { opacity: editable ? 1 : 0.5 }]}>{rightIcon}</View> : null}
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
        marginBottom: 8,
    },
    successMsg: {
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
        marginBottom: 16,
    },
    emailChipText: {
        fontSize: 15,
        fontWeight: '600',
    },
    successNote: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 19,
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    rateLimitBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
    },
    rateLimitTextContainer: {
        flex: 1,
    },
    rateLimitTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ef4444',
        marginBottom: 2,
    },
    rateLimitTime: {
        fontSize: 13,
        color: '#ef4444',
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
        marginTop: 6,
        fontSize: 13.5,
        color: '#dc2626',
    },
    warningContainer: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        marginBottom: 20,
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F59E0B',
    },
    warningRequirement: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    warningText: {
        fontSize: 13,
        flex: 1,
    },
    warningFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    warningTimeout: {
        fontSize: 11,
    },
    matchIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    matchText: {
        fontSize: 12,
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
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#ef4444',
        lineHeight: 20,
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
