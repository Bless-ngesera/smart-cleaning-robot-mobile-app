// app/(tabs)/connection-setup.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    FlatList,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BleManager } from 'react-native-ble-plx';

import Header from '../../src/components/Header';
import Button from '../../src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import { router } from 'expo-router';

const bleManager = new BleManager();

type ConnectionType = 'wifi' | 'ble' | 'none';

export default function ConnectionSetupScreen() {
    const { colors } = useThemeContext();

    const [connectionType, setConnectionType] = useState<ConnectionType>('none');
    const [wifiIp, setWifiIp] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [bleDevices, setBleDevices] = useState<any[]>([]);
    const [selectedBleDevice, setSelectedBleDevice] = useState<string | null>(null);
    const [testing, setTesting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    // Load saved connection on mount
    useEffect(() => {
        loadSavedConnection();
    }, []);

    const loadSavedConnection = async () => {
        try {
            const saved = await AsyncStorage.getItem('robotConnection');
            if (saved) {
                const { type, ip, bleId } = JSON.parse(saved);
                setConnectionType(type);
                if (type === 'wifi' && ip) setWifiIp(ip);
                if (type === 'ble' && bleId) setSelectedBleDevice(bleId);
            }
        } catch (err) {
            console.warn('Failed to load saved connection', err);
        }
    };

    const saveConnection = async (type: ConnectionType, ip?: string, bleId?: string) => {
        try {
            await AsyncStorage.setItem(
                'robotConnection',
                JSON.stringify({ type, ip, bleId })
            );
            setConnectionType(type);
            if (type === 'wifi') setWifiIp(ip || '');
            if (type === 'ble') setSelectedBleDevice(bleId || null);
            Alert.alert('Saved', `Connection preference saved: ${type.toUpperCase()}`);
        } catch (err) {
            Alert.alert('Error', 'Failed to save connection settings');
        }
    };

    // ─── Wi-Fi Connection ────────────────────────────────────────

    const testWifiConnection = async () => {
        if (!wifiIp.trim()) {
            Alert.alert('Error', 'Please enter the robot IP address');
            return;
        }

        setTesting(true);
        setStatusMessage('Testing Wi-Fi connection...');

        try {
            // === C++ BRIDGE / REAL IMPLEMENTATION POINT ===
            // Replace this with actual ping or /status request to the robot
            // Example using fetch:
            // const response = await fetch(`http://${wifiIp}/status`, { timeout: 5000 });
            // if (!response.ok) throw new Error('No response');

            // Simulate success
            await new Promise((r) => setTimeout(r, 1800));

            await saveConnection('wifi', wifiIp.trim());
            setStatusMessage('Wi-Fi connected successfully!');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            console.warn('Wi-Fi test failed', err);
            Alert.alert('Connection Failed', 'Could not reach the robot. Check IP and network.');
            setStatusMessage('');
        } finally {
            setTesting(false);
        }
    };

    // ─── Bluetooth (BLE) Connection ────────────────────────────────────────

    const startBleScan = () => {
        setIsScanning(true);
        setBleDevices([]);
        setStatusMessage('Scanning for robots...');

        bleManager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                Alert.alert('BLE Error', error.message);
                setIsScanning(false);
                return;
            }

            if (device?.name?.includes('SmartCleaner') || device?.localName?.includes('SmartCleaner')) {
                setBleDevices((prev) => {
                    if (prev.some((d) => d.id === device.id)) return prev;
                    return [...prev, device];
                });
            }
        });

        // Stop scanning after 10 seconds
        setTimeout(() => {
            bleManager.stopDeviceScan();
            setIsScanning(false);
            setStatusMessage(bleDevices.length ? '' : 'No robots found');
        }, 10000);
    };

    const connectToBleDevice = async (device: any) => {
        setTesting(true);
        setStatusMessage(`Connecting to ${device.name || device.id}...`);

        try {
            // === C++ BRIDGE / REAL IMPLEMENTATION POINT ===
            // In production you would:
            // 1. Connect: await bleManager.connectToDevice(device.id)
            // 2. Discover services & characteristics
            // 3. Read status or write test command
            // For now: simulate success
            await new Promise((r) => setTimeout(r, 2200));

            await saveConnection('ble', undefined, device.id);
            setSelectedBleDevice(device.id);
            setStatusMessage('Bluetooth connected successfully!');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            Alert.alert('Connection Failed', 'Could not connect to device');
            setStatusMessage('');
        } finally {
            setTesting(false);
        }
    };

    // ─── UI ────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header
                title="Connection Setup"
                subtitle="Connect to your Smart Cleaner Pro"
            />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Current Status */}
                <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.statusTitle, { color: colors.text }]}>Current Connection</Text>
                    <View style={styles.statusRow}>
                        <Ionicons
                            name={
                                connectionType === 'wifi'
                                    ? 'wifi'
                                    : connectionType === 'ble'
                                        ? 'bluetooth'
                                        : 'wifi-off'
                            }
                            size={24}
                            color={connectionType !== 'none' ? colors.primary : '#ef4444'}
                        />
                        <Text style={[styles.statusText, { color: colors.text }]}>
                            {connectionType === 'none'
                                ? 'Not connected'
                                : connectionType === 'wifi'
                                    ? `Wi-Fi (${wifiIp || 'unknown'})`
                                    : `Bluetooth (${selectedBleDevice ? 'connected' : 'not connected'})`}
                        </Text>
                    </View>
                </View>

                {/* Choose Connection Type */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Choose Connection Method</Text>

                    <TouchableOpacity
                        style={[
                            styles.optionButton,
                            connectionType === 'wifi' && styles.optionSelected,
                        ]}
                        onPress={() => setConnectionType('wifi')}
                    >
                        <Ionicons name="wifi" size={28} color={colors.primary} />
                        <View style={styles.optionContent}>
                            <Text style={styles.optionTitle}>Wi-Fi</Text>
                            <Text style={styles.optionSubtitle}>Stable, longer range, same network</Text>
                        </View>
                        {connectionType === 'wifi' && (
                            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.optionButton,
                            connectionType === 'ble' && styles.optionSelected,
                        ]}
                        onPress={() => setConnectionType('ble')}
                    >
                        <Ionicons name="bluetooth" size={28} color={colors.primary} />
                        <View style={styles.optionContent}>
                            <Text style={styles.optionTitle}>Bluetooth (BLE)</Text>
                            <Text style={styles.optionSubtitle}>Direct, no network needed, short range</Text>
                        </View>
                        {connectionType === 'ble' && (
                            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Wi-Fi Setup */}
                {connectionType === 'wifi' && (
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Wi-Fi Settings</Text>

                        <View style={styles.inputContainer}>
                            <Ionicons name="globe-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                placeholder="Robot IP (e.g. 192.168.1.150)"
                                value={wifiIp}
                                onChangeText={setWifiIp}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { color: colors.text }]}
                                autoCapitalize="none"
                                keyboardType="numeric"
                            />
                        </View>

                        <Button
                            title={testing ? 'Testing...' : 'Test & Save'}
                            loading={testing}
                            disabled={testing || !wifiIp.trim()}
                            onPress={testWifiConnection}
                            variant="primary"
                            fullWidth
                            style={{ marginTop: 16 }}
                        />
                    </View>
                )}

                {/* Bluetooth Setup */}
                {connectionType === 'ble' && (
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Bluetooth Devices</Text>

                        <Button
                            title={isScanning ? 'Scanning...' : 'Scan for Robot'}
                            loading={isScanning}
                            disabled={isScanning}
                            onPress={startBleScan}
                            variant="primary"
                            fullWidth
                            style={{ marginBottom: 16 }}
                        />

                        {bleDevices.length > 0 ? (
                            <FlatList
                                data={bleDevices}
                                keyExtractor={(item) => item.id}
                                style={{ maxHeight: 240 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.bleDeviceItem,
                                            selectedBleDevice === item.id && styles.bleDeviceSelected,
                                        ]}
                                        onPress={() => connectToBleDevice(item)}
                                    >
                                        <Ionicons name="bluetooth" size={24} color={colors.primary} />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={{ color: colors.text, fontWeight: '600' }}>
                                                {item.name || 'Unnamed Device'}
                                            </Text>
                                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                                {item.id}
                                            </Text>
                                        </View>
                                        {selectedBleDevice === item.id && (
                                            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        ) : (
                            <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 }}>
                                {isScanning ? 'Searching...' : 'No devices found. Make sure robot is in pairing mode.'}
                            </Text>
                        )}

                        {selectedBleDevice && (
                            <Button
                                title={testing ? 'Connecting...' : 'Connect & Save'}
                                loading={testing}
                                onPress={() => connectToBleDevice(bleDevices.find(d => d.id === selectedBleDevice)!)}
                                disabled={testing}
                                variant="primary"
                                fullWidth
                                style={{ marginTop: 16 }}
                            />
                        )}
                    </View>
                )}

                {/* Status Message */}
                {statusMessage ? (
                    <View style={[styles.statusMessage, { backgroundColor: `${colors.primary}15` }]}>
                        <Text style={{ color: colors.primary, fontWeight: '500' }}>{statusMessage}</Text>
                    </View>
                ) : null}

                {/* Done Button */}
                <Button
                    title="Done"
                    icon="checkmark-circle"
                    onPress={() => router.back()}
                    variant="outline"
                    fullWidth
                    style={{ marginTop: 24 }}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    statusCard: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        marginBottom: 24,
        alignItems: 'center',
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusText: {
        fontSize: 15,
        fontWeight: '500',
    },
    card: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
        gap: 16,
    },
    optionSelected: {
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
    },
    optionContent: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    optionSubtitle: {
        fontSize: 13,
        color: '#6b7280',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 16,
    },
    inputIcon: {
        position: 'absolute',
        left: 16,
        zIndex: 1,
    },
    input: {
        flex: 1,
        borderRadius: 12,
        padding: 14,
        paddingLeft: 48,
        fontSize: 15,
        borderWidth: 1,
    },
    bleDeviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    bleDeviceSelected: {
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
    },
    statusMessage: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginVertical: 12,
    },
});