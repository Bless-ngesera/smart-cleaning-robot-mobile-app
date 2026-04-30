// app/verified-account.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Animated,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import AppText from '../src/components/AppText';
import Button from '../src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import { useToast } from '@/src/context/ToastContext';
import authService from '@/src/services/auth';
import { onAuthStateChange } from '@/src/services/supabase';

const RESEND_COOLDOWN_SEC = 60;

export default function VerifiedAccountScreen() {
    const { colors, darkMode } = useThemeContext();
    const { showToast } = useToast();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const [verifying, setVerifying] = useState(true);
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [countdown, setCountdown] = useState(5);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Animations
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const checkmarkAnim = useRef(new Animated.Value(0)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;

    // Timer refs for cleanup
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (cooldownRef.current) clearInterval(cooldownRef.current);
        };
    }, []);

    useEffect(() => {
        checkVerification();
    }, []);

    // Live listener: if the user taps the verification link while this screen is open
    useEffect(() => {
        const unsubscribe = onAuthStateChange(async (event, session) => {
            if (
                (event === 'SIGNED_IN' || event === 'USER_UPDATED') &&
                session?.user?.email_confirmed_at
            ) {
                if (mountedRef.current) {
                    setVerified(true);
                    setEmail(session.user.email || '');
                    setVerifying(false);
                    showToast('Email verified! You can now log in.', 'success', 4000);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Fade-in animation once check completes
    useEffect(() => {
        if (!verifying) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]).start();

            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(
                    verified
                        ? Haptics.NotificationFeedbackType.Success
                        : Haptics.NotificationFeedbackType.Warning
                );
            }
        }
    }, [verifying]);

    // Spin the loading icon
    useEffect(() => {
        if (verifying) {
            Animated.loop(
                Animated.timing(spinAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                })
            ).start();
        }
    }, [verifying]);

    // Pulsing animations after verification success
    useEffect(() => {
        if (verified) {
            Animated.parallel([
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(rotateAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                        Animated.timing(rotateAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
                    ])
                ),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(checkmarkAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
                        Animated.timing(checkmarkAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
                    ])
                ),
            ]).start();

            // Auto-redirect countdown
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        router.replace('/LoginScreen');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [verified]);

    // Resend cooldown countdown
    const startCooldown = useCallback(() => {
        setResendCooldown(RESEND_COOLDOWN_SEC);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    if (cooldownRef.current) {
                        clearInterval(cooldownRef.current);
                        cooldownRef.current = null;
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const checkVerification = async () => {
        try {
            const { session } = await authService.getSession();

            if (session?.user?.email_confirmed_at) {
                setVerified(true);
                setEmail(session.user.email || '');
                showToast('Email verified! You can now log in.', 'success', 4000);
            } else {
                const { user } = await authService.getCurrentUser();
                if (user?.email) setEmail(user.email);
                setError('Email not yet verified. Please check your inbox and click the confirmation link.');
            }
        } catch (err: any) {
            console.error('Verification check error:', err);
            setError(err.message || 'Verification failed');
        } finally {
            if (mountedRef.current) setVerifying(false);
        }
    };

    const handleResendEmail = useCallback(async () => {
        if (!email) {
            showToast('Email address not found. Please go back and try again.', 'error');
            return;
        }

        if (resendCooldown > 0) {
            showToast(`Please wait ${resendCooldown}s before resending.`, 'warning');
            return;
        }

        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        setResendLoading(true);

        try {
            const response = await authService.resendConfirmationEmail(email);

            if (response.success) {
                if (Platform.OS === 'ios') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                showToast('Verification email sent! Check your inbox and spam folder.', 'success', 4500);
                startCooldown();
            } else {
                throw new Error(response.error?.message);
            }
        } catch (err: any) {
            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            showToast(err.message || 'Failed to resend email. Please try again.', 'error');
        } finally {
            if (mountedRef.current) setResendLoading(false);
        }
    }, [email, resendCooldown, showToast, startCooldown]);

    const handleContinue = () => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        router.replace('/LoginScreen');
    };

    // Animation interpolations
    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });
    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Design tokens
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';

    const resendLabel = resendCooldown > 0
        ? `Resend Email (${resendCooldown}s)`
        : 'Resend Verification Email';

    if (verifying) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centered}>
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Ionicons name="sync" size={48} color={colors.primary} />
                    </Animated.View>
                    <AppText style={[styles.verifyingText, { color: textSecondary }]}>
                        Verifying your email...
                    </AppText>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.scrollContentLarge,
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                    {/* Icon */}
                    <Animated.View
                        style={[
                            styles.iconContainer,
                            {
                                transform: [{ scale: scaleAnim }],
                                opacity: fadeAnim,
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={verified ? ['#10B981', '#059669'] : ['#F59E0B', '#D97706']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconCircle}
                        >
                            <Animated.View style={{ transform: [{ scale: checkmarkAnim }] }}>
                                <Ionicons
                                    name={verified ? 'checkmark' : 'mail-unread'}
                                    size={64}
                                    color="#FFFFFF"
                                />
                            </Animated.View>
                        </LinearGradient>

                        {verified ? (
                            <>
                                <Animated.View
                                    style={[
                                        styles.ring1,
                                        {
                                            borderColor: colors.primary,
                                            opacity: fadeAnim,
                                            transform: [{ scale: scaleAnim }],
                                        }
                                    ]}
                                />
                                <Animated.View
                                    style={[
                                        styles.ring2,
                                        {
                                            borderColor: colors.primary,
                                            opacity: fadeAnim,
                                            transform: [{ scale: scaleAnim }],
                                        }
                                    ]}
                                />
                            </>
                        ) : null}
                    </Animated.View>

                    {/* Content */}
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <AppText style={[styles.title, { color: textPrimary }]}>
                            {verified ? 'Email Verified!' : 'Check Your Email'}
                        </AppText>

                        <AppText style={[styles.message, { color: textSecondary }]}>
                            {verified
                                ? 'Your email has been successfully verified. You can now access all features of your Smart Cleaner Pro account.'
                                : error || 'We sent a confirmation link to your email. Please click it to verify your account.'}
                        </AppText>

                        {email ? (
                            <View style={[styles.emailCard, {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                borderWidth: 1,
                            }]}>
                                <Ionicons name="mail-outline" size={20} color={colors.primary} />
                                <AppText style={[styles.emailText, { color: textPrimary }]}>
                                    {email}
                                </AppText>
                                {verified ? (
                                    <View style={[styles.verifiedBadge, { backgroundColor: '#10B98120' }]}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                        <AppText style={styles.verifiedBadgeText}>Verified</AppText>
                                    </View>
                                ) : null}
                            </View>
                        ) : null}

                        {verified ? (
                            <>
                                <View style={styles.successInfo}>
                                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                                    <AppText style={[styles.successInfoText, { color: textSecondary }]}>
                                        Redirecting to login in {countdown} second{countdown !== 1 ? 's' : ''}...
                                    </AppText>
                                </View>

                                <View style={styles.actionButtons}>
                                    <Button
                                        title="Continue to Login"
                                        icon="log-in-outline"
                                        onPress={handleContinue}
                                        variant="primary"
                                        fullWidth
                                        style={styles.button}
                                    />
                                </View>
                            </>
                        ) : (
                            <View style={styles.actionButtons}>
                                <Button
                                    title={resendLabel}
                                    icon={resendCooldown > 0 ? 'time-outline' : 'mail-outline'}
                                    onPress={handleResendEmail}
                                    variant="primary"
                                    fullWidth
                                    loading={resendLoading}
                                    disabled={resendLoading || resendCooldown > 0}
                                    style={styles.button}
                                />

                                <Button
                                    title="Back to Login"
                                    icon="arrow-back-outline"
                                    variant="outline"
                                    onPress={handleContinue}
                                    fullWidth
                                    style={styles.buttonOutline}
                                />

                                {resendCooldown > 0 ? (
                                    <View style={[styles.cooldownBanner, {
                                        backgroundColor: darkMode ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.07)',
                                        borderColor: darkMode ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)',
                                    }]}>
                                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                                        <AppText style={[styles.cooldownText, { color: colors.primary }]}>
                                            You can resend the email in {resendCooldown}s
                                        </AppText>
                                    </View>
                                ) : null}
                            </View>
                        )}
                    </Animated.View>

                    {/* Tips Section — only for unverified */}
                    {!verified ? (
                        <View style={[styles.tipsCard, {
                            backgroundColor: cardBg,
                            borderColor: cardBorder,
                            borderWidth: 1,
                        }]}>
                            <View style={styles.tipsHeader}>
                                <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
                                <AppText style={[styles.tipsTitle, { color: textPrimary }]}>
                                    Quick Tips
                                </AppText>
                            </View>

                            <View style={styles.tipItem}>
                                <Ionicons name="mail-open-outline" size={16} color={textSecondary} />
                                <AppText style={[styles.tipText, { color: textSecondary }]}>
                                    Check your spam or junk folder
                                </AppText>
                            </View>

                            <View style={styles.tipItem}>
                                <Ionicons name="time-outline" size={16} color={textSecondary} />
                                <AppText style={[styles.tipText, { color: textSecondary }]}>
                                    It may take a few minutes for the email to arrive
                                </AppText>
                            </View>

                            <View style={styles.tipItem}>
                                <Ionicons name="refresh-outline" size={16} color={textSecondary} />
                                <AppText style={[styles.tipText, { color: textSecondary }]}>
                                    Use the "Resend" button to get a new email (60s cooldown applies)
                                </AppText>
                            </View>

                            <TouchableOpacity
                                style={styles.helpLink}
                                onPress={() => Alert.alert(
                                    'Need Help?',
                                    "Check your spam folder first. If you still don't see the email, tap \"Resend Verification Email\" to get a new link.\n\nMake sure you're checking the inbox for the email address shown above."
                                )}
                            >
                                <Ionicons name="help-circle-outline" size={16} color={textSecondary} />
                                <AppText style={[styles.helpLinkText, { color: textSecondary }]}>
                                    Need help?
                                </AppText>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </View>

                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 40,
    },
    scrollContentLarge: {
        alignItems: 'center',
    },
    wrapper: {
        width: '100%',
    },
    largeWrapper: {
        maxWidth: 480,
        alignSelf: 'center',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 32,
        position: 'relative',
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
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
    verifyingText: {
        fontSize: 16,
        marginTop: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
        paddingHorizontal: 16,
    },
    emailCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        marginBottom: 28,
    },
    emailText: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    verifiedBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
    },
    successInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    successInfoText: {
        fontSize: 14,
    },
    actionButtons: {
        gap: 12,
    },
    button: {
        marginBottom: 4,
    },
    buttonOutline: {
        marginTop: 4,
    },
    cooldownBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 4,
    },
    cooldownText: {
        fontSize: 13,
        fontWeight: '500',
    },
    tipsCard: {
        borderRadius: 20,
        padding: 20,
        marginTop: 28,
        gap: 12,
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    helpLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 8,
        paddingVertical: 8,
    },
    helpLinkText: {
        fontSize: 14,
    },
    footer: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});
