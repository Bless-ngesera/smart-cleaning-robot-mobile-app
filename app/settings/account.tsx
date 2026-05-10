// app/(tabs)/settings/account.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    TextInput,
    ScrollView,
    Alert,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Animated,
    Keyboard,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated_, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import Loader from '@/src/components/Loader';
import AppText from '@/src/components/AppText';
import Button from '@/src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import authService from '@/src/services/auth';
import { supabase } from '@/src/services/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useAppNavigation } from '@/hooks/useAppNavigation';

const AnimatedCard = Animated_.createAnimatedComponent(View);

// Password requirements
interface PasswordRequirement {
    id: string;
    label: string;
    validator: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
    {
        id: 'length',
        label: 'At least 6 characters',
        validator: (pwd) => pwd.length >= 6,
    },
    {
        id: 'uppercase',
        label: 'At least one uppercase letter',
        validator: (pwd) => /[A-Z]/.test(pwd),
    },
    {
        id: 'lowercase',
        label: 'At least one lowercase letter',
        validator: (pwd) => /[a-z]/.test(pwd),
    },
    {
        id: 'number',
        label: 'At least one number',
        validator: (pwd) => /[0-9]/.test(pwd),
    },
    {
        id: 'special',
        label: 'At least one special character (!@#$%^&*)',
        validator: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    },
];

export default function AccountSettings() {
    const { back } = useAppNavigation();  // Only need back() here - no push/replace needed
    const { colors, darkMode } = useThemeContext();
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    // Design tokens
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';

    // Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [deletePassword, setDeletePassword] = useState('');

    // Visibility toggles
    const [show, setShow] = useState({
        current: false,
        new: false,
        confirm: false,
        delete: false
    });

    // Focus states for password warnings
    const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);
    const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

    // Warning visibility
    const [showPasswordWarning, setShowPasswordWarning] = useState(false);
    const warningAnim = useRef(new Animated.Value(0)).current;
    const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Loading states
    const [loading, setLoading] = useState(true);
    const [savingName, setSavingName] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Error states
    const [newPasswordError, setNewPasswordError] = useState('');
    const [confirmError, setConfirmError] = useState('');

    // Animation refs for shake effects
    const newPasswordShake = useRef(new Animated.Value(0)).current;
    const confirmShake = useRef(new Animated.Value(0)).current;

    // Mounted ref for cleanup
    const mountedRef = useRef(true);

    // Password requirements status
    const getRequirementStatus = useCallback((pwd: string) => {
        return passwordRequirements.map(req => ({
            ...req,
            met: req.validator(pwd),
        }));
    }, []);

    const areAllRequirementsMet = useCallback((pwd: string) => {
        return passwordRequirements.every(req => req.validator(pwd));
    }, []);

    const requirementStatus = getRequirementStatus(newPassword);
    const allRequirementsMet = areAllRequirementsMet(newPassword);

    /* ---------------------------------------------------------- */
    /* WARNING VISIBILITY MANAGEMENT */
    /* ---------------------------------------------------------- */
    const showWarning = useCallback(() => {
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
            warningTimerRef.current = null;
        }

        setShowPasswordWarning(true);
        Animated.timing(warningAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        warningTimerRef.current = setTimeout(() => {
            if (mountedRef.current) {
                Animated.timing(warningAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    setShowPasswordWarning(false);
                });
            }
        }, 10000);
    }, [warningAnim]);

    const hideWarning = useCallback(() => {
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
            warningTimerRef.current = null;
        }

        Animated.timing(warningAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setShowPasswordWarning(false);
        });
    }, [warningAnim]);

    // Check requirements and show warning if not met
    useEffect(() => {
        if (newPassword && !allRequirementsMet && isNewPasswordFocused) {
            showWarning();
        } else if (allRequirementsMet) {
            hideWarning();
        }
    }, [newPassword, allRequirementsMet, isNewPasswordFocused, showWarning, hideWarning]);

    // Cleanup timers on unmount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (warningTimerRef.current) {
                clearTimeout(warningTimerRef.current);
            }
        };
    }, []);

    /* ---------------------------------------------------------- */
    /* SHAKE ANIMATION */
    /* ---------------------------------------------------------- */
    const shakeField = useCallback((anim: Animated.Value) => {
        Animated.sequence([
            Animated.timing(anim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 5, duration: 50, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -5, duration: 50, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    }, []);

    /* ---------------------------------------------------------- */
    /* LOAD USER DATA */
    /* ---------------------------------------------------------- */
    useEffect(() => {
        const loadUser = async () => {
            try {
                const { user: currentUser } = await authService.getCurrentUser();
                if (currentUser) {
                    setEmail(currentUser.email || 'No email');
                    setFullName(currentUser.user_metadata?.full_name || '');
                }
            } catch (err) {
                console.error('Failed to load user:', err);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    const haptic = () => {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
    };

    /* ---------------------------------------------------------- */
    /* SAVE NAME */
    /* ---------------------------------------------------------- */
    const saveName = async () => {
        if (!fullName.trim()) {
            return Alert.alert('Error', 'Full name cannot be empty');
        }
        haptic();
        setSavingName(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: fullName.trim() },
            });
            if (error) throw error;
            Alert.alert('Saved', 'Your name has been updated');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to save name');
        } finally {
            setSavingName(false);
        }
    };

    /* ---------------------------------------------------------- */
    /* UPDATE PASSWORD */
    /* ---------------------------------------------------------- */
    const validatePasswordForm = useCallback((): boolean => {
        let valid = true;
        setNewPasswordError('');
        setConfirmError('');

        if (!currentPassword) {
            Alert.alert('Error', 'Current password is required');
            valid = false;
        }

        if (!newPassword) {
            setNewPasswordError('New password is required');
            shakeField(newPasswordShake);
            valid = false;
        } else if (!allRequirementsMet) {
            setNewPasswordError('Please meet all password requirements');
            shakeField(newPasswordShake);
            showWarning();
            valid = false;
        }

        if (!confirmPassword) {
            setConfirmError('Please confirm your new password');
            shakeField(confirmShake);
            valid = false;
        } else if (confirmPassword !== newPassword) {
            setConfirmError('Passwords do not match');
            shakeField(confirmShake);
            valid = false;
        }

        return valid;
    }, [currentPassword, newPassword, confirmPassword, allRequirementsMet, showWarning, shakeField, newPasswordShake, confirmShake]);

    const updatePassword = async () => {
        haptic();

        if (!validatePasswordForm()) return;

        setSavingPassword(true);
        Keyboard.dismiss();

        try {
            // Verify current password first
            const signInResponse = await authService.signIn(email, currentPassword);

            if (!signInResponse.success) {
                throw new Error('Current password is incorrect');
            }

            // Update password
            const response = await authService.resetPassword(newPassword);

            if (!response.success) {
                throw new Error(response.error?.message);
            }

            Alert.alert(
                'Success',
                'Password updated successfully. Please use your new password next time you log in.'
            );

            // Clear form
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setNewPasswordError('');
            setConfirmError('');
            hideWarning();

        } catch (e: any) {
            console.error('Password update error:', e);

            if (e.message?.includes('same as the old password')) {
                Alert.alert('Error', 'New password must be different from your current password.');
            } else if (e.message?.includes('incorrect')) {
                Alert.alert('Error', 'Current password is incorrect.');
            } else if (e.message?.includes('weak')) {
                setNewPasswordError('Password is too weak');
                shakeField(newPasswordShake);
                showWarning();
                Alert.alert('Weak Password', 'Please choose a stronger password.');
            } else {
                Alert.alert('Error', e.message || 'Failed to update password');
            }
        } finally {
            setSavingPassword(false);
        }
    };

    /* ---------------------------------------------------------- */
    /* DELETE ACCOUNT */
    /* ---------------------------------------------------------- */
    const deleteAccount = async () => {
        if (!deletePassword) {
            return Alert.alert('Error', 'Please enter your password to confirm');
        }

        Alert.alert(
            'Delete Account',
            'This action is permanent and cannot be undone. All your data will be permanently removed.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        haptic();

                        try {
                            // Verify password first
                            const signInResponse = await authService.signIn(email, deletePassword);

                            if (!signInResponse.success) {
                                throw new Error('Password is incorrect');
                            }

                            Alert.alert(
                                'Account Deletion',
                                'For security reasons, account deletion must be handled by support. Please contact us at support@smartcleaner.com to delete your account.',
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => setDeletePassword('')
                                    }
                                ]
                            );

                        } catch (e: any) {
                            Alert.alert('Error', e.message || 'Failed to verify password');
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return <Loader message="Loading account..." />;
    }

    /* ---------------------------------------------------------- */
    /* RENDER */
    /* ---------------------------------------------------------- */
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
                    {/* Back Navigation - Uses back() from hook */}
                    <TouchableOpacity style={styles.backButton} onPress={() => back()}>
                        <Ionicons name="chevron-back" size={28} color={colors.primary} />
                    </TouchableOpacity>

                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Account Settings
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Personal info & security
                        </AppText>
                    </View>

                    {/* Personal Information Card */}
                    <AnimatedCard entering={FadeInDown.duration(350).springify()}
                                  style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                Personal Information
                            </AppText>
                        </View>

                        <View style={styles.field}>
                            <AppText style={[styles.label, { color: textSecondary }]}>Full Name</AppText>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    value={fullName}
                                    onChangeText={setFullName}
                                    style={[styles.input, { color: textPrimary, borderColor: cardBorder }]}
                                    placeholder="Full name"
                                    placeholderTextColor={textSecondary + '80'}
                                    allowFontScaling={false}
                                />
                            </View>
                        </View>

                        <View style={styles.field}>
                            <AppText style={[styles.label, { color: textSecondary }]}>Email</AppText>
                            <View style={[styles.inputWrapper, styles.readOnly]}>
                                <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <AppText style={{ color: textSecondary }}>{email}</AppText>
                            </View>
                        </View>

                        <Button
                            title="Save Changes"
                            loading={savingName}
                            onPress={saveName}
                            fullWidth
                        />
                    </AnimatedCard>

                    {/* Security Card */}
                    <AnimatedCard entering={FadeInDown.delay(80).duration(350).springify()}
                                  style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                Change Password
                            </AppText>
                        </View>

                        {/* Current Password */}
                        <View style={styles.field}>
                            <AppText style={[styles.label, { color: textSecondary }]}>Current Password</AppText>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    secureTextEntry={!show.current}
                                    style={[styles.input, { color: textPrimary, borderColor: cardBorder }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={textSecondary + '80'}
                                    allowFontScaling={false}
                                />
                                <TouchableOpacity onPress={() => setShow({ ...show, current: !show.current })} style={styles.eye}>
                                    <Ionicons name={show.current ? 'eye-off-outline' : 'eye-outline'} size={20} color={textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* New Password */}
                        <View style={styles.field}>
                            <AppText style={[styles.label, { color: textSecondary }]}>New Password</AppText>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!show.new}
                                    style={[
                                        styles.input,
                                        {
                                            color: textPrimary,
                                            borderColor: newPasswordError ? '#ef4444' : cardBorder
                                        }
                                    ]}
                                    placeholder="••••••••"
                                    placeholderTextColor={textSecondary + '80'}
                                    allowFontScaling={false}
                                    onFocus={() => setIsNewPasswordFocused(true)}
                                    onBlur={() => setIsNewPasswordFocused(false)}
                                />
                                <TouchableOpacity onPress={() => setShow({ ...show, new: !show.new })} style={styles.eye}>
                                    <Ionicons name={show.new ? 'eye-off-outline' : 'eye-outline'} size={20} color={textSecondary} />
                                </TouchableOpacity>
                            </View>
                            {newPasswordError ? (
                                <AppText style={styles.fieldError}>{newPasswordError}</AppText>
                            ) : null}
                        </View>

                        {/* Password Requirements Warning */}
                        {showPasswordWarning && !allRequirementsMet && (
                            <Animated.View
                                style={[
                                    styles.warningContainer,
                                    {
                                        opacity: warningAnim,
                                        transform: [{
                                            translateY: warningAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [-20, 0],
                                            }),
                                        }],
                                        backgroundColor: darkMode ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)',
                                        borderColor: darkMode ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.2)',
                                    },
                                ]}
                            >
                                <View style={styles.warningHeader}>
                                    <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                                    <AppText style={styles.warningTitle}>Password Requirements</AppText>
                                </View>

                                {requirementStatus.map((req) => (
                                    <View key={req.id} style={styles.warningRequirement}>
                                        <Ionicons
                                            name={req.met ? 'checkmark-circle' : 'close-circle'}
                                            size={16}
                                            color={req.met ? '#10B981' : '#ef4444'}
                                        />
                                        <AppText
                                            style={[
                                                styles.warningText,
                                                {
                                                    color: req.met
                                                        ? '#10B981'
                                                        : (darkMode ? '#ef4444' : '#dc2626'),
                                                    textDecorationLine: req.met ? 'line-through' : 'none',
                                                },
                                            ]}
                                        >
                                            {req.label}
                                        </AppText>
                                    </View>
                                ))}

                                <View style={styles.warningFooter}>
                                    <Ionicons name="time-outline" size={14} color={textSecondary} />
                                    <AppText style={[styles.warningTimeout, { color: textSecondary }]}>
                                        This message will disappear in 10 seconds
                                    </AppText>
                                </View>
                            </Animated.View>
                        )}

                        {/* Confirm New Password */}
                        <View style={styles.field}>
                            <AppText style={[styles.label, { color: textSecondary }]}>Confirm New Password</AppText>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!show.confirm}
                                    style={[
                                        styles.input,
                                        {
                                            color: textPrimary,
                                            borderColor: confirmError ? '#ef4444' : cardBorder
                                        }
                                    ]}
                                    placeholder="••••••••"
                                    placeholderTextColor={textSecondary + '80'}
                                    allowFontScaling={false}
                                    onFocus={() => setIsConfirmPasswordFocused(true)}
                                    onBlur={() => setIsConfirmPasswordFocused(false)}
                                />
                                <TouchableOpacity onPress={() => setShow({ ...show, confirm: !show.confirm })} style={styles.eye}>
                                    <Ionicons name={show.confirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={textSecondary} />
                                </TouchableOpacity>
                            </View>
                            {confirmError ? (
                                <AppText style={styles.fieldError}>{confirmError}</AppText>
                            ) : null}
                        </View>

                        {/* Password Match Indicator */}
                        {confirmPassword.length > 0 && (
                            <View style={styles.matchIndicator}>
                                <Ionicons
                                    name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                                    size={16}
                                    color={newPassword === confirmPassword ? '#10B981' : '#ef4444'}
                                />
                                <AppText
                                    style={[
                                        styles.matchText,
                                        { color: newPassword === confirmPassword ? '#10B981' : '#ef4444' },
                                    ]}
                                >
                                    {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                                </AppText>
                            </View>
                        )}

                        <Button
                            title="Update Password"
                            loading={savingPassword}
                            onPress={updatePassword}
                            fullWidth
                            disabled={!currentPassword || !newPassword || !confirmPassword}
                        />
                    </AnimatedCard>

                    {/* Danger Zone */}
                    <AnimatedCard entering={FadeInDown.delay(160).duration(350).springify()}
                                  style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: '#ff3b30' }]}>
                        <View style={styles.sectionHeader}>
                            <AppText style={[styles.sectionTitle, { color: '#ff3b30' }]}>
                                Danger Zone
                            </AppText>
                        </View>

                        <View style={styles.field}>
                            <AppText style={[styles.label, { color: textSecondary }]}>Confirm Password to Delete Account</AppText>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    value={deletePassword}
                                    onChangeText={setDeletePassword}
                                    secureTextEntry={!show.delete}
                                    style={[styles.input, { color: textPrimary, borderColor: cardBorder }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={textSecondary + '80'}
                                    allowFontScaling={false}
                                />
                                <TouchableOpacity onPress={() => setShow({ ...show, delete: !show.delete })} style={styles.eye}>
                                    <Ionicons name={show.delete ? 'eye-off-outline' : 'eye-outline'} size={20} color={textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Button
                            title="Delete Account"
                            variant="danger"
                            loading={deleting}
                            onPress={deleteAccount}
                            fullWidth
                            disabled={!deletePassword}
                        />
                    </AnimatedCard>
                </View>

                {/* Footer */}
                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ---------------------------------------------------------- */
/* STYLES */
/* ---------------------------------------------------------- */
const styles = StyleSheet.create({
    container: { flex: 1 },

    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: 16,
    },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 80,
    },
    scrollContentLarge: {
        alignItems: 'center',
    },

    wrapper: { width: '100%' },
    largeWrapper: { maxWidth: 480 },

    headerSection: {
        marginBottom: 32,
    },
    headerTitle: {
        fontSize: 35,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0.1,
    },

    sectionCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },

    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        marginBottom: 6,
    },
    inputWrapper: {
        position: 'relative',
    },
    input: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        paddingLeft: 52,
        paddingRight: 52,
        fontSize: 16,
        fontFamily: 'SF-Pro-Display-Regular',
    },
    readOnly: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        paddingHorizontal: 52,
    },
    inputIcon: {
        position: 'absolute',
        left: 16,
        top: 16,
    },
    eye: {
        position: 'absolute',
        right: 16,
        top: 16,
    },
    fieldError: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },

    warningContainer: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        marginBottom: 20,
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F59E0B',
    },
    warningRequirement: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    warningText: {
        fontSize: 13,
        flex: 1,
    },
    warningFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    warningTimeout: {
        fontSize: 11,
    },
    matchIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    matchText: {
        fontSize: 12,
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});