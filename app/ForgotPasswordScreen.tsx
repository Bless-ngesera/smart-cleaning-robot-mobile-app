// screens/ForgotPasswordScreen.tsx
import React, { useState, useRef } from 'react';
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

export default function ForgotPasswordScreen() {
    const { colors } = useThemeContext();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [emailError, setEmailError] = useState('');

    // Floating label animation
    const emailAnim = useRef(new Animated.Value(0)).current;

    // Ref for focus
    const emailRef = useRef<TextInput>(null);

    const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

    const handleReset = async () => {
        setEmailError('');

        if (!email.trim()) {
            setEmailError('Email is required');
            return;
        }
        if (!validateEmail(email.trim())) {
            setEmailError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            // C++ BRIDGE: Replace with real robot/backend password reset call
            // e.g. await RobotBridge.sendResetLink(email.trim());
            // or await supabase.auth.resetPasswordForEmail(email.trim());

            await new Promise((resolve) => setTimeout(resolve, 1400)); // mock delay

            setSent(true);
            Alert.alert('Success', 'Reset link sent! Check your email.');
        } catch (err) {
            Alert.alert('Error', 'Failed to send reset link. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const animateLabel = (toValue: number) => {
        Animated.timing(emailAnim, {
            toValue,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    if (loading) {
        return <Loader message="Sending reset link..." />;
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
                            title="Reset Password"
                            subtitle="We'll send you a link to reset your password"
                        />

                        {sent ? (
                            <View style={styles.success}>
                                <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
                                <Text style={[styles.successTitle, { color: colors.text }]}>
                                    Check your email
                                </Text>
                                <Text style={[styles.successText, { color: colors.textSecondary }]}>
                                    We sent a password reset link to{'\n'}
                                    <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                        {email}
                                    </Text>
                                </Text>

                                <Button
                                    title="Back to Login"
                                    variant="primary"
                                    onPress={() => router.push('/LoginScreen')}
                                    fullWidth
                                    size="large"
                                    style={{ marginTop: 32 }}
                                />
                            </View>
                        ) : (
                            <View style={styles.form}>
                                {/* Email Field */}
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
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        placeholder=""
                                        returnKeyType="done"
                                        onFocus={() => animateLabel(1)}
                                        onBlur={() => animateLabel(email ? 1 : 0)}
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

                                <Text style={[styles.info, { color: colors.textSecondary }]}>
                                    Enter the email associated with your account and we'll send you a reset link.
                                </Text>

                                <View style={styles.buttons}>
                                    <Button
                                        title="Send Reset Link"
                                        icon="mail-outline"
                                        onPress={handleReset}
                                        variant="primary"
                                        fullWidth
                                        size="large"
                                        loading={loading}
                                        disabled={loading}
                                    />

                                    <TouchableOpacity
                                        style={styles.backLink}
                                        onPress={() => router.back()}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
                                        <Text style={[styles.backText, { color: colors.primary }]}>
                                            Back to Login
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

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
    info: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 32,
    },
    buttons: {
        gap: 16,
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    backText: {
        fontSize: 15,
        fontWeight: '600',
    },
    success: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
        alignItems: 'center',
        marginVertical: 32,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
    },
    successText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        marginTop: 32,
        opacity: 0.7,
    },
});