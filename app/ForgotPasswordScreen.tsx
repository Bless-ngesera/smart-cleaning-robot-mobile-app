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
            Animated.timing(emailShake, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(emailShake, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(emailShake, { toValue: 5, duration: 50, useNativeDriver: true }),
            Animated.timing(emailShake, { toValue: -5, duration: 50, useNativeDriver: true }),
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
                redirectTo: 'yourapp://reset-password', // ← update to your actual deep link
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
                                            fontSize: 22,
                                            fontWeight: '700',
                                            textAlign: 'center',
                                            marginTop: 20,
                                            marginBottom: 12,
                                        }}
                                    >
                                        Check Your Email
                                    </AppText>
                                    <AppText
                                        style={{
                                            color: darkMode ? 'rgba(255,255,255,0.85)' : colors.textSecondary,
                                            textAlign: 'center',
                                            fontSize: 15.5,
                                            lineHeight: 22,
                                        }}
                                    >
                                        We sent a password reset link to{'\n'}
                                        <AppText style={{ color: colors.primary, fontWeight: '600' }}>
                                            {email}
                                        </AppText>
                                    </AppText>
                                    <AppText
                                        style={{
                                            color: darkMode ? 'rgba(255,255,255,0.65)' : colors.textSecondary,
                                            textAlign: 'center',
                                            fontSize: 13.5,
                                            marginTop: 12,
                                        }}
                                    >
                                        Check inbox & spam folder. Link expires in 24 hours.
                                    </AppText>

                                    <Button
                                        title="Back to Login"
                                        icon="arrow-back-outline"
                                        onPress={() => router.replace('/LoginScreen')}
                                        variant="outline"
                                        fullWidth
                                        style={{ marginTop: 28 }}
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
                                        style={[
                                            styles.infoText,
                                            {
                                                color: darkMode ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.70)',
                                            },
                                        ]}
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
                                        style={{ marginTop: 16 }}
                                    />

                                    <TouchableOpacity
                                        style={styles.backLink}
                                        onPress={() => router.back()}
                                    >
                                        <Ionicons name="arrow-back-outline" size={20} color={colors.primary} />
                                        <AppText
                                            style={[
                                                styles.backLinkText,
                                                { color: colors.primary },
                                            ]}
                                        >
                                            Back to Login
                                        </AppText>
                                    </TouchableOpacity>
                                </>
                            )}
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
        left: 14,                // adjusted
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

    infoText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginVertical: 20,      // reduced from 28
    },

    successContainer: {
        alignItems: 'center',
        paddingVertical: 16,     // reduced
    },

    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,           // reduced from 28
        paddingVertical: 10,
    },

    backLinkText: {
        fontSize: 16,
        fontWeight: '600',
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,           // reduced from 40
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});