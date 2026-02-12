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

export default function ForgotPasswordScreen() {
    const { colors } = useThemeContext();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [emailError, setEmailError] = useState('');

    // Shake animation ref for error feedback
    const emailShake = useRef(new Animated.Value(0)).current;

    const emailRef = useRef<TextInput>(null);

    // Subtle shake on error
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
            setEmailError('Please enter a valid email');
            shakeField();
            return;
        }

        setLoading(true);
        try {
            // === C++ BRIDGE / REAL IMPLEMENTATION POINT (Optional) ===
            // For extra security or custom email logic, handle email validation/sending natively
            // Android (JNI): await RobotBridge.sendResetEmail(email.trim())
            // iOS (Obj-C++): await [RobotBridge sendResetEmailWithEmail:email.trim()]

            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: 'yourapp://reset-password', // optional deep link for your app
            });

            if (error) throw error;

            setSent(true);
            Alert.alert(
                'Reset Link Sent',
                'Check your email (including spam/junk) for the password reset link.'
            );
        } catch (err: any) {
            let message = 'Failed to send reset link. Please try again.';
            if (err.message.includes('rate limit')) {
                message = 'Too many requests — please wait a few minutes';
            } else if (err.message.includes('not found')) {
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
                        title="Reset Password"
                        subtitle="We'll send you a link to reset your password"
                    />

                    {sent ? (
                        // Success State – wrapped properly in parentheses
                        <View style={styles.successContainer}>
                            <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
                            <AppText variant="title" className="text-center mt-6 mb-4">
                                Check Your Email
                            </AppText>
                            <AppText className="text-textSecondary text-center text-base leading-6">
                                We sent a password reset link to{'\n'}
                                <AppText className="text-primary font-medium">{email}</AppText>
                            </AppText>
                            <AppText className="text-textSecondary text-center text-sm mt-4 opacity-80">
                                Check your inbox and spam folder.
                            </AppText>

                            <Button
                                title="Back to Login"
                                icon="arrow-back-outline"
                                onPress={() => router.push('/LoginScreen')}
                                variant="outline"
                                fullWidth
                                style={{ marginTop: 32 }}
                            />
                        </View>
                    ) : (
                        <View style={styles.form}>
                            <AppText variant="title" className="text-center mb-10">
                                Reset Password
                            </AppText>

                            {/* Email Field */}
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
                                            returnKeyType="done"
                                            onSubmitEditing={validateAndReset}
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

                            {/* Info Text */}
                            <AppText className="text-textSecondary text-sm text-center mb-8 leading-6">
                                Enter the email associated with your account and we'll send you a reset link.
                            </AppText>

                            {/* Send Reset Link Button */}
                            <Button
                                title="Send Reset Link"
                                icon="mail-outline"
                                onPress={validateAndReset}
                                variant="primary"
                                fullWidth
                                loading={loading}
                                disabled={loading}
                            />

                            {/* Back to Login */}
                            <TouchableOpacity
                                style={styles.backLink}
                                onPress={() => router.back()}
                            >
                                <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
                                <AppText className="text-primary font-medium ml-2">
                                    Back to Login
                                </AppText>
                            </TouchableOpacity>
                        </View>
                    )}

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
        marginBottom: 10,
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
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32,
        paddingVertical: 12,
    },
    successContainer: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
});