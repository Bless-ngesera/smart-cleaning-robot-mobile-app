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
    StatusBar,
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

// Toast Message Interface
interface ToastMessage {
    id: string;
    text: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

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

// Design tokens
const successColor = '#10B981';
const errorColor = '#EF4444';
const warningColor = '#F59E0B';
const infoColor = '#3B82F6';

export default function AccountSettings() {
    const { back } = useAppNavigation();
    const { colors, darkMode } = useThemeContext();
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    // Design tokens
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : '#1a1a2e';
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
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const toastAnimations = useRef<{ [key: string]: Animated.Value }>({});

    // Animation refs for shake effects
    const newPasswordShake = useRef(new Animated.Value(0)).current;
    const confirmShake = useRef(new Animated.Value(0)).current;

    // Mounted ref for cleanup
    const mountedRef = useRef(true);

    // Show toast message
    const showToast = useCallback((text: string, type: ToastMessage['type']) => {
        const id = Date.now().toString();
        const fadeAnim = new Animated.Value(0);
        const slideAnim = new Animated.Value(-100);
        
        toastAnimations.current[id] = fadeAnim;
        
        setToasts(prev => [...prev, { id, text, type }]);
        
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
        ]).start();
        
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
            ]).start(() => {
                setToasts(prev => prev.filter(toast => toast.id !== id));
                delete toastAnimations.current[id];
            });
        }, 5000);
    }, []);

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
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                if (currentUser) {
                    setEmail(currentUser.email || 'No email');
                    setFullName(currentUser.user_metadata?.full_name || '');
                }
            } catch (err) {
                console.error('Failed to load user:', err);
                showToast('Failed to load user data', 'error');
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, [showToast]);

    const haptic = () => {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
    };

    /* ---------------------------------------------------------- */
    /* SAVE NAME */
    /* ---------------------------------------------------------- */
    const saveName = async () => {
        if (!fullName.trim()) {
            showToast('Full name cannot be empty', 'warning');
            return;
        }
        haptic();
        setSavingName(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: fullName.trim() },
            });
            if (error) throw error;
            showToast('Name updated successfully', 'success');
        } catch (e: any) {
            console.error('Name update error:', e);
            showToast(e.message || 'Failed to save name', 'error');
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
            showToast('Current password is required', 'warning');
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
    }, [currentPassword, newPassword, confirmPassword, allRequirementsMet, showWarning, shakeField, newPasswordShake, confirmShake, showToast]);

    const updatePassword = async () => {
        haptic();

        if (!validatePasswordForm()) return;

        setSavingPassword(true);
        Keyboard.dismiss();

        try {
            // Verify current password first
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email,
                password: currentPassword,
            });

            if (signInError) {
                if (signInError.message.includes('Invalid login credentials')) {
                    showToast('Current password is incorrect', 'error');
                } else {
                    showToast(signInError.message, 'error');
                }
                return;
            }

            // Update password
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            showToast('Password updated successfully! Please use your new password next login.', 'success');

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
                showToast('New password must be different from your current password', 'warning');
            } else if (e.message?.includes('weak')) {
                setNewPasswordError('Password is too weak');
                shakeField(newPasswordShake);
                showWarning();
                showToast('Please choose a stronger password', 'warning');
            } else {
                showToast(e.message || 'Failed to update password', 'error');
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
            showToast('Please enter your password to confirm', 'warning');
            return;
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
                            const { error: signInError } = await supabase.auth.signInWithPassword({
                                email: email,
                                password: deletePassword,
                            });

                            if (signInError) {
                                showToast('Password is incorrect', 'error');
                                return;
                            }

                            // Note: Account deletion via Supabase requires admin privileges
                            // This is the safe approach for production apps
                            Alert.alert(
                                'Account Deletion Request',
                                'For security reasons, account deletion requires additional verification. Please contact support@smartcleaner.com to request account deletion.',
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => setDeletePassword('')
                                    }
                                ]
                            );

                        } catch (e: any) {
                            showToast(e.message || 'Failed to verify password', 'error');
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    // Render toast messages
    const renderToasts = () => {
        const statusBarHeight = StatusBar.currentHeight || (Platform.OS === 'ios' ? 47 : 0);
        
        return toasts.map((toast, index) => {
            const toastColor = toast.type === 'success' ? successColor : toast.type === 'error' ? errorColor : toast.type === 'warning' ? warningColor : infoColor;
            const fadeAnim = toastAnimations.current[toast.id] || new Animated.Value(1);
            
            return (
                <Animated.View
                    key={toast.id}
                    style={[
                        toastStyles.toast,
                        {
                            backgroundColor: toastColor,
                            top: statusBarHeight + 10 + (index * 70),
                            left: 16,
                            right: 16,
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <Ionicons
                        name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'alert-circle' : toast.type === 'warning' ? 'warning' : 'information-circle'}
                        size={22}
                        color="#fff"
                    />
                    <AppText style={toastStyles.toastText}>{toast.text}</AppText>
                    <TouchableOpacity
                        onPress={() => {
                            const anim = toastAnimations.current[toast.id];
                            if (anim) {
                                Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
                                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                                    delete toastAnimations.current[toast.id];
                                });
                            }
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={18} color="rgba(255,255,255,0.9)" />
                    </TouchableOpacity>
                </Animated.View>
            );
        });
    };

    if (loading) {
        return <Loader message="Loading account..." />;
    }

    /* ---------------------------------------------------------- */
    /* RENDER */
    /* ---------------------------------------------------------- */
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
            
            {renderToasts()}

            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.scrollContentLarge,
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                    {/* Back Navigation */}
                    <TouchableOpacity style={styles.backButton} onPress={() => back()} activeOpacity={0.7}>
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
                            <View style={[styles.inputWrapper, styles.readOnly, { borderColor: cardBorder }]}>
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
                                            borderColor: newPasswordError ? errorColor : cardBorder
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
                                    <Ionicons name="warning-outline" size={20} color={warningColor} />
                                    <AppText style={styles.warningTitle}>Password Requirements</AppText>
                                </View>

                                {requirementStatus.map((req) => (
                                    <View key={req.id} style={styles.warningRequirement}>
                                        <Ionicons
                                            name={req.met ? 'checkmark-circle' : 'close-circle'}
                                            size={16}
                                            color={req.met ? successColor : errorColor}
                                        />
                                        <AppText
                                            style={[
                                                styles.warningText,
                                                {
                                                    color: req.met ? successColor : (darkMode ? errorColor : '#dc2626'),
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
                                            borderColor: confirmError ? errorColor : cardBorder
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
                                    color={newPassword === confirmPassword ? successColor : errorColor}
                                />
                                <AppText
                                    style={[
                                        styles.matchText,
                                        { color: newPassword === confirmPassword ? successColor : errorColor },
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
                                  style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: errorColor }]}>
                        <View style={styles.sectionHeader}>
                            <AppText style={[styles.sectionTitle, { color: errorColor }]}>
                                Danger Zone
                            </AppText>
                        </View>

                        <View style={styles.field}>
                            <AppText style={[styles.label, { color: textSecondary }]}>Confirm Password to Delete Account</AppText>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={errorColor} style={styles.inputIcon} />
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
                        
                        <AppText style={[styles.dangerNote, { color: textSecondary }]}>
                            ⚠️ This action is permanent. All your data will be removed.
                        </AppText>
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
        paddingBottom: 100,
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
        color: errorColor,
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
        color: warningColor,
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
    dangerNote: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 12,
        opacity: 0.7,
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});

// Toast styles
const toastStyles = StyleSheet.create({
    toast: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        gap: 12,
        zIndex: 9999,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    toastText: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
});