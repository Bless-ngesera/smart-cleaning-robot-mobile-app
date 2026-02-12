// app/SignupScreen.tsx
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import Header from '../src/components/Header';
import Loader from '../src/components/Loader';
import Button from '../src/components/Button';
import AppText from '../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

export default function SignupScreen() {
    const { colors } = useThemeContext();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmError, setConfirmError] = useState('');

    // Shake animation refs for error feedback
    const nameShake = useRef(new Animated.Value(0)).current;
    const emailShake = useRef(new Animated.Value(0)).current;
    const passwordShake = useRef(new Animated.Value(0)).current;
    const confirmShake = useRef(new Animated.Value(0)).current;

    // Refs for focus chaining
    const emailRef = useRef<TextInput>(null);
    const passRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);

    // Auto-redirect if already logged in
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace('/(tabs)/01_DashboardScreen');
            }
        };
        checkSession();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                router.replace('/(tabs)/01_DashboardScreen');
            }
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    // Subtle shake on error
    const shakeField = (anim: Animated.Value) => {
        Animated.sequence([
            Animated.timing(anim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 4, duration: 50, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -4, duration: 50, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const validateAndSignup = async () => {
        setNameError('');
        setEmailError('');
        setPasswordError('');
        setConfirmError('');

        let isValid = true;

        if (!name.trim()) {
            setNameError('Full name is required');
            shakeField(nameShake);
            isValid = false;
        } else if (name.trim().length < 2) {
            setNameError('Name must be at least 2 characters');
            shakeField(nameShake);
            isValid = false;
        }

        if (!email.trim()) {
            setEmailError('Email is required');
            shakeField(emailShake);
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
            setEmailError('Please enter a valid email');
            shakeField(emailShake);
            isValid = false;
        }

        if (!password.trim()) {
            setPasswordError('Password is required');
            shakeField(passwordShake);
            isValid = false;
        } else if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            shakeField(passwordShake);
            isValid = false;
        }

        if (!confirmPassword.trim()) {
            setConfirmError('Please confirm your password');
            shakeField(confirmShake);
            isValid = false;
        } else if (confirmPassword !== password) {
            setConfirmError('Passwords do not match');
            shakeField(confirmShake);
            isValid = false;
        }

        if (!isValid) return;

        setLoading(true);
        try {
            // === C++ BRIDGE / REAL IMPLEMENTATION POINT (Optional) ===
            // For maximum security, encrypt or hash password natively before sending
            // Android (JNI): const safeCreds = await RobotBridge.prepareLoginCredentials(email.trim(), password);
            // iOS (Obj-C++): const safeCreds = await [RobotBridge prepareLoginCredentialsWithEmail:email.trim() password:password];

            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        full_name: name.trim(),
                    },
                },
            });

            if (error) throw error;

            if (data.user) {
                Alert.alert(
                    'Account Created',
                    'Please check your email to confirm your account before signing in.'
                );
                router.push('/LoginScreen');
            } else {
                throw new Error('No user returned');
            }
        } catch (err: any) {
            let message = 'Unable to create account. Please try again.';
            if (err.message.includes('User already registered')) {
                message = 'This email is already registered';
                setEmailError('Email already in use');
                shakeField(emailShake);
            } else if (err.message.includes('Password should be at least')) {
                message = 'Password is too weak';
                setPasswordError('Password too weak');
                shakeField(passwordShake);
            }
            Alert.alert('Signup Failed', message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Loader message="Creating your account..." />;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <Header
                        title="Create Account"
                        subtitle="Join Smart Cleaner Pro today"
                    />

                    {/* Main Form */}
                    <View style={styles.form}>
                        <AppText variant="title" className="text-center mb-10">
                            Create Account
                        </AppText>

                        {/* Full Name */}
                        <View style={styles.field}>
                            <AppText className="text-sm font-medium text-textSecondary mb-2">
                                Full Name
                            </AppText>

                            <Animated.View style={{ transform: [{ translateX: nameShake }] }}>
                                <View style={styles.inputWrapper}>
                                    <Ionicons
                                        name="person-outline"
                                        size={20}
                                        color={nameError ? '#ef4444' : colors.textSecondary}
                                        style={styles.inputIconLeft}
                                    />

                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                borderColor: nameError ? '#ef4444' : colors.border,
                                                color: colors.text,
                                            },
                                        ]}
                                        value={name}
                                        onChangeText={(text) => {
                                            setName(text);
                                            if (nameError) setNameError('');
                                        }}
                                        autoCapitalize="words"
                                        returnKeyType="next"
                                        onSubmitEditing={() => emailRef.current?.focus()}
                                        accessibilityLabel="Full name"
                                    />

                                    {nameError && (
                                        <Ionicons
                                            name="alert-circle"
                                            size={20}
                                            color="#ef4444"
                                            style={styles.inputIconRight}
                                        />
                                    )}
                                </View>
                            </Animated.View>

                            {nameError && (
                                <AppText className="text-error text-sm mt-2">{nameError}</AppText>
                            )}
                        </View>

                        {/* Email */}
                        <View style={styles.field}>
                            <AppText className="text-sm font-medium text-textSecondary mb-2">
                                Email Address
                            </AppText>

                            <Animated.View style={{ transform: [{ translateX: emailShake }] }}>
                                <View style={styles.inputWrapper}>
                                    <Ionicons
                                        name="mail-outline"
                                        size={20}
                                        color={emailError ? '#ef4444' : colors.textSecondary}
                                        style={styles.inputIconLeft}
                                    />

                                    <TextInput
                                        ref={emailRef}
                                        style={[
                                            styles.input,
                                            {
                                                borderColor: emailError ? '#ef4444' : colors.border,
                                                color: colors.text,
                                            },
                                        ]}
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            if (emailError) setEmailError('');
                                        }}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        returnKeyType="next"
                                        onSubmitEditing={() => passRef.current?.focus()}
                                        accessibilityLabel="Email address"
                                    />

                                    {emailError && (
                                        <Ionicons
                                            name="alert-circle"
                                            size={20}
                                            color="#ef4444"
                                            style={styles.inputIconRight}
                                        />
                                    )}
                                </View>
                            </Animated.View>

                            {emailError && (
                                <AppText className="text-error text-sm mt-2">{emailError}</AppText>
                            )}
                        </View>

                        {/* Password */}
                        <View style={styles.field}>
                            <AppText className="text-sm font-medium text-textSecondary mb-2">
                                Password
                            </AppText>

                            <Animated.View style={{ transform: [{ translateX: passwordShake }] }}>
                                <View style={styles.inputWrapper}>
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={20}
                                        color={passwordError ? '#ef4444' : colors.textSecondary}
                                        style={styles.inputIconLeft}
                                    />

                                    <TextInput
                                        ref={passRef}
                                        style={[
                                            styles.input,
                                            {
                                                borderColor: passwordError ? '#ef4444' : colors.border,
                                                color: colors.text,
                                            },
                                        ]}
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            if (passwordError) setPasswordError('');
                                        }}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        returnKeyType="next"
                                        onSubmitEditing={() => confirmRef.current?.focus()}
                                        accessibilityLabel="Password"
                                    />

                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setShowPassword(!showPassword)}
                                        accessibilityLabel="Toggle password visibility"
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>

                            {passwordError && (
                                <AppText className="text-error text-sm mt-2">{passwordError}</AppText>
                            )}
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.field}>
                            <AppText className="text-sm font-medium text-textSecondary mb-2">
                                Confirm Password
                            </AppText>

                            <Animated.View style={{ transform: [{ translateX: confirmShake }] }}>
                                <View style={styles.inputWrapper}>
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={20}
                                        color={confirmError ? '#ef4444' : colors.textSecondary}
                                        style={styles.inputIconLeft}
                                    />

                                    <TextInput
                                        ref={confirmRef}
                                        style={[
                                            styles.input,
                                            {
                                                borderColor: confirmError ? '#ef4444' : colors.border,
                                                color: colors.text,
                                            },
                                        ]}
                                        value={confirmPassword}
                                        onChangeText={(text) => {
                                            setConfirmPassword(text);
                                            if (confirmError) setConfirmError('');
                                        }}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                        returnKeyType="done"
                                        onSubmitEditing={validateAndSignup}
                                        accessibilityLabel="Confirm password"
                                    />

                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        accessibilityLabel="Toggle confirm password visibility"
                                    >
                                        <Ionicons
                                            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>

                            {confirmError && (
                                <AppText className="text-error text-sm mt-2">{confirmError}</AppText>
                            )}
                        </View>

                        {/* Terms */}
                        <AppText className="text-textSecondary text-sm text-center mb-8">
                            By creating an account, you agree to our{' '}
                            <AppText className="text-primary">Terms of Service</AppText> and{' '}
                            <AppText className="text-primary">Privacy Policy</AppText>
                        </AppText>

                        {/* Create Account Button – almost identical to Sign In */}
                        <Button
                            title="Create Account"
                            icon="person-add-outline"
                            onPress={validateAndSignup}
                            variant="primary" // same as Sign In, but you can change to outline if you prefer difference
                            fullWidth
                            loading={loading}
                            disabled={loading}
                            style={{ marginTop: 10 }} // tight spacing as requested
                        />

                        {/* OR Divider */}
                        <View style={styles.orContainer}>
                            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                            <AppText className="text-textSecondary px-4 text-sm">OR</AppText>
                            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                        </View>

                        {/* Back to Login */}
                        <TouchableOpacity
                            style={styles.backLink}
                            onPress={() => router.push('/LoginScreen')}
                        >
                            <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
                            <AppText className="text-primary font-medium">
                                Already have an account? Sign in
                            </AppText>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <AppText className="text-textSecondary text-center mt-12 text-xs opacity-70">
                        Version 1.0.0 • Smart Cleaner Pro © 2026
                    </AppText>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 60,
        justifyContent: 'center',
    },
    form: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        marginTop: 40,
    },
    field: {
        marginBottom: 10, // reduced as requested
    },
    inputWrapper: {
        position: 'relative',
    },
    input: {
        height: 56,
        borderWidth: 1.5,
        borderRadius: 16,
        paddingLeft: 48,
        paddingRight: 48,
        fontSize: 16,
    },
    inputIconLeft: {
        position: 'absolute',
        left: 16,
        top: 18,
        zIndex: 1,
    },
    inputIconRight: {
        position: 'absolute',
        right: 16,
        top: 18,
        zIndex: 1,
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
        top: 18,
        zIndex: 1,
        padding: 8,
    },
    orContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10, // reduced as requested
    },
    orLine: {
        flex: 1,
        height: 1,
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        paddingVertical: 12,
    },
});