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

    const shake = (anim: Animated.Value) => {
        Animated.sequence([
            Animated.timing(anim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 5, duration: 50, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -5, duration: 50, useNativeDriver: true }),
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
            Alert.alert('Sign In Failed', 'Incorrect email or password. Please try again.');
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

                        <View style={styles.card}>
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
                                            size={22}
                                            color={darkMode ? '#d1d5db' : colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                }
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                            />

                            <TouchableOpacity
                                style={styles.forgot}
                                onPress={() => router.push('/ForgotPasswordScreen')}
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
                                style={[
                                    styles.createAccountButton,
                                    {
                                        backgroundColor: darkMode
                                            ? 'rgba(59,130,246,0.16)'
                                            : 'rgba(59,130,246,0.12)',
                                    },
                                ]}
                                onPress={() => router.push('/SignupScreen')}
                            >
                                <Ionicons
                                    name="person-add-outline"
                                    size={20}
                                    color={colors.primary}
                                    style={{ marginRight: 12 }}
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
        paddingRight: 50,
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

    forgot: {
        alignSelf: 'flex-end',
        marginTop: 2,
        marginBottom: 20,        // reduced from 28
        paddingVertical: 6,
    },

    forgotText: {
        fontSize: 15,
        fontWeight: '600',
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

    createAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        borderRadius: 14,
        marginTop: 8,            // reduced from 12
    },

    createAccountText: {
        fontSize: 16,
        fontWeight: '600',
    },

    errorText: {
        color: '#dc2626',
        marginTop: 6,
        fontSize: 13.5,
        fontWeight: '500',
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,           // reduced from 40
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});