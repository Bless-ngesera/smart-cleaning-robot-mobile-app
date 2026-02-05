// app/LoginScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    StyleSheet,
    ScrollView,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import Button from '../src/components/Button';
import Header from '../src/components/Header';
import Loader from '../src/components/Loader';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

export default function LoginScreen() {
    const { colors, darkMode } = useThemeContext();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Floating label animations
    const emailAnim = useState(new Animated.Value(0))[0];
    const passAnim = useState(new Animated.Value(0))[0];

    // Ref for focus chaining
    const passwordRef = useRef<TextInput>(null);

    // Auto-redirect if already logged in
    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    router.replace('/(tabs)/01_DashboardScreen');
                }
            } catch (err) {
                console.error('Session check failed:', err);
            }
        };
        checkSession();
    }, []);

    const validateForm = () => {
        let valid = true;
        setEmailError('');
        setPasswordError('');

        if (!email.trim()) {
            setEmailError('Email is required');
            valid = false;
        } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
            setEmailError('Please enter a valid email');
            valid = false;
        }

        if (!password.trim()) {
            setPasswordError('Password is required');
            valid = false;
        } else if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            valid = false;
        }

        return valid;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) throw error;

            router.replace('/(tabs)/01_DashboardScreen');
        } catch (err: any) {
            Alert.alert('Login Failed', err.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const animateLabel = (anim: Animated.Value, toValue: number) => {
        Animated.timing(anim, {
            toValue,
            duration: 220,
            useNativeDriver: false,
        }).start();
    };

    if (loading) {
        return <Loader message="Signing in..." />;
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={darkMode ? ['#0f172a', '#1e293b'] : ['#f8fafc', '#e2e8f0']}
                style={styles.gradient}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoid}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 20}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Header
                            title="Welcome Back"
                            subtitle="Sign in to manage your Smart Cleaner"
                        />

                        <View style={styles.formContainer}>
                            {/* Email */}
                            <View style={styles.field}>
                                <Animated.Text
                                    style={[
                                        styles.label,
                                        {
                                            top: emailAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 4] }),
                                            fontSize: emailAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                                            color: emailAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [colors.textSecondary, colors.primary],
                                            }),
                                        },
                                    ]}
                                >
                                    Email
                                </Animated.Text>

                                <TextInput
                                    style={[
                                        styles.input,
                                        emailError && styles.inputError,
                                        { color: colors.text, borderColor: colors.border },
                                    ]}
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        animateLabel(emailAnim, text.length > 0 ? 1 : 0);
                                    }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholder=""
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                    onFocus={() => animateLabel(emailAnim, 1)}
                                    onBlur={() => animateLabel(emailAnim, email ? 1 : 0)}
                                />

                                <Ionicons
                                    name="mail-outline"
                                    size={20}
                                    color={colors.primary}
                                    style={styles.inputIcon}
                                />

                                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                            </View>

                            {/* Password */}
                            <View style={styles.field}>
                                <Animated.Text
                                    style={[
                                        styles.label,
                                        {
                                            top: passAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 4] }),
                                            fontSize: passAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                                            color: passAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [colors.textSecondary, colors.primary],
                                            }),
                                        },
                                    ]}
                                >
                                    Password
                                </Animated.Text>

                                <TextInput
                                    ref={passwordRef}
                                    style={[
                                        styles.input,
                                        passwordError && styles.inputError,
                                        { color: colors.text, borderColor: colors.border },
                                    ]}
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        animateLabel(passAnim, text.length > 0 ? 1 : 0);
                                    }}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    placeholder=""
                                    returnKeyType="done"
                                    onFocus={() => animateLabel(passAnim, 1)}
                                    onBlur={() => animateLabel(passAnim, password ? 1 : 0)}
                                />

                                <Ionicons
                                    name="lock-closed-outline"
                                    size={20}
                                    color={colors.primary}
                                    style={styles.inputIcon}
                                />

                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                        size={20}
                                        color={colors.textSecondary}
                                    />
                                </TouchableOpacity>

                                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                            </View>

                            {/* Forgot Password */}
                            <TouchableOpacity
                                style={styles.forgotLink}
                                onPress={() => router.push('/ForgotPasswordScreen')}
                            >
                                <Text style={[styles.linkText, { color: colors.primary }]}>
                                    Forgot password?
                                </Text>
                            </TouchableOpacity>

                            {/* Buttons */}
                            <View style={styles.buttons}>
                                <Button
                                    title="Sign In"
                                    icon="log-in-outline"
                                    onPress={handleLogin}
                                    variant="primary"
                                    fullWidth
                                    size="large"
                                    disabled={loading}
                                    loading={loading}
                                />

                                <View style={styles.orRow}>
                                    <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                                    <Text style={[styles.orText, { color: colors.textSecondary }]}>OR</Text>
                                    <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                                </View>

                                <Button
                                    title="Create New Account"
                                    icon="person-add-outline"
                                    onPress={() => router.push('/SignupScreen')}
                                    variant="outline"
                                    fullWidth
                                    size="large"
                                />
                            </View>
                        </View>

                        <Text style={[styles.version, { color: colors.textSecondary }]}>
                            Version 1.0.0 • Smart Cleaner Pro
                        </Text>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
        justifyContent: "center",
    },
    formContainer: {
        backgroundColor: "rgba(255,255,255,0.07)",
        borderRadius: 24,
        padding: 28,
        borderWidth: 1,
        borderColor: "rgba(200,200,200,0.12)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 10,
        marginTop: 20,
        marginBottom: 32,
    },
    field: {
        marginBottom: 20,
        position: 'relative',
    },
    input: {
        height: 56,
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 48,
        fontSize: 16,
    },
    inputError: {
        borderColor: '#ef4444',
    },
    inputIcon: {
        position: 'absolute',
        left: 16,
        top: 18,
        zIndex: 1,
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
        top: 18,
        zIndex: 1,
    },
    label: {
        position: 'absolute',
        left: 48,
        zIndex: 1,
        backgroundColor: 'transparent',
        paddingHorizontal: 4,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    forgotLink: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    linkText: {
        fontSize: 14,
        fontWeight: '600',
    },
    buttons: {
        gap: 16,
    },
    orRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    orLine: {
        flex: 1,
        height: 1,
        opacity: 0.4,
    },
    orText: {
        marginHorizontal: 16,
        fontSize: 13,
        fontWeight: '500',
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        marginTop: 16,
    },
});