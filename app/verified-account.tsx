// app/verified-account.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import AppText from '../src/components/AppText';
import Button from '../src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import authService from '@/src/services/auth';

const { width } = Dimensions.get('window');
const isLargeScreen = width >= 768;

export default function VerifiedAccountScreen() {
    const { colors, darkMode } = useThemeContext();

    const [verifying, setVerifying] = useState(true);
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [countdown, setCountdown] = useState(5);

    // Animations
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const checkmarkAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        checkVerification();
    }, []);

    useEffect(() => {
        if (verified) {
            // Start success animations
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(rotateAnim, {
                            toValue: 1,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(rotateAnim, {
                            toValue: 0,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                    ])
                ),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(checkmarkAnim, {
                            toValue: 1.2,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(checkmarkAnim, {
                            toValue: 1,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ])
                ),
            ]).start();

            // Success haptic
            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

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

    const checkVerification = async () => {
        try {
            // Get the session to check verification status
            const { session } = await authService.getSession();

            if (session?.user?.email_confirmed_at) {
                setVerified(true);
                setEmail(session.user.email || '');
            } else {
                // Check URL params for email (if coming from email link)
                // This is handled by the deep linking setup
                const { user } = await authService.getCurrentUser();
                if (user?.email) {
                    setEmail(user.email);
                }
                setError('Email not yet verified. Please check your inbox and click the confirmation link.');
            }
        } catch (err: any) {
            console.error('Verification check error:', err);
            setError(err.message || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const handleResendEmail = async () => {
        if (!email) {
            Alert.alert('Error', 'Email address not found');
            return;
        }

        try {
            if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }

            const response = await authService.resendConfirmationEmail(email);

            if (response.success) {
                if (Platform.OS === 'ios') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                Alert.alert(
                    'Email Sent',
                    'Confirmation email has been resent. Please check your inbox and spam folder.'
                );
            } else {
                throw new Error(response.error?.message);
            }
        } catch (err: any) {
            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            Alert.alert('Error', err.message || 'Failed to resend email');
        }
    };

    const handleContinue = () => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        router.replace('/LoginScreen');
    };

    const handleGoToLogin = () => {
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

    // Design tokens
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';

    if (verifying) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centered}>
                    <Animated.View style={{ transform: [{ rotate }] }}>
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
                    {/* Success/Failure Icon */}
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
                            colors={verified ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconCircle}
                        >
                            <Animated.View style={{ transform: [{ scale: checkmarkAnim }] }}>
                                <Ionicons
                                    name={verified ? 'checkmark' : 'close'}
                                    size={64}
                                    color="#FFFFFF"
                                />
                            </Animated.View>
                        </LinearGradient>

                        {/* Decorative rings for success */}
                        {verified && (
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
                        )}
                    </Animated.View>

                    {/* Content */}
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <AppText style={[styles.title, { color: textPrimary }]}>
                            {verified ? 'Email Verified!' : 'Verification Failed'}
                        </AppText>

                        <AppText style={[styles.message, { color: textSecondary }]}>
                            {verified
                                ? 'Your email has been successfully verified. You can now access all features of your Smart Cleaner Pro account.'
                                : error || 'We could not verify your email. Please try again or request a new confirmation link.'}
                        </AppText>

                        {email ? (
                            <View style={[styles.emailCard, {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                borderWidth: 1
                            }]}>
                                <Ionicons name="mail-outline" size={20} color={colors.primary} />
                                <AppText style={[styles.emailText, { color: textPrimary }]}>
                                    {email}
                                </AppText>
                                {verified && (
                                    <View style={[styles.verifiedBadge, { backgroundColor: '#10B98120' }]}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                        <AppText style={styles.verifiedBadgeText}>Verified</AppText>
                                    </View>
                                )}
                            </View>
                        ) : null}

                        {verified ? (
                            <>
                                <View style={styles.successInfo}>
                                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                                    <AppText style={[styles.successInfoText, { color: textSecondary }]}>
                                        Redirecting to login in {countdown} seconds...
                                    </AppText>
                                </View>

                                <View style={styles.actionButtons}>
                                    <Button
                                        title="Continue to Login"
                                        onPress={handleContinue}
                                        fullWidth
                                        style={styles.button}
                                    />

                                    <TouchableOpacity
                                        style={styles.resendLink}
                                        onPress={handleResendEmail}
                                    >
                                        <AppText style={[styles.resendLinkText, { color: colors.primary }]}>
                                            Didn't receive the email? Resend
                                        </AppText>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <View style={styles.actionButtons}>
                                <Button
                                    title="Resend Verification Email"
                                    onPress={handleResendEmail}
                                    fullWidth
                                    style={styles.button}
                                />

                                <Button
                                    title="Back to Login"
                                    variant="outline"
                                    onPress={handleGoToLogin}
                                    fullWidth
                                    style={styles.buttonOutline}
                                />

                                <TouchableOpacity
                                    style={styles.helpLink}
                                    onPress={() => {
                                        Alert.alert(
                                            'Need Help?',
                                            'Make sure to check your spam folder. If you still don\'t see the email, you can request a new one above.'
                                        );
                                    }}
                                >
                                    <Ionicons name="help-circle-outline" size={16} color={textSecondary} />
                                    <AppText style={[styles.helpLinkText, { color: textSecondary }]}>
                                        Need help?
                                    </AppText>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animated.View>

                    {/* Tips Section for Unverified Users */}
                    {!verified && (
                        <View style={[styles.tipsCard, {
                            backgroundColor: cardBg,
                            borderColor: cardBorder,
                            borderWidth: 1
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
                                    Use the "Resend" button to get a new email
                                </AppText>
                            </View>
                        </View>
                    )}
                </View>

                {/* Footer */}
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
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 2,
        opacity: 0.3,
    },
    ring2: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 1,
        opacity: 0.1,
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
        paddingHorizontal: 20,
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
        fontSize: 16,
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
        marginBottom: 8,
    },
    buttonOutline: {
        marginTop: 4,
    },
    resendLink: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    resendLinkText: {
        fontSize: 15,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    helpLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
        paddingVertical: 8,
    },
    helpLinkText: {
        fontSize: 14,
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
        alignItems: 'center',
        gap: 12,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});