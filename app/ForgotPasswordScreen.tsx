// app/ForgotPasswordScreen.tsx
import React, { useState, useRef } from 'react';
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

export default function ForgotPasswordScreen() {
    const { colors, darkMode } = useThemeContext();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [emailError, setEmailError] = useState('');

    const emailShake = useRef(new Animated.Value(0)).current;
    const emailRef = useRef<TextInput>(null);

    const shakeField = () => {
        Animated.sequence([
            Animated.timing(emailShake, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(emailShake, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(emailShake, { toValue: 4, duration: 50, useNativeDriver: true }),
            Animated.timing(emailShake, { toValue: -4, duration: 50, useNativeDriver: true }),
            Animated.timing(emailShake, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const validateAndReset = async () => {
        setEmailError('');

        if (!email.trim()) {
            setEmailError('Email is required');
            shakeField();
            return;
        }

        if (!/\S+@\S+\.\S+/.test(email.trim())) {
            setEmailError('Enter a valid email address');
            shakeField();
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: 'yourapp://reset-password', // ← change this to your actual deep link scheme if you have one
            });

            if (error) throw error;

            setSent(true);
            Alert.alert(
                'Reset Link Sent',
                'Check your email (including spam/junk) for the password reset link.'
            );
        } catch (err: any) {
            let message = 'Failed to send reset link. Please try again.';
            if (err.message?.includes('rate limit')) {
                message = 'Too many requests — please wait a few minutes';
            } else if (err.message?.includes('not found')) {
                message = 'No account found with this email';
                setEmailError('Email not found');
                shakeField();
            }
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Loader message="Sending reset link..." />;
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
                            title="Reset Password"
                            subtitle="We'll send you a link to reset your password"
                        />

                        <View style={styles.card}>
                            {sent ? (
                                <View style={styles.successContainer}>
                                    <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
                                    <AppText
                                        style={{
                                            color: darkMode ? '#ffffff' : colors.text,
                                            fontSize: 24,
                                            fontWeight: '700',
                                            textAlign: 'center',
                                            marginTop: 24,
                                            marginBottom: 12,
                                        }}
                                    >
                                        Check Your Email
                                    </AppText>
                                    <AppText
                                        style={{
                                            color: darkMode ? 'rgba(255,255,255,0.8)' : colors.textSecondary,
                                            textAlign: 'center',
                                            fontSize: 16,
                                            lineHeight: 24,
                                        }}
                                    >
                                        We sent a password reset link to{'\n'}
                                        <AppText style={{ color: colors.primary, fontWeight: '600' }}>{email}</AppText>
                                    </AppText>
                                    <AppText
                                        style={{
                                            color: darkMode ? 'rgba(255,255,255,0.6)' : colors.textSecondary,
                                            textAlign: 'center',
                                            fontSize: 14,
                                            marginTop: 12,
                                        }}
                                    >
                                        Check your inbox and spam folder.
                                    </AppText>

                                    <Button
                                        title="Back to Login"
                                        icon="arrow-back-outline"
                                        onPress={() => router.replace('/LoginScreen')}
                                        variant="outline"
                                        fullWidth
                                        style={{ marginTop: 32 }}
                                    />
                                </View>
                            ) : (
                                <>
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
                                        autoCorrect={false}
                                        returnKeyType="done"
                                        onSubmitEditing={validateAndReset}
                                        refInput={emailRef}
                                    />

                                    <AppText
                                        style={{
                                            color: darkMode ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
                                            fontSize: 14,
                                            textAlign: 'center',
                                            marginVertical: 24,
                                            lineHeight: 20,
                                        }}
                                    >
                                        Enter the email associated with your account and we'll send you a reset link.
                                    </AppText>

                                    <Button
                                        title="Send Reset Link"
                                        icon="mail-outline"
                                        onPress={validateAndReset}
                                        variant="primary"
                                        fullWidth
                                        loading={loading}
                                        disabled={loading}
                                    />

                                    <TouchableOpacity
                                        style={styles.backLink}
                                        onPress={() => router.back()}
                                    >
                                        <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
                                        <AppText
                                            style={{
                                                color: colors.primary,
                                                fontWeight: '500',
                                                marginLeft: 8,
                                            }}
                                        >
                                            Back to Login
                                        </AppText>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        <AppText
                            style={{
                                textAlign: 'center',
                                marginTop: 32,
                                fontSize: 12,
                                color: darkMode ? '#ffffff80' : colors.textSecondary,
                                opacity: 0.7,
                            }}
                        >
                            Version 1.0.0 • Smart Cleaner Pro © 2026
                        </AppText>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── FIELD COMPONENT ─────────────────────────────────────────────────────────
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

// ─── STYLES ─────────────────────────────────────────────────────────────────────
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

    form: {
        width: '100%',
    },

    field: {
        marginBottom: 26,
    },

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

    successContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },

    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        paddingVertical: 12,
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
});