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
            Animated.timing(anim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 5, duration: 50, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -5, duration: 50, useNativeDriver: true }),
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

                        <View style={styles.card}>
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
                                            size={22}
                                            color={darkMode ? '#d1d5db' : colors.textSecondary}
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
                                            size={22}
                                            color={darkMode ? '#d1d5db' : colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                }
                                returnKeyType="done"
                                onSubmitEditing={validateAndSignup}
                                refInput={confirmRef}
                            />

                            <View style={styles.termsContainer}>
                                <AppText
                                    style={[
                                        styles.termsLine,
                                        { color: darkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.70)' },
                                    ]}
                                >
                                    By creating an account, you agree to our
                                </AppText>
                                <View style={styles.termsLinksRow}>
                                    <TouchableOpacity onPress={() => Alert.alert('Terms of Service')}>
                                        <AppText style={[styles.termsLink, { color: colors.primary }]}>
                                            Terms of Service
                                        </AppText>
                                    </TouchableOpacity>
                                    <AppText
                                        style={[
                                            styles.termsAnd,
                                            { color: darkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.70)' },
                                        ]}
                                    >
                                        {' and '}
                                    </AppText>
                                    <TouchableOpacity onPress={() => Alert.alert('Privacy Policy')}>
                                        <AppText style={[styles.termsLink, { color: colors.primary }]}>
                                            Privacy Policy
                                        </AppText>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Button
                                title="Create Account"
                                icon="person-add-outline"
                                onPress={validateAndSignup}
                                variant="primary"
                                fullWidth
                                loading={loading}
                                disabled={loading}
                                style={{ marginTop: 16 }} // reduced
                            />

                            <View style={styles.divider}>
                                <View
                                    style={[
                                        styles.line,
                                        { backgroundColor: darkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)' },
                                    ]}
                                />
                                <AppText
                                    style={[
                                        styles.orText,
                                        { color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' },
                                    ]}
                                >
                                    OR
                                </AppText>
                                <View
                                    style={[
                                        styles.line,
                                        { backgroundColor: darkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)' },
                                    ]}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.backLink}
                                onPress={() => router.push('/LoginScreen')}
                            >
                                <AppText
                                    style={[
                                        styles.backLinkText,
                                        { color: colors.primary },
                                    ]}
                                >
                                    Already have an account? Sign in
                                </AppText>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <AppText style={styles.footer}>
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

    return (
        <View style={styles.field}>
            <AppText
                style={[
                    styles.label,
                    {
                        color: darkMode ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.80)',
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
                                backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
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
        paddingTop: 32,          // reduced
        paddingBottom: 60,       // reduced
        justifyContent: 'center',
    },

    wrapper: { width: '100%' },

    largeWrapper: { maxWidth: 480 },

    card: {
        borderRadius: 24,
        padding: 24,             // reduced from 28
        borderWidth: 1,
    },

    field: {
        marginBottom: 20,        // reduced from 28
    },

    label: {
        marginBottom: 6,         // reduced from 8
        fontSize: 14.5,
        fontWeight: '500',
    },

    inputWrapper: { position: 'relative' },

    input: {
        height: 54,              // reduced from 58
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
        top: 16,                 // adjusted for height 54
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

    termsContainer: {
        marginVertical: 20,      // reduced from 32
        alignItems: 'center',
    },

    termsLine: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },

    termsLinksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 4,
    },

    termsLink: {
        fontSize: 14,
        textDecorationLine: 'underline',
        fontWeight: '500',
    },

    termsAnd: {
        fontSize: 14,
    },

    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,      // reduced from 32
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

    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,            // reduced from 12
        paddingVertical: 10,
    },

    backLinkText: {
        fontSize: 16,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,           // reduced from 40
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});