// app/settings/account.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../../src/components/Header';
import Button from '../../src/components/Button';
import { supabase } from '@/src/services/supabase';

export default function AccountSettings() {
    const { colors } = useThemeContext();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingName, setSavingName] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    // Floating label animations
    const nameAnim = useRef(new Animated.Value(0)).current;
    const currPassAnim = useRef(new Animated.Value(0)).current;
    const newPassAnim = useRef(new Animated.Value(0)).current;
    const confirmPassAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loadUser = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setEmail(user.email || 'Not available');
                    setFullName(user.user_metadata?.full_name || '');
                }
            } catch (err) {
                console.error('Failed to load user:', err);
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    const animateLabel = (anim: Animated.Value, toValue: number) => {
        Animated.timing(anim, {
            toValue,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const handleSaveName = async () => {
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

            Alert.alert('Success', 'Full name updated successfully');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update name');
        } finally {
            setSavingName(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword) {
            Alert.alert('Error', 'Current password is required');
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            Alert.alert('Error', 'New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setSavingPassword(true);
        try {
            // Re-authenticate user with current password first (required for sensitive operations)
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email,
                password: currentPassword,
            });

            if (signInError) {
                Alert.alert('Error', 'Current password is incorrect');
                return;
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) throw updateError;

            Alert.alert('Success', 'Password updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update password');
        } finally {
            setSavingPassword(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Account Settings" subtitle="Manage your personal information" />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Full Name Section */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Details</Text>

                    {/* Full Name */}
                    <View style={styles.field}>
                        <Animated.Text
                            style={[
                                styles.floatingLabel,
                                {
                                    top: nameAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 8] }),
                                    fontSize: nameAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                                    color: nameAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [colors.textSecondary, colors.primary],
                                    }),
                                },
                            ]}
                        >
                            Full Name
                        </Animated.Text>

                        <TextInput
                            style={[
                                styles.input,
                                { borderColor: colors.border, color: colors.text, backgroundColor: colors.background },
                            ]}
                            value={fullName}
                            onChangeText={(text) => {
                                setFullName(text);
                                animateLabel(nameAnim, text.length > 0 ? 1 : 0);
                            }}
                            onFocus={() => animateLabel(nameAnim, 1)}
                            onBlur={() => animateLabel(nameAnim, fullName ? 1 : 0)}
                            placeholder=""
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Email (read-only) */}
                    <View style={styles.field}>
                        <Text style={[styles.labelStatic, { color: colors.textSecondary }]}>Email</Text>
                        <View style={[styles.readOnlyInput, { backgroundColor: colors.background }]}>
                            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{email}</Text>
                        </View>
                    </View>

                    <Button
                        title="Save Name"
                        icon="save-outline"
                        onPress={handleSaveName}
                        variant="primary"
                        fullWidth
                        loading={savingName}
                        disabled={savingName}
                        style={{ marginTop: 20 }}
                    />
                </View>

                {/* Password Change Section */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Password</Text>

                    {/* Current Password */}
                    <View style={styles.field}>
                        <Animated.Text
                            style={[
                                styles.floatingLabel,
                                {
                                    top: currPassAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 8] }),
                                    fontSize: currPassAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                                    color: currPassAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [colors.textSecondary, colors.primary],
                                    }),
                                },
                            ]}
                        >
                            Current Password
                        </Animated.Text>

                        <TextInput
                            style={[
                                styles.input,
                                { borderColor: colors.border, color: colors.text, backgroundColor: colors.background },
                            ]}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            onFocus={() => animateLabel(currPassAnim, 1)}
                            onBlur={() => animateLabel(currPassAnim, currentPassword ? 1 : 0)}
                            secureTextEntry
                            placeholder=""
                        />
                    </View>

                    {/* New Password */}
                    <View style={styles.field}>
                        <Animated.Text
                            style={[
                                styles.floatingLabel,
                                {
                                    top: newPassAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 8] }),
                                    fontSize: newPassAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                                    color: newPassAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [colors.textSecondary, colors.primary],
                                    }),
                                },
                            ]}
                        >
                            New Password
                        </Animated.Text>

                        <TextInput
                            style={[
                                styles.input,
                                { borderColor: colors.border, color: colors.text, backgroundColor: colors.background },
                            ]}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            onFocus={() => animateLabel(newPassAnim, 1)}
                            onBlur={() => animateLabel(newPassAnim, newPassword ? 1 : 0)}
                            secureTextEntry
                            placeholder=""
                        />
                    </View>

                    {/* Confirm New Password */}
                    <View style={styles.field}>
                        <Animated.Text
                            style={[
                                styles.floatingLabel,
                                {
                                    top: confirmPassAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 8] }),
                                    fontSize: confirmPassAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                                    color: confirmPassAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [colors.textSecondary, colors.primary],
                                    }),
                                },
                            ]}
                        >
                            Confirm New Password
                        </Animated.Text>

                        <TextInput
                            style={[
                                styles.input,
                                { borderColor: colors.border, color: colors.text, backgroundColor: colors.background },
                            ]}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            onFocus={() => animateLabel(confirmPassAnim, 1)}
                            onBlur={() => animateLabel(confirmPassAnim, confirmPassword ? 1 : 0)}
                            secureTextEntry
                            placeholder=""
                        />
                    </View>

                    <Button
                        title="Update Password"
                        icon="lock-closed-outline"
                        onPress={handleChangePassword}
                        variant="primary"
                        fullWidth
                        loading={savingPassword}
                        disabled={savingPassword}
                        style={{ marginTop: 24 }}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 24, paddingBottom: 40 },
    sectionCard: {
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 20,
    },
    field: {
        marginBottom: 24,
        position: 'relative',
    },
    floatingLabel: {
        position: 'absolute',
        left: 16,
        zIndex: 1,
        backgroundColor: 'transparent',
        paddingHorizontal: 4,
        pointerEvents: 'none',
    },
    labelStatic: {
        fontSize: 14,
        marginBottom: 8,
    },
    input: {
        height: 56,
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    readOnlyInput: {
        height: 56,
        borderRadius: 16,
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderWidth: 1.5,
    },
});