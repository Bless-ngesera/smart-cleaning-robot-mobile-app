// app/settings/robot.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Alert,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import Loader from '../../src/components/Loader';
import AppText from '../../src/components/AppText';
import Button from '../../src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

type RobotInfo = {
    status: 'Online' | 'Offline' | 'Charging' | 'Error';
    battery: number;
    lastClean: string;
    firmware: string;
    connectionType?: 'wifi' | 'ble' | 'none';
};

export default function RobotManagement() {
    const { colors, darkMode } = useThemeContext();

    const [robot, setRobot] = useState<RobotInfo>({
        status: 'Offline',
        battery: 0,
        lastClean: 'Never',
        firmware: 'Unknown',
        connectionType: 'none',
    });

    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [restarting, setRestarting] = useState(false);

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
        const fetchRobot = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user?.id) throw new Error('Not authenticated');

                const { data, error } = await supabase
                    .from('robot_info')
                    .select('status, battery, last_clean, firmware')
                    .eq('user_id', user.id)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    setRobot({
                        status: data.status ?? 'Offline',
                        battery: data.battery ?? 0,
                        lastClean: data.last_clean ?? 'Never',
                        firmware: data.firmware ?? 'Unknown',
                        connectionType: 'wifi', // ← update from your connection logic
                    });
                }
            } catch (err: any) {
                console.error('Failed to fetch robot info:', err);
                Alert.alert('Error', 'Could not load robot information');
            } finally {
                setLoading(false);
            }
        };

        fetchRobot();
    }, []);

    const checkUpdates = async () => {
        setChecking(true);
        try {
            // Placeholder: real firmware check logic (API call, BLE command, etc.)
            await new Promise(resolve => setTimeout(resolve, 1500));
            Alert.alert('Firmware Check', 'Your robot is up to date (v2.3.1)');
        } catch (err) {
            Alert.alert('Error', 'Failed to check for updates');
        } finally {
            setChecking(false);
        }
    };

    const restartRobot = async () => {
        Alert.alert(
            'Restart Robot',
            'This will restart your robot. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restart',
                    style: 'destructive',
                    onPress: async () => {
                        setRestarting(true);
                        try {
                            // Placeholder: real restart command (BLE, Wi-Fi API, etc.)
                            await new Promise(resolve => setTimeout(resolve, 1500));
                            Alert.alert('Success', 'Restart command sent. Robot restarting...');
                        } catch (err) {
                            Alert.alert('Error', 'Failed to restart robot');
                        } finally {
                            setRestarting(false);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return <Loader message="Loading robot info..." />;
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
                            Robot Management
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Your cleaning robot
                        </AppText>
                    </View>

                    {/* Status Card */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <AppText style={[styles.label, { color: textSecondary }]}>Status</AppText>
                        <View style={styles.valueRow}>
                            <Ionicons
                                name={
                                    robot.status === 'Online' ? 'checkmark-circle' :
                                        robot.status === 'Charging' ? 'battery-charging' :
                                            robot.status === 'Error' ? 'alert-circle' : 'cloud-offline'
                                }
                                size={20}
                                color={
                                    robot.status === 'Online' ? colors.primary :
                                        robot.status === 'Charging' ? '#f59e0b' :
                                            robot.status === 'Error' ? '#ef4444' : textSecondary
                                }
                                style={{ marginRight: 8 }}
                            />
                            <AppText style={[
                                styles.value,
                                {
                                    color:
                                        robot.status === 'Online' ? colors.primary :
                                            robot.status === 'Charging' ? '#f59e0b' :
                                                robot.status === 'Error' ? '#ef4444' : textPrimary,
                                }
                            ]}>
                                {robot.status}
                            </AppText>
                        </View>
                    </View>

                    {/* Battery Card */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <AppText style={[styles.label, { color: textSecondary }]}>Battery Level</AppText>
                        <View style={styles.valueRow}>
                            <Ionicons name="battery-half" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                            <AppText style={[styles.value, { color: colors.primary }]}>
                                {robot.battery}%
                            </AppText>
                        </View>
                    </View>

                    {/* Last Clean Card */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <AppText style={[styles.label, { color: textSecondary }]}>Last Cleaning</AppText>
                        <View style={styles.valueRow}>
                            <Ionicons name="time-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                            <AppText style={[styles.value, { color: textPrimary }]}>
                                {robot.lastClean}
                            </AppText>
                        </View>
                    </View>

                    {/* Firmware Card */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <AppText style={[styles.label, { color: textSecondary }]}>Firmware Version</AppText>
                        <View style={styles.valueRow}>
                            <Ionicons name="git-network-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                            <AppText style={[styles.value, { color: textPrimary }]}>
                                {robot.firmware}
                            </AppText>
                        </View>
                    </View>

                    {/* Connection Card */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <AppText style={[styles.label, { color: textSecondary }]}>Connection</AppText>
                        <View style={styles.valueRow}>
                            <Ionicons
                                name={robot.connectionType === 'wifi' ? 'wifi' : robot.connectionType === 'ble' ? 'bluetooth' : 'wifi-off'}
                                size={20}
                                color={robot.connectionType !== 'none' ? colors.primary : '#ef4444'}
                                style={{ marginRight: 8 }}
                            />
                            <AppText style={[styles.value, { color: textPrimary }]}>
                                {robot.connectionType === 'none' ? 'Disconnected' : `Via ${robot.connectionType === 'wifi' ? 'Wi-Fi' : 'Bluetooth'}`}
                            </AppText>
                        </View>
                    </View>

                    {/* Actions */}
                    <Button
                        title="Check for Updates"
                        icon="cloud-upload-outline"
                        onPress={checkUpdates}
                        loading={checking}
                        disabled={checking}
                        variant="primary"
                        fullWidth
                        style={{ marginTop: 24 }}
                    />

                    <Button
                        title="Restart Robot"
                        icon="refresh-outline"
                        onPress={restartRobot}
                        loading={restarting}
                        disabled={restarting}
                        variant="outline"
                        fullWidth
                        style={{ marginTop: 12 }}
                    />
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
    label: {
        fontSize: 14,
        marginBottom: 8,
    },
    value: {
        fontSize: 18,
        fontWeight: '600',
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});