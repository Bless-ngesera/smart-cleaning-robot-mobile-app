// app/verify-email.tsx
// Handles smartcleanerpro://verify-email?token={token_hash} deep links.
// Auto-calls supabase.auth.verifyOtp on mount; shows success/error UI.
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import AppText from '../src/components/AppText';
import Button from '../src/components/Button';
import Loader from '../src/components/Loader';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

type VerifyStatus = 'verifying' | 'success' | 'error';

export default function VerifyEmailScreen() {
    const params = useLocalSearchParams();
    // token may arrive as string or string[] depending on the URL
    const rawToken = params.token;
    const tokenStr = Array.isArray(rawToken) ? (rawToken[0] ?? '') : (rawToken ?? '');

    const { colors, darkMode } = useThemeContext();

    const [status, setStatus] = useState<VerifyStatus>('verifying');
    const [errorMsg, setErrorMsg] = useState('');
    const [verifiedEmail, setVerifiedEmail] = useState('');
    const [countdown, setCountdown] = useState(3);

    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Kick off verification as soon as token is available
    useEffect(() => {
        if (!tokenStr) {
            console.error('[VerifyEmail] No token found in URL params');
            setErrorMsg('No verification token provided. Please use the link from your email.');
            setStatus('error');
            return;
        }
        verifyToken(tokenStr);
    }, [tokenStr]);

    // Animate icon in once status is resolved
    useEffect(() => {
        if (status === 'verifying') return;
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();
        if (Platform.OS === 'ios') {
            Haptics.notificationAsync(
                status === 'success'
                    ? Haptics.NotificationFeedbackType.Success
                    : Haptics.NotificationFeedbackType.Error
            );
        }
    }, [status]);

    // Auto-redirect to dashboard after success
    useEffect(() => {
        if (status !== 'success') return;
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (mountedRef.current) router.replace('/(tabs)/01_DashboardScreen');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [status]);

    const verifyToken = async (tokenHash: string) => {
        const ts = new Date().toISOString();
        console.log(`[VerifyEmail] Attempting OTP verification at ${ts}, token: ${tokenHash.substring(0, 12)}...`);

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: 'email',
            });

            if (error || !data?.session) {
                const msg = error?.message ?? 'Verification failed';
                console.error(`[VerifyEmail] OTP verification failed at ${new Date().toISOString()}:`, msg);

                const isExpiredOrInvalid =
                    msg.toLowerCase().includes('expired') ||
                    msg.toLowerCase().includes('invalid') ||
                    msg.toLowerCase().includes('otp');

                if (!mountedRef.current) return;
                setErrorMsg(
                    isExpiredOrInvalid
                        ? 'This verification link has expired or has already been used. Please request a new one.'
                        : msg
                );
                setStatus('error');
                return;
            }

            const email = data.session.user.email ?? '';
            console.log(`[VerifyEmail] Verification successful for ${email} at ${new Date().toISOString()}`);
            if (!mountedRef.current) return;
            setVerifiedEmail(email);
            setStatus('success');
        } catch (err: any) {
            console.error('[VerifyEmail] Unexpected error:', err?.message);
            if (!mountedRef.current) return;
            setErrorMsg(err?.message ?? 'An unexpected error occurred. Please try again.');
            setStatus('error');
        }
    };

    const handleRetry = () => {
        if (!tokenStr) {
            router.replace('/LoginScreen');
            return;
        }
        console.log('[VerifyEmail] Retrying verification...');
        setStatus('verifying');
        setErrorMsg('');
        verifyToken(tokenStr);
    };

    if (status === 'verifying') {
        return <Loader message="Verifying your email..." />;
    }

    const textPrimary   = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const cardBg        = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder    = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

    const isSuccess   = status === 'success';
    const iconName    = isSuccess ? 'checkmark-circle' : 'alert-circle';
    const iconColor   = isSuccess ? '#10B981' : '#EF4444';
    const iconBg      = isSuccess ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.centered}>
                {/* Icon */}
                <Animated.View style={[
                    styles.iconContainer,
                    { transform: [{ scale: scaleAnim }], opacity: fadeAnim },
                ]}>
                    <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                        <Ionicons name={iconName} size={72} color={iconColor} />
                    </View>
                    {isSuccess && (
                        <>
                            <Animated.View style={[styles.ring1, { borderColor: colors.primary, opacity: fadeAnim }]} />
                            <Animated.View style={[styles.ring2, { borderColor: colors.primary, opacity: fadeAnim }]} />
                        </>
                    )}
                </Animated.View>

                {/* Content card */}
                <Animated.View style={[
                    styles.card,
                    {
                        backgroundColor: cardBg,
                        borderColor: cardBorder,
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}>
                    <AppText style={[styles.title, { color: textPrimary }]}>
                        {isSuccess ? 'Email Verified!' : 'Verification Failed'}
                    </AppText>

                    <AppText style={[styles.message, { color: textSecondary }]}>
                        {isSuccess
                            ? 'Your email address has been successfully verified. You can now access all features of your Smart Cleaner Pro account.'
                            : errorMsg}
                    </AppText>

                    {/* Verified email chip */}
                    {isSuccess && verifiedEmail ? (
                        <View style={[styles.emailChip, {
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                            borderColor: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                        }]}>
                            <Ionicons name="mail-outline" size={16} color={colors.primary} />
                            <AppText style={[styles.emailText, { color: colors.primary }]} numberOfLines={1}>
                                {verifiedEmail}
                            </AppText>
                            <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                <AppText style={styles.verifiedBadgeText}>Verified</AppText>
                            </View>
                        </View>
                    ) : null}

                    {/* Countdown */}
                    {isSuccess ? (
                        <View style={styles.countdownRow}>
                            <Ionicons name="time-outline" size={18} color={colors.primary} />
                            <AppText style={[styles.countdown, { color: colors.primary }]}>
                                Redirecting to dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...
                            </AppText>
                        </View>
                    ) : null}

                    {/* Actions */}
                    {isSuccess ? (
                        <Button
                            title="Go to Dashboard"
                            icon="home-outline"
                            onPress={() => {
                                console.log('[VerifyEmail] User tapped Go to Dashboard');
                                router.replace('/(tabs)/01_DashboardScreen');
                            }}
                            variant="primary"
                            fullWidth
                            style={styles.button}
                        />
                    ) : (
                        <View style={styles.actions}>
                            <Button
                                title="Try Again"
                                icon="refresh-outline"
                                onPress={handleRetry}
                                variant="primary"
                                fullWidth
                                style={styles.button}
                            />
                            <Button
                                title="Back to Login"
                                icon="arrow-back-outline"
                                onPress={() => {
                                    console.log('[VerifyEmail] User navigating back to login');
                                    router.replace('/LoginScreen');
                                }}
                                variant="outline"
                                fullWidth
                                style={styles.button}
                            />
                        </View>
                    )}
                </Animated.View>

                {/* Error tips */}
                {!isSuccess ? (
                    <View style={[styles.tipsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.tipsHeader}>
                            <Ionicons name="bulb-outline" size={18} color="#F59E0B" />
                            <AppText style={[styles.tipsTitle, { color: textPrimary }]}>
                                What can I do?
                            </AppText>
                        </View>
                        {[
                            'Check the link from your email is complete and not truncated',
                            'Email confirmation links expire after 24 hours',
                            'If the link was already used, request a new confirmation email',
                        ].map((tip) => (
                            <View key={tip} style={styles.tipRow}>
                                <Ionicons name="arrow-forward-circle-outline" size={16} color={textSecondary} />
                                <AppText style={[styles.tipText, { color: textSecondary }]}>{tip}</AppText>
                            </View>
                        ))}
                    </View>
                ) : null}

                <TouchableOpacity
                    style={styles.loginLink}
                    onPress={() => router.replace('/LoginScreen')}
                >
                    <AppText style={[styles.loginLinkText, { color: textSecondary }]}>
                        Go to Login
                    </AppText>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
    },

    iconContainer: {
        alignItems: 'center',
        marginBottom: 28,
        position: 'relative',
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    ring1: {
        position: 'absolute',
        width: 144,
        height: 144,
        borderRadius: 72,
        borderWidth: 2,
        opacity: 0.3,
    },
    ring2: {
        position: 'absolute',
        width: 168,
        height: 168,
        borderRadius: 84,
        borderWidth: 1,
        opacity: 0.12,
    },

    card: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 16,
    },

    title: {
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },

    emailChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
        maxWidth: '100%',
    },
    emailText: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    verifiedBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#10B981',
    },

    countdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    countdown: {
        fontSize: 14,
        fontWeight: '600',
    },

    actions: { width: '100%', gap: 12 },
    button: { marginTop: 4 },

    tipsCard: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        gap: 10,
        marginBottom: 16,
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    tipsTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },

    loginLink: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    loginLinkText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
