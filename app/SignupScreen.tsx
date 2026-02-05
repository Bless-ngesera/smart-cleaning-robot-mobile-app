// app/SignupScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
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

    // Floating label animations
    const nameAnim = useRef(new Animated.Value(0)).current;
    const emailAnim = useRef(new Animated.Value(0)).current;
    const passAnim = useRef(new Animated.Value(0)).current;
    const confirmAnim = useRef(new Animated.Value(0)).current;

    // Refs for focus chaining
    const emailRef = useRef<TextInput>(null);
    const passRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);

    // Auto-redirect if already logged in + listen for auth changes
    useEffect(() => {
        // Check current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                router.replace('/(tabs)/01_DashboardScreen');
            }
        });

        // Listen for auth state changes (login/signup confirmation)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                router.replace('/(tabs)/01_DashboardScreen');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

    const getPasswordStrength = () => {
        if (password.length < 6) return { strength: 'Weak', color: '#ef4444', width: '33%' };
        if (password.length < 10) return { strength: 'Medium', color: '#f59e0b', width: '66%' };
        return { strength: 'Strong', color: '#10b981', width: '100%' };
    };

    const { strength, color, width } = getPasswordStrength();

    const validateForm = () => {
        let valid = true;

        setNameError('');
        setEmailError('');
        setPasswordError('');
        setConfirmError('');

        if (!name.trim()) {
            setNameError('Name is required');
            valid = false;
        } else if (name.trim().length < 2) {
            setNameError('Name must be at least 2 characters');
            valid = false;
        }

        if (!email.trim()) {
            setEmailError('Email is required');
            valid = false;
        } else if (!validateEmail(email.trim())) {
            setEmailError('Invalid email format');
            valid = false;
        }

        if (!password) {
            setPasswordError('Password is required');
            valid = false;
        } else if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            valid = false;
        }

        if (!confirmPassword) {
            setConfirmError('Please confirm your password');
            valid = false;
        } else if (confirmPassword !== password) {
            setConfirmError('Passwords do not match');
            valid = false;
        }

        return valid;
    };

    const handleSignup = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        full_name: name.trim(), // optional metadata
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
            let message = 'Something went wrong';
            if (err.message.includes('User already registered')) {
                message = 'This email is already registered';
            } else if (err.message.includes('Password should be at least')) {
                message = 'Password is too weak';
            } else {
                message = err.message;
            }
            Alert.alert('Signup Failed', message);
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
        return <Loader message="Creating your account..." />;
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
                            title="Create Account"
                            subtitle="Join Smart Cleaner Pro today"
                        />

                        <View style={styles.form}>
                            {/* Full Name */}
                            <View style={styles.field}>
                                <Animated.Text
                                    style={[
                                        styles.label,
                                        {
                                            top: nameAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 8] }),
                                            fontSize: nameAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                                            color: nameAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [colors.textSecondary, colors.primary],
                                            }),
                                        },
                                    ]}
                                >
                                    Full Name
                                </Animated.Text>

                                <TextInput
                                    style={[
                                        styles.input,
                                        { borderColor: nameError ? colors.error : colors.border, color: colors.text },
                                    ]}
                                    value={name}
                                    onChangeText={(text) => {
                                        setName(text);
                                        animateLabel(nameAnim, text.length > 0 ? 1 : 0);
                                    }}
                                    autoCapitalize="words"
                                    placeholder=""
                                    returnKeyType="next"
                                    onSubmitEditing={() => emailRef.current?.focus()}
                                    onFocus={() => animateLabel(nameAnim, 1)}
                                    onBlur={() => animateLabel(nameAnim, name ? 1 : 0)}
                                    accessibilityLabel="Full name input"
                                />

                                <Ionicons
                                    name="person-outline"
                                    size={20}
                                    color={colors.primary}
                                    style={styles.inputIcon}
                                />

                                {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                            </View>

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
                                    ref={emailRef}
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
                                    onSubmitEditing={() => passRef.current?.focus()}
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
                                    ref={passRef}
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
                                    returnKeyType="next"
                                    onSubmitEditing={() => confirmRef.current?.focus()}
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

                                {password.length > 0 && (
                                    <View style={styles.strengthBarContainer}>
                                        <View style={[styles.strengthBar, { backgroundColor: color, width }]} />
                                        <Text style={[styles.strengthText, { color }]}>{strength}</Text>
                                    </View>
                                )}

                                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                            </View>

                            {/* Confirm Password */}
                            <View style={styles.field}>
                                <Animated.Text
                                    style={[
                                        styles.label,
                                        {
                                            top: confirmAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 8] }),
                                            fontSize: confirmAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                                            color: confirmAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [colors.textSecondary, colors.primary],
                                            }),
                                        },
                                    ]}
                                >
                                    Confirm Password
                                </Animated.Text>

                                <TextInput
                                    ref={confirmRef}
                                    style={[
                                        styles.input,
                                        { borderColor: confirmError ? colors.error : colors.border, color: colors.text },
                                    ]}
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        animateLabel(confirmAnim, text.length > 0 ? 1 : 0);
                                    }}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                    placeholder=""
                                    returnKeyType="done"
                                    onFocus={() => animateLabel(confirmAnim, 1)}
                                    onBlur={() => animateLabel(confirmAnim, confirmPassword ? 1 : 0)}
                                    accessibilityLabel="Confirm password input"
                                />

                                <Ionicons
                                    name="lock-closed-outline"
                                    size={20}
                                    color={colors.primary}
                                    style={styles.inputIcon}
                                />

                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                        size={20}
                                        color={colors.textSecondary}
                                    />
                                </TouchableOpacity>

                                {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
                            </View>

                            {/* Terms */}
                            <Text style={[styles.terms, { color: colors.textSecondary }]}>
                                By creating an account, you agree to our{' '}
                                <Text style={{ color: colors.primary }}>Terms of Service</Text> and{' '}
                                <Text style={{ color: colors.primary }}>Privacy Policy</Text>
                            </Text>

                            {/* Buttons */}
                            <View style={styles.buttons}>
                                <Button
                                    title="Create Account"
                                    icon="person-add-outline"
                                    onPress={handleSignup}
                                    variant="primary"
                                    fullWidth
                                    size="large"
                                    loading={loading}
                                    disabled={loading}
                                />

                                {/* Social Signup (placeholders – connect real SDKs later) */}
                                <View style={styles.socialContainer}>
                                    <TouchableOpacity
                                        style={[styles.socialButton, { backgroundColor: '#4285F4' }]}
                                        onPress={() => Alert.alert('Coming Soon', 'Google signup will be available soon.')}
                                    >
                                        <Ionicons name="logo-google" size={20} color="#fff" />
                                        <Text style={styles.socialButtonText}>Sign up with Google</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.socialButton, { backgroundColor: '#000' }]}
                                        onPress={() => Alert.alert('Coming Soon', 'Apple signup will be available soon.')}
                                    >
                                        <Ionicons name="logo-apple" size={20} color="#fff" />
                                        <Text style={styles.socialButtonText}>Sign up with Apple</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Back to Login */}
                                <TouchableOpacity
                                    style={styles.backLink}
                                    onPress={() => router.push('/LoginScreen')}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
                                    <Text style={[styles.backLinkText, { color: colors.primary }]}>
                                        Already have an account? Sign in
                                    </Text>
                                </TouchableOpacity>
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
    terms: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 8,
        marginBottom: 32,
        textAlign: 'center',
    },
    buttons: {
        gap: 16,
    },
    socialContainer: {
        gap: 12,
        marginTop: 12,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 10,
    },
    socialButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        marginTop: 8,
    },
    backLinkText: {
        fontSize: 15,
        fontWeight: '600',
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        marginTop: 32,
        opacity: 0.7,
    },
});