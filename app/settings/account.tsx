// app/(tabs)/settings/account.tsx  (or wherever this file lives)
import React, { useState, useEffect } from 'react';
import {
    View,
    TextInput,
    ScrollView,
    Alert,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

import Loader from '@/src/components/Loader';
import AppText from '@/src/components/AppText';
import Button from '@/src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';
import { router } from 'expo-router';

const AnimatedCard = Animated.createAnimatedComponent(View);

export default function AccountSettings() {
    const { colors, darkMode } = useThemeContext();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [deletePassword, setDeletePassword] = useState('');

    const [show, setShow] = useState({ current: false, new: false, confirm: false, delete: false });

    const [loading, setLoading] = useState(true);
    const [savingName, setSavingName] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Same as Dashboard
    const { width } = Dimensions.get('window');
    const isLargeScreen = width >= 768;

    // Design tokens matching Dashboard
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    useEffect(() => {
        const loadUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setEmail(user.email || 'No email');
                    setFullName((user.user_metadata?.full_name as string) || '');
                } else {
                    router.replace('/LoginScreen');
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

    const saveName = async () => {
        if (!fullName.trim()) return Alert.alert('Error', 'Full name cannot be empty');
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

    const updatePassword = async () => {
        if (!currentPassword) return Alert.alert('Error', 'Current password required');
        if (newPassword.length < 6) return Alert.alert('Error', 'New password must be at least 6 characters');
        if (newPassword !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');

        haptic();
        setSavingPassword(true);
        try {
            // Verify current password
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password: currentPassword,
            });
            if (authError) throw new Error('Current password is incorrect');

            // Update password
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            Alert.alert('Success', 'Password updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to update password');
        } finally {
            setSavingPassword(false);
        }
    };

    const deleteAccount = async () => {
        if (!deletePassword) return Alert.alert('Error', 'Password required');

        Alert.alert(
            'Delete Account',
            'This action is permanent and cannot be undone. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        haptic();
                        try {
                            // Verify password
                            const { error: authError } = await supabase.auth.signInWithPassword({
                                email,
                                password: deletePassword,
                            });
                            if (authError) throw new Error('Password incorrect');

                            // Attempt delete (note: client-side delete is restricted in Supabase)
                            const { error: deleteError } = await supabase.auth.admin.deleteUser(
                                (await supabase.auth.getUser()).data.user!.id
                            );

                            if (deleteError) {
                                // Most common: permission denied
                                throw new Error(
                                    'Client-side account deletion is restricted for security. ' +
                                    'Please contact support to delete your account.'
                                );
                            }

                            await supabase.auth.signOut();
                            Alert.alert('Account Deleted', 'Your account has been permanently removed.');
                            router.replace('/LoginScreen');
                        } catch (e: any) {
                            Alert.alert('Error', e.message || 'Failed to delete account');
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
                    {/* Large Header */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Account Settings
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Personal info & security
                        </AppText>
                    </View>

                    {/* Personal Information */}
                    <AnimatedCard entering={FadeInDown.duration(350).springify()} style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
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

                    {/* Security */}
                    <AnimatedCard entering={FadeInDown.delay(80).duration(350).springify()} style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                Security
                            </AppText>
                        </View>

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
                                />
                                <TouchableOpacity onPress={() => setShow({ ...show, current: !show.current })} style={styles.eye}>
                                    <Ionicons name={show.current ? 'eye-off-outline' : 'eye-outline'} size={20} color={textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.field}>
                            <AppText style={[styles.label, { color: textSecondary }]}>New Password</AppText>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!show.new}
                                    style={[styles.input, { color: textPrimary, borderColor: cardBorder }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={textSecondary + '80'}
                                />
                                <TouchableOpacity onPress={() => setShow({ ...show, new: !show.new })} style={styles.eye}>
                                    <Ionicons name={show.new ? 'eye-off-outline' : 'eye-outline'} size={20} color={textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.field}>
                            <AppText style={[styles.label, { color: textSecondary }]}>Confirm New Password</AppText>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!show.confirm}
                                    style={[styles.input, { color: textPrimary, borderColor: cardBorder }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={textSecondary + '80'}
                                />
                                <TouchableOpacity onPress={() => setShow({ ...show, confirm: !show.confirm })} style={styles.eye}>
                                    <Ionicons name={show.confirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Button
                            title="Update Password"
                            loading={savingPassword}
                            onPress={updatePassword}
                            fullWidth
                        />
                    </AnimatedCard>

                    {/* Danger Zone */}
                    <AnimatedCard entering={FadeInDown.delay(160).duration(350).springify()} style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: '#ff3b30' }]}>
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

const styles = StyleSheet.create({
    container: { flex: 1 },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 120,
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

    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});