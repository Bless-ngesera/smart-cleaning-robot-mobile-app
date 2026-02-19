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
    Dimensions,
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

const { width } = Dimensions.get('window');
const isLargeScreen = width >= 768;

export default function LoginScreen() {
    const { colors, darkMode } = useThemeContext();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const emailShake = useRef(new Animated.Value(0)).current;
    const passwordShake = useRef(new Animated.Value(0)).current;

    const passwordRef = useRef<TextInput>(null);

    // Auto-redirect if already logged in
    useEffect(() => {
        let mounted = true;

        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && session) {
                router.replace('/(tabs)/01_DashboardScreen');
            }
        };

        checkSession();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted && session) {
                router.replace('/(tabs)/01_DashboardScreen');
            }
        });

        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, []);

    // Subtle shake on error
    const shake = (anim: Animated.Value) => {
        Animated.sequence([
            Animated.timing(anim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 4, duration: 50, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -4, duration: 50, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleLogin = async () => {
        if (loading) return;

        setEmailError('');
        setPasswordError('');

        let valid = true;

        if (!email.trim()) {
            setEmailError('Email is required');
            shake(emailShake);
            valid = false;
        } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
            setEmailError('Enter a valid email');
            shake(emailShake);
            valid = false;
        }

        if (!password.trim()) {
            setPasswordError('Password is required');
            shake(passwordShake);
            valid = false;
        } else if (password.length < 6) {
            setPasswordError('Minimum 6 characters');
            shake(passwordShake);
            valid = false;
        }

        if (!valid) return;

        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) throw error;
        } catch (err: any) {
            setEmailError('Invalid credentials');
            setPasswordError('Invalid credentials');
            shake(emailShake);
            shake(passwordShake);
            Alert.alert('Sign In Failed', 'Incorrect email or password');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loader message="Signing you in..." />;

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
                            title="Welcome Back"
                            subtitle="Sign in to control your Smart Cleaner Pro"
                        />

                        {/* Premium Flat Card */}
                        <View style={styles.card}>
                            {/* Email Field */}
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
                                returnKeyType="next"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                            />

                            {/* Password Field */}
                            <Field
                                refInput={passwordRef}
                                label="Password"
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
                                            size={20}
                                            color={darkMode ? '#ffffff' : colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                }
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                            />

                            {/* Forgot Password */}
                            <TouchableOpacity
                                style={styles.forgot}
                                onPress={() => router.push('/ForgotPasswordScreen')}
                            >
                                <AppText style={styles.forgotText}>
                                    Forgot password?
                                </AppText>
                            </TouchableOpacity>

                            {/* Sign In Button */}
                            <Button
                                title="Sign In"
                                icon="log-in-outline"
                                onPress={handleLogin}
                                variant="primary"
                                fullWidth
                                loading={loading}
                                disabled={loading}
                                style={{ marginTop: 16 }}
                            />

                            {/* OR Divider */}
                            <View style={styles.divider}>
                                <View style={styles.line} />
                                <AppText style={styles.orText}>OR</AppText>
                                <View style={styles.line} />
                            </View>

                            {/* Create New Account */}
                            <TouchableOpacity
                                style={styles.createAccountButton}
                                onPress={() => router.push('/SignupScreen')}
                            >
                                <Ionicons
                                    name="person-add-outline"
                                    size={20}
                                    color={darkMode ? '#ffffff' : colors.primary}
                                    style={{ marginRight: 12 }}
                                />
                                <AppText style={styles.createAccountText}>
                                    Create New Account
                                </AppText>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
                    <AppText style={styles.footer}>
                        Version 1.0.0 • Smart Cleaner Pro © 2026
                    </AppText>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/* ================= FIELD ================= */
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
    return (
        <View style={styles.field}>
            <AppText style={[styles.label, { color: darkMode ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                {label}
            </AppText>

            <Animated.View style={{ transform: [{ translateX: shake }] }}>
                <View style={styles.inputWrapper}>
                    <Ionicons
                        name={icon}
                        size={20}
                        color={error ? '#ef4444' : darkMode ? 'rgba(255,255,255,0.6)' : colors.textSecondary}
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
                                borderColor: error ? '#ef4444' : darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                                color: darkMode ? '#ffffff' : colors.text,
                            },
                        ]}
                        placeholderTextColor={darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        {...rest}
                    />

                    {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
                </View>
            </Animated.View>

            {error && <AppText style={styles.errorText}>{error}</AppText>}
        </View>
    );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
    container: { flex: 1 },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 80,
        justifyContent: 'center',
    },

    wrapper: { width: '100%' },

    largeWrapper: { maxWidth: 480 },

    card: {
        borderRadius: 24,
        padding: 28,
        borderWidth: 1,
        // Flat premium design – no shadow, no glow
    },

    field: { marginBottom: 26 },

    label: {
        marginBottom: 6,
        fontSize: 14,
    },

    inputWrapper: { position: 'relative' },

    input: {
        height: 56,
        borderWidth: 1.2,
        borderRadius: 14,
        paddingLeft: 46,
        paddingRight: 48,
        fontSize: 16,
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

    forgot: {
        alignSelf: 'flex-end',
        marginBottom: 24,
        paddingVertical: 4,
    },

    forgotText: {
        fontSize: 15,
        fontWeight: '500',
    },

    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 28,
    },

    line: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },

    orText: {
        color: '#ffffff',
        fontSize: 14,
        marginHorizontal: 16,
    },

    createAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 14,
        marginTop: 16,
        backgroundColor: 'rgba(59, 130, 246, 0.15)', // subtle blue accent
    },

    createAccountText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#ffffff',
    },

    errorText: {
        color: '#ef4444',
        marginTop: 6,
        fontSize: 13,
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12,
        opacity: 0.7,
    },
});