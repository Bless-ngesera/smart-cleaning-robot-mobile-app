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

export default function SignupScreen() {
    const { colors, darkMode } = useThemeContext();

    const [fullName, setFullName] = useState('');
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

    const nameShake = useRef(new Animated.Value(0)).current;
    const emailShake = useRef(new Animated.Value(0)).current;
    const passwordShake = useRef(new Animated.Value(0)).current;
    const confirmShake = useRef(new Animated.Value(0)).current;

    const emailRef = useRef<TextInput>(null);
    const passRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);

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

        if (!fullName.trim()) {
            setNameError('Full name is required');
            shakeField(nameShake);
            isValid = false;
        } else if (fullName.trim().length < 2) {
            setNameError('Name must be at least 2 characters');
            shakeField(nameShake);
            isValid = false;
        }

        if (!email.trim()) {
            setEmailError('Email is required');
            shakeField(emailShake);
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
            setEmailError('Enter a valid email address');
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
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                    },
                },
            });

            if (error) throw error;

            if (data.user) {
                Alert.alert(
                    'Account Created',
                    'Please check your email to confirm your account before signing in.'
                );
                router.replace('/LoginScreen');
            } else {
                throw new Error('No user returned');
            }
        } catch (err: any) {
            let message = 'Unable to create account. Please try again.';
            if (err.message?.includes('User already registered')) {
                message = 'This email is already registered';
                setEmailError(message);
                shakeField(emailShake);
            } else if (err.message?.includes('Password should be at least')) {
                message = 'Password is too weak';
                setPasswordError(message);
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
                            title="Create Account"
                            subtitle="Join Smart Cleaner Pro today"
                        />

                        <View
                            style={[
                                styles.card,
                                {
                                    backgroundColor: darkMode ? colors.card : '#ffffff',
                                    borderColor: darkMode ? 'rgba(255,255,255,0.12)' : colors.border,
                                },
                            ]}
                        >
                            <Field
                                label="Full Name"
                                value={fullName}
                                onChangeText={(t: string) => {
                                    setFullName(t);
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
                                returnKeyType="next"
                                onSubmitEditing={() => passRef.current?.focus()}
                                refInput={emailRef}
                            />

                            <Field
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
                                returnKeyType="next"
                                onSubmitEditing={() => confirmRef.current?.focus()}
                                refInput={passRef}
                            />

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
                                            size={20}
                                            color={darkMode ? '#ffffff' : colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                }
                                returnKeyType="done"
                                onSubmitEditing={validateAndSignup}
                                refInput={confirmRef}
                            />

                            {/* Terms – forced to two clean lines */}
                            <AppText
                                style={{
                                    textAlign: 'center',
                                    color: darkMode ? '#ffffff' : colors.textSecondary,
                                    fontSize: 14,
                                    lineHeight: 20,
                                    marginBottom: 32,
                                }}
                            >
                                By creating an account, you agree to our{'\n'}
                                <TouchableOpacity onPress={() => Alert.alert('Terms of Service')}>
                                    <AppText style={{ color: colors.primary, textDecorationLine: 'underline' }}>
                                        Terms of Service
                                    </AppText>
                                </TouchableOpacity>{' '}
                                and{' '}
                                <TouchableOpacity onPress={() => Alert.alert('Privacy Policy')}>
                                    <AppText style={{ color: colors.primary, textDecorationLine: 'underline' }}>
                                        Privacy Policy
                                    </AppText>
                                </TouchableOpacity>
                            </AppText>

                            <Button
                                title="Create Account"
                                icon="person-add-outline"
                                onPress={validateAndSignup}
                                variant="primary"
                                fullWidth
                                loading={loading}
                                disabled={loading}
                                style={{ marginTop: 8 }}
                            />

                            <View style={styles.divider}>
                                <View
                                    style={[
                                        styles.line,
                                        { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                                    ]}
                                />
                                <AppText
                                    className="px-4 text-sm"
                                    style={{ color: darkMode ? '#ffffff' : colors.textSecondary }}
                                >
                                    OR
                                </AppText>
                                <View
                                    style={[
                                        styles.line,
                                        { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                                    ]}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.backLink}
                                onPress={() => router.push('/LoginScreen')}
                            >
                                <AppText
                                    style={{
                                        color: colors.primary,
                                        textDecorationLine: 'underline',
                                        fontWeight: '500',
                                    }}
                                >
                                    Already have an account? Sign in
                                </AppText>
                            </TouchableOpacity>
                        </View>

                        <AppText
                            className="text-center mt-12 text-xs opacity-85"
                            style={{ color: darkMode ? '#ffffff' : colors.textSecondary }}
                        >
                            Version 1.0.0 • Smart Cleaner Pro © 2026
                        </AppText>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Reusable Field Component ────────────────────────────────────────────────
type FieldProps = {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    error?: string;
    icon: keyof typeof Ionicons.glyphMap;
    colors: any;
    darkMode: boolean;
    shake: Animated.Value;
    secureTextEntry?: boolean;
    rightIcon?: JSX.Element;
    refInput?: React.RefObject<TextInput>;
    [key: string]: any;
};

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
               }: FieldProps) {
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

// ─── Styles ─────────────────────────────────────────────────────────────────────
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

    errorText: {
        color: '#ef4444',
        marginTop: 6,
        fontSize: 13,
    },

    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 28,
    },

    line: {
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