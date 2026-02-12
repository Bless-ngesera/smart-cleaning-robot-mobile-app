// app/LoginScreen.tsx
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

export default function LoginScreen() {
    const { colors } = useThemeContext();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Shake animation refs for error feedback
    const emailShake = useRef(new Animated.Value(0)).current;
    const passwordShake = useRef(new Animated.Value(0)).current;

    const passwordRef = useRef<TextInput>(null);

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

    const validateAndLogin = async () => {
        setEmailError('');
        setPasswordError('');

        let isValid = true;

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

        if (!isValid) return;

        setLoading(true);
        try {
            // === C++ BRIDGE / REAL IMPLEMENTATION POINT (Optional) ===
            // For maximum security, encrypt or hash password natively before sending
            // Android (JNI): const safeCreds = await RobotBridge.prepareLoginCredentials(email.trim(), password);
            // iOS (Obj-C++): const safeCreds = await [RobotBridge prepareLoginCredentialsWithEmail:email.trim() password:password];

            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) throw error;

            // Success → auto-redirect via auth listener
        } catch (err: any) {
            let message = 'Unable to sign in. Please try again.';
            if (err.message.includes('Invalid login credentials')) {
                message = 'Incorrect email or password';
                setEmailError('Invalid credentials');
                setPasswordError('Invalid credentials');
                shakeField(emailShake);
                shakeField(passwordShake);
            } else if (err.message.includes('Email not confirmed')) {
                message = 'Please confirm your email before signing in';
            }
            Alert.alert('Sign In Failed', message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Loader message="Signing you in..." />;
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
                        title="Welcome Back"
                        subtitle="Sign in to control your Smart Cleaner Pro"
                    />

                    {/* Main Form */}
                    <View style={styles.form}>
                        <AppText variant="title" className="text-center mb-10">
                            Sign In
                        </AppText>

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
                                        onSubmitEditing={() => passwordRef.current?.focus()}
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
                                        ref={passwordRef}
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
                                        returnKeyType="done"
                                        onSubmitEditing={validateAndLogin}
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

                        {/* Forgot Password */}
                        <TouchableOpacity
                            style={styles.forgotLink}
                            onPress={() => router.push('/ForgotPasswordScreen')}
                        >
                            <AppText className="text-primary font-medium text-right">
                                Forgot password?
                            </AppText>
                        </TouchableOpacity>

                        {/* Sign In Button */}
                        <Button
                            title="Sign In"
                            icon="log-in-outline"
                            onPress={validateAndLogin}
                            variant="primary"
                            fullWidth
                            loading={loading}
                            disabled={loading}
                            style={{ marginTop: 32 }}
                        />

                        {/* OR Divider */}
                        <View style={styles.orContainer}>
                            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                            <AppText className="text-textSecondary px-4 text-sm">OR</AppText>
                            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                        </View>

                        {/* Create New Account – now looks almost identical to Sign In (just outline) */}
                        <Button
                            title="Create New Account"
                            icon="person-add-outline"
                            onPress={() => router.push('/SignupScreen')}
                            variant="outline"
                            fullWidth
                            style={{ marginTop: 10 }} // reduced margin as requested
                        />
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
    forgotLink: {
        alignSelf: 'flex-end',
        marginBottom: 10,
        paddingVertical: 8,
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
});