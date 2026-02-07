// app/settings/account.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    Alert,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../../src/components/Header';
import Button from '../../src/components/Button';
import { supabase } from '@/src/services/supabase';
import { router } from 'expo-router';

export default function AccountSettings() {
    const { colors } = useThemeContext();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [mfaEnabled, setMfaEnabled] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [deletePassword, setDeletePassword] = useState('');

    const [loading, setLoading] = useState(true);
    const [savingName, setSavingName] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setEmail(user.email || 'Not available');
                    setFullName(user.user_metadata?.full_name || '');

                    // Check MFA status
                    const { data: factors } = await supabase.auth.mfa.listFactors();
                    setMfaEnabled((factors?.totp || []).length > 0);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    const saveName = async () => {
        if (!fullName.trim()) return Alert.alert('Error', 'Full name cannot be empty');

        setSavingName(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: fullName.trim() },
            });
            if (error) throw error;
            Alert.alert('Success', 'Name updated');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to update name');
        } finally {
            setSavingName(false);
        }
    };

    const updatePassword = async () => {
        if (!currentPassword) return Alert.alert('Error', 'Current password required');
        if (newPassword.length < 6) return Alert.alert('Error', 'New password must be at least 6 characters');
        if (newPassword !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');

        setSavingPassword(true);
        try {
            // Re-authenticate
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password: currentPassword,
            });
            if (authError) return Alert.alert('Error', 'Current password incorrect');

            // Update
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            Alert.alert('Success', 'Password updated');
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
                        try {
                            // Re-authenticate
                            const { error: authError } = await supabase.auth.signInWithPassword({
                                email,
                                password: deletePassword,
                            });
                            if (authError) throw authError;

                            // Delete user (requires service_role key in server-side, not client-side!)
                            // Note: Client-side deleteUser is not allowed by Supabase for security.
                            // You must implement this via a secure server function (Edge Function or your backend).
                            Alert.alert(
                                'Not Allowed',
                                'Account deletion is a sensitive action and must be done through a secure server endpoint.'
                            );

                            // Placeholder for future server-side delete:
                            // await fetch('/api/delete-user', { method: 'POST', body: JSON.stringify({ password: deletePassword }) });

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
        return (
            <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header
                title="Account"
                subtitle="Manage your profile"
                showBack
                onBack={() => router.back()} // Ensures back goes to Profile
            />

            <ScrollView contentContainerStyle={styles.container}>
                {/* PERSONAL */}
                <Group title="Personal Information">
                    <Input
                        label="Full Name"
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Your full name"
                    />
                    <ReadOnly label="Email" value={email} />
                    <Button
                        title="Save Changes"
                        onPress={saveName}
                        loading={savingName}
                        disabled={savingName}
                        fullWidth
                    />
                </Group>

                {/* SECURITY */}
                <Group title="Security">
                    <Row label="Two-Factor Authentication" value={mfaEnabled ? 'Enabled' : 'Disabled'} />
                    <Input
                        label="Current Password"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                        placeholder="••••••••"
                    />
                    <Input
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        placeholder="Minimum 6 characters"
                    />
                    <Input
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        placeholder="Re-enter new password"
                    />
                    <Button
                        title="Update Password"
                        onPress={updatePassword}
                        loading={savingPassword}
                        disabled={savingPassword}
                        fullWidth
                    />
                </Group>

                {/* DANGER ZONE */}
                <Group title="Danger Zone" danger>
                    <Input
                        label="Confirm Password to Delete"
                        value={deletePassword}
                        onChangeText={setDeletePassword}
                        secureTextEntry
                        placeholder="Enter your password"
                    />
                    <Button
                        title="Delete Account"
                        variant="danger"
                        loading={deleting}
                        onPress={deleteAccount}
                        fullWidth
                    />
                    <Text style={[styles.dangerHint, { color: colors.textSecondary }]}>
                        This action is permanent and cannot be undone.
                    </Text>
                </Group>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ──────────────────────────────────────────────── */
/*               Reusable Components               */
/* ──────────────────────────────────────────────── */

const Group = ({ title, children, danger = false }: any) => {
    const { colors } = useThemeContext();
    return (
        <View
            style={[
                styles.group,
                {
                    backgroundColor: colors.card,
                    borderColor: danger ? '#ff3b30' : colors.border,
                },
            ]}
        >
            <Text style={[styles.groupTitle, danger && { color: '#ff3b30' }]}>
                {title}
            </Text>
            {children}
        </View>
    );
};

const Input = ({ label, ...props }: any) => {
    const { colors } = useThemeContext();
    return (
        <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
            <TextInput
                {...props}
                style={[
                    styles.input,
                    { borderColor: colors.border, color: colors.text },
                ]}
                placeholderTextColor={colors.textSecondary + '80'}
            />
        </View>
    );
};

const ReadOnly = ({ label, value }: any) => {
    const { colors } = useThemeContext();
    return (
        <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
            <View style={[styles.input, styles.readOnly, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.textSecondary }}>{value}</Text>
            </View>
        </View>
    );
};

const Row = ({ label, value }: any) => {
    const { colors } = useThemeContext();
    return (
        <View style={styles.row}>
            <Text style={{ color: colors.text, fontSize: 16 }}>{label}</Text>
            <Text style={{ color: value.includes('Enabled') ? colors.primary : colors.textSecondary, fontWeight: '600' }}>
                {value}
            </Text>
        </View>
    );
};

/* ──────────────────────────────────────────────── */
/*                   Styles                        */
/* ──────────────────────────────────────────────── */

const styles = StyleSheet.create({
    container: {
        padding: 24,
        paddingBottom: 40,
        maxWidth: 420,
        alignSelf: 'center',
        width: '100%',
    },
    group: {
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        marginBottom: 28,
    },
    groupTitle: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 20,
        textTransform: 'uppercase',
    },
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        height: 54,
        borderWidth: 1.5,
        borderRadius: 14,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    readOnly: {
        height: 54,
        borderRadius: 14,
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    dangerHint: {
        fontSize: 13,
        marginTop: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});