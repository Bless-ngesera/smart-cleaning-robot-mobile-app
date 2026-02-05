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
    const { colors } = useThemeContext();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Floating label animations
    const emailAnim = useRef(new Animated.Value(0)).current;
    const passAnim = useRef(new Animated.Value(0)).current;

    // Ref for focus chaining
    const passwordRef = useRef<TextInput>(null);

    // Auto-redirect if already logged in + listen for auth changes
    useEffect(() => {
        // Check current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                router.replace('/(tabs)/01_DashboardScreen');
            }
        });

        // Listen for future auth changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                router.replace('/(tabs)/01_DashboardScreen');
            } else {
                // Optional: stay on login if logged out
            }
        });

        // Cleanup listener
        return () => subscription.unsubscribe();
    }, []);

    const validateForm = () => {
        let valid = true;
        setEmailError('');
        setPasswordError('');

        if (!email.trim()) {
            setEmailError('Email is required');
            valid = false;
        } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
            setEmailError('Invalid email format');
            valid = false;
        }

        if (!password.trim()) {
            setPasswordError('Password is required');
            valid = false;
        }

        return valid;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) throw error;

            // Success: Supabase auto-saves session to AsyncStorage
            // No need for manual token storage
            router.replace('/(tabs)/01_DashboardScreen');
        } catch (err: any) {
            let message = 'Invalid credentials';
            if (err.message.includes('Invalid login credentials')) {
                message = 'Incorrect email or password';
            } else if (err.message.includes('Email not confirmed')) {
                message = 'Please confirm your email before signing in';
            } else {
                message = err.message;
            }
            Alert.alert('Login Failed', message);
        } finally {
            setLoading(false);
        }
    };

    const animateLabel = (anim: Animated.Value, toValue: number) => {
        Animated.timing(anim, {
            toValue,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    if (loading) {
        return <Loader message="Signing in..." />;
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={[colors.background, colors.card]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
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

                        <View style={styles.form}>
                            {/* Email */}
                            <View style={styles.field}>
                                <Animated.Text
                                    style={[
                                        styles.label,
                                        {
                                            top: emailAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 8] }),
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
                                        { borderColor: emailError ? colors.error : colors.border, color: colors.text },
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
                                    accessibilityLabel="Email input"
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
                                            top: passAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 8] }),
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
                                        { borderColor: passwordError ? colors.error : colors.border, color: colors.text },
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
                                    accessibilityLabel="Password input"
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
                                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
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
                                activeOpacity={0.7}
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
                                    loading={loading}
                                    disabled={loading}
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
        paddingTop: 40,
        paddingBottom: 40,
        justifyContent: 'center',
    },
    form: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
        marginVertical: 32,
    },
    field: {
        marginBottom: 24,
        position: 'relative',
    },
    input: {
        height: 56,
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 48,
        fontSize: 16,
        backgroundColor: 'transparent',
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
        padding: 8,
    },
    label: {
        position: 'absolute',
        left: 48,
        zIndex: 1,
        backgroundColor: 'transparent',
        paddingHorizontal: 4,
        pointerEvents: 'none',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
    forgotLink: {
        alignSelf: 'flex-end',
        marginBottom: 32,
        paddingVertical: 8,
    },
    linkText: {
        fontSize: 15,
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
        opacity: 0.3,
    },
    orText: {
        marginHorizontal: 16,
        fontSize: 13,
        fontWeight: '500',
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        marginTop: 32,
        opacity: 0.7,
    },
});