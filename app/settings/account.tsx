// app/settings/account.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    Alert,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/src/components/Header';
import Button from '@/src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

export default function AccountSettings() {
    const { colors, isDark } = useThemeContext();

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
            try {
                const { data } = await supabase.auth.getUser();
                if (!data.user) return;

                setEmail(data.user.email ?? '');
                setFullName(data.user.user_metadata?.full_name ?? '');

                const { data: factors } =
                    await supabase.auth.mfa.listFactors();
                setMfaEnabled((factors?.totp ?? []).length > 0);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    /* ---------------- Actions ---------------- */

    const saveName = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Full name cannot be empty');
            return;
        }
        setSavingName(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: fullName.trim() },
            });
            if (error) throw error;
            Alert.alert('Saved', 'Your name was updated');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSavingName(false);
        }
    };

    const updatePassword = async () => {
        if (!currentPassword || newPassword.length < 6) {
            Alert.alert('Error', 'Check your password inputs');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setSavingPassword(true);
        try {
            const { error: authError } =
                await supabase.auth.signInWithPassword({
                    email,
                    password: currentPassword,
                });
            if (authError) throw authError;

            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });
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
        if (!deletePassword) {
            Alert.alert('Error', 'Password required');
            return;
        }

        Alert.alert(
            'Delete account',
            'This action is permanent and cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            const { error: authError } =
                                await supabase.auth.signInWithPassword({
                                    email,
                                    password: deletePassword,
                                });
                            if (authError) throw authError;

                            await supabase.auth.admin.deleteUser(
                                (await supabase.auth.getUser()).data.user!.id
                            );

                            await supabase.auth.signOut();
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
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
            <Header title="Account" subtitle="Your personal settings" />

            <ScrollView contentContainerStyle={styles.container}>
                {/* PERSONAL */}
                <Group title="PERSONAL">
                    <Input label="Full name" value={fullName} onChangeText={setFullName} />
                    <ReadOnly label="Email" value={email} />
                    <Button title="Save changes" onPress={saveName} loading={savingName} fullWidth />
                </Group>

                {/* SECURITY */}
                <Group title="SECURITY">
                    <Row label="Two-Factor Authentication" value={mfaEnabled ? 'Enabled' : 'Not enabled'} />
                    <Input label="Current password" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
                    <Input label="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
                    <Input label="Confirm password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
                    <Hint>Minimum 6 characters</Hint>
                    <Button title="Update password" onPress={updatePassword} loading={savingPassword} fullWidth />
                </Group>

                {/* DANGER */}
                <Group title="DANGER ZONE" danger>
                    <Input
                        label="Confirm password"
                        secureTextEntry
                        value={deletePassword}
                        onChangeText={setDeletePassword}
                    />
                    <Button
                        title="Delete account"
                        variant="danger"
                        loading={deleting}
                        onPress={deleteAccount}
                        fullWidth
                    />
                </Group>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ---------------- Small UI Blocks ---------------- */

const Group = ({ title, children, danger }: any) => {
    const { colors, isDark } = useThemeContext();
    return (
        <View
            style={[
                styles.group,
                {
                    backgroundColor: isDark ? colors.card : colors.card,
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
            />
        </View>
    );
};

const ReadOnly = ({ label, value }: any) => {
    const { colors } = useThemeContext();
    return (
        <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
            <View style={[styles.input, styles.readOnly]}>
                <Text style={{ color: colors.textSecondary }}>{value}</Text>
            </View>
        </View>
    );
};

const Row = ({ label, value }: any) => {
    const { colors } = useThemeContext();
    return (
        <View style={styles.row}>
            <Text style={{ color: colors.text }}>{label}</Text>
            <Text style={{ color: colors.textSecondary }}>{value}</Text>
        </View>
    );
};

const Hint = ({ children }: any) => {
    const { colors } = useThemeContext();
    return <Text style={[styles.hint, { color: colors.textSecondary }]}>{children}</Text>;
};

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
    container: { padding: 24, paddingBottom: 40 },
    group: {
        borderRadius: 22,
        padding: 20,
        borderWidth: 1,
        marginBottom: 24,
    },
    groupTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 14,
        letterSpacing: 1,
    },
    field: { marginBottom: 16 },
    label: { fontSize: 13, marginBottom: 6 },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
    },
    readOnly: { justifyContent: 'center' },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    hint: { fontSize: 12, marginBottom: 12 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
