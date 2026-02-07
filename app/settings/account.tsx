import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    Alert,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '@/src/components/Header';
import Button from '@/src/components/Button';
import { supabase } from '@/src/services/supabase';
import { router } from 'expo-router';

const AnimatedCard = Animated.createAnimatedComponent(View);

export default function AccountSettings() {
    const { colors } = useThemeContext();

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

    useEffect(() => {
        const loadUser = async () => {
            try {
                const { data } = await supabase.auth.getUser();
                if (data.user) {
                    setEmail(data.user.email ?? '');
                    setFullName(data.user.user_metadata?.full_name ?? '');
                }
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    const haptic = () => {
        if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
        }
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
            Alert.alert('Error', e.message);
        } finally {
            setSavingName(false);
        }
    };

    const updatePassword = async () => {
        if (!currentPassword) return Alert.alert('Error', 'Current password required');
        if (newPassword.length < 6) return Alert.alert('Error', 'Password too short');
        if (newPassword !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');

        haptic();
        setSavingPassword(true);
        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password: currentPassword,
            });
            if (authError) throw authError;

            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            Alert.alert('Success', 'Password updated');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (e: any) {
            Alert.alert('Error', e.message);
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
                            const { error: authError } = await supabase.auth.signInWithPassword({
                                email,
                                password: deletePassword,
                            });
                            if (authError) throw authError;

                            const { error: deleteError } = await supabase.auth.admin.deleteUser(
                                (await supabase.auth.getUser()).data.user!.id
                            );

                            if (deleteError) throw deleteError;

                            await supabase.auth.signOut();
                            Alert.alert('Account Deleted', 'Your account has been permanently removed.');
                            router.replace('/LoginScreen');
                        } catch (e: any) {
                            const msg = e.message || 'Failed to delete account';
                            if (msg.includes('permission') || msg.includes('not allowed')) {
                                Alert.alert(
                                    'Restricted Action',
                                    'Client-side account deletion is blocked for security. ' +
                                    'Please contact support to delete your account.'
                                );
                            } else {
                                Alert.alert('Error', msg);
                            }
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header
                title="Account"
                subtitle="Personal info & security"
                showBack
                onBack={() => router.back()}
            />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                {/* Personal Info */}
                <AnimatedCard entering={FadeInDown.duration(350).springify()} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <SectionTitle title="Personal Information" />

                    <Field label="Full name">
                        <View style={styles.inputWrapper}>
                            <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                            <TextInput
                                value={fullName}
                                onChangeText={setFullName}
                                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                placeholder="Full name"
                                placeholderTextColor={colors.textSecondary + '80'}
                            />
                        </View>
                    </Field>

                    <Field label="Email">
                        <View style={[styles.inputWrapper, styles.readOnly]}>
                            <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                            <Text style={{ color: colors.textSecondary }}>{email}</Text>
                        </View>
                    </Field>

                    <Button title="Save changes" loading={savingName} onPress={saveName} fullWidth />
                </AnimatedCard>

                {/* Security */}
                <AnimatedCard entering={FadeInDown.delay(80).duration(350).springify()} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <SectionTitle title="Security" />

                    <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} show={show.current} toggle={() => setShow({ ...show, current: !show.current })} />
                    <PasswordField label="New password" value={newPassword} onChange={setNewPassword} show={show.new} toggle={() => setShow({ ...show, new: !show.new })} />
                    <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} show={show.confirm} toggle={() => setShow({ ...show, confirm: !show.confirm })} />

                    <Button title="Update password" loading={savingPassword} onPress={updatePassword} fullWidth />
                </AnimatedCard>

                {/* Danger Zone */}
                <AnimatedCard entering={FadeInDown.delay(160).duration(350).springify()} style={[styles.card, { backgroundColor: colors.card, borderColor: '#ff3b30' }]}>
                    <SectionTitle title="Danger Zone" />

                    <Field label="Confirm password to delete account">
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                            <TextInput
                                value={deletePassword}
                                onChangeText={setDeletePassword}
                                secureTextEntry={!show.delete}
                                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textSecondary + '80'}
                            />
                            <TouchableOpacity onPress={() => setShow({ ...show, delete: !show.delete })} style={styles.eye}>
                                <Ionicons name={show.delete ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </Field>

                    <Button
                        title="Delete Account"
                        variant="danger"
                        loading={deleting}
                        onPress={deleteAccount}
                        fullWidth
                    />
                </AnimatedCard>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ---------- Components ---------- */

const SectionTitle = ({ title }: { title: string }) => {
    const { colors } = useThemeContext();
    return <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>;
};

const Field = ({ label, children }: any) => {
    const { colors } = useThemeContext();
    return (
        <View style={{ marginBottom: 20 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
            {children}
        </View>
    );
};

const PasswordField = ({ label, value, onChange, show, toggle }: any) => {
    const { colors } = useThemeContext();
    return (
        <Field label={label}>
            <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry={!show}
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textSecondary + '80'}
                />
                <TouchableOpacity onPress={toggle} style={styles.eye}>
                    <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </Field>
    );
};

/* ---------- Styles (only changed paddingHorizontal to 16 for better icon fit) ---------- */

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
        maxWidth: 440,
        alignSelf: 'center',
        width: '100%',
    },
    card: {
        borderRadius: 22,
        padding: 24,
        borderWidth: 1,
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 18,
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
        paddingLeft: 52,          // space for left icon
        paddingRight: 52,         // space for right eye icon
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});