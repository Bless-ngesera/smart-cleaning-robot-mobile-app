// app/settings/robot.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../../src/components/Header';
import Button from '../../src/components/Button';
import { supabase } from '@/src/services/supabase';

type RobotInfo = {
    status: 'Online' | 'Offline' | 'Charging' | 'Error';
    battery: number;
    lastClean: string;
    firmware: string;
    connectionType?: 'wifi' | 'ble' | 'none';
};

export default function RobotManagement() {
    const { colors } = useThemeContext();

    const [robot, setRobot] = useState<RobotInfo>({
        status: 'Offline',
        battery: 0,
        lastClean: 'Never',
        firmware: 'Unknown',
        connectionType: 'none',
    });

    const [loading, setLoading] = useState(true);
    const [restarting, setRestarting] = useState(false);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        const fetchRobot = async () => {
            setLoading(true);
            try {
                // === PLACEHOLDER: Fetch real robot info from Supabase ===
                const { data, error } = await supabase
                    .from('robot_info')
                    .select('status, battery, last_clean, firmware')
                    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error) throw error;

                setRobot({
                    status: data.status ?? 'Offline',
                    battery: data.battery ?? 0,
                    lastClean: data.last_clean ?? 'Never',
                    firmware: data.firmware ?? 'Unknown',
                    connectionType: 'wifi', // update from your connection logic
                });
            } catch (err) {
                console.error('Failed to fetch robot info:', err);
                Alert.alert('Error', 'Could not load robot information');
            } finally {
                setLoading(false);
            }

            // === C++ INTEGRATION POINT: Fetch real robot info here ===
            // Replace or merge with Supabase fetch
            // - Connect via Bluetooth, Wi-Fi, Serial, HTTP API, etc.
            // - Get live data from robot firmware
            // Example pseudo-code:
            // const realData = await RobotBridge.getRobotInfo(); // your C++ bridge call
            // setRobot(realData);
        };

        fetchRobot();
    }, []);

    const checkUpdates = async () => {
        setChecking(true);
        try {
            // === PLACEHOLDER: Check firmware updates ===
            // Replace with your real check logic
            await new Promise(r => setTimeout(r, 1200));
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
                            // === PLACEHOLDER: Send restart command to robot ===
                            // Replace with your C++ / native code
                            await new Promise(r => setTimeout(r, 1500));
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
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Robot Management" subtitle="Your cleaning robot" />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Status */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
                    <View style={styles.valueRow}>
                        <Ionicons
                            name={robot.status === 'Online' ? 'checkmark-circle' : 'alert-circle'}
                            size={20}
                            color={robot.status === 'Online' ? colors.primary : '#ef4444'}
                            style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.value, { color: robot.status === 'Online' ? colors.primary : '#ef4444' }]}>
                            {robot.status}
                        </Text>
                    </View>
                </View>

                {/* Battery */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Battery Level</Text>
                    <View style={styles.valueRow}>
                        <Ionicons name="battery-charging" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.value, { color: colors.primary }]}>{robot.battery}%</Text>
                    </View>
                </View>

                {/* Last Clean */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Last Cleaning</Text>
                    <View style={styles.valueRow}>
                        <Ionicons name="time-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.value, { color: colors.text }]}>{robot.lastClean}</Text>
                    </View>
                </View>

                {/* Firmware */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Firmware Version</Text>
                    <View style={styles.valueRow}>
                        <Ionicons name="git-network-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.value, { color: colors.text }]}>{robot.firmware}</Text>
                    </View>
                </View>

                {/* Connection Status */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Connection</Text>
                    <View style={styles.valueRow}>
                        <Ionicons
                            name={robot.connectionType === 'wifi' ? 'wifi' : robot.connectionType === 'ble' ? 'bluetooth' : 'wifi-off'}
                            size={20}
                            color={robot.connectionType !== 'none' ? colors.primary : '#ef4444'}
                            style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.value, { color: colors.text }]}>
                            {robot.connectionType === 'none' ? 'Disconnected' : `Via ${robot.connectionType === 'wifi' ? 'Wi-Fi' : 'Bluetooth'}`}
                        </Text>
                    </View>
                </View>

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
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: 24,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        marginBottom: 16,
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
});