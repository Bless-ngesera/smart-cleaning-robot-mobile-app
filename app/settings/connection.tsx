// app/settings/connection.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Platform,
    PermissionsAndroid,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import Header from '../../src/components/Header';
import Button from '../../src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';

type ConnectionType = 'wifi' | 'ble' | 'none';

// ====================== BLE CONFIG ======================
// This screen REQUIRES a Development Build (not Expo Go)
const IS_EXPO_GO = Constants.appOwnership === 'expo';

export default function ConnectionScreen() {
    const { colors } = useThemeContext();

    const [connectionType, setConnectionType] = useState<ConnectionType>('none');
    const [wifiIp, setWifiIp] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [bleDevices, setBleDevices] = useState<any[]>([]);
    const [selectedBleDevice, setSelectedBleDevice] = useState<string | null>(null);
    const [testing, setTesting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const bleManagerRef = useRef<any>(null);
    const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load saved connection
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

        (async () => {
            try {
                const saved = await AsyncStorage.getItem('robotConnection');
                if (saved) {
                    const { type, ip, bleId } = JSON.parse(saved);
                    setConnectionType(type);
                    if (type === 'wifi') setWifiIp(ip ?? '');
                    if (type === 'ble') setSelectedBleDevice(bleId ?? null);
                }
            } catch (e) {
                console.warn('Failed to load saved connection', e);
            }
        })();
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            scanTimeoutRef.current && clearTimeout(scanTimeoutRef.current);
            if (bleManagerRef.current) {
                try {
                    bleManagerRef.current.stopDeviceScan?.();
                    bleManagerRef.current.destroy?.();
                } catch {}
            }
        };
    }, []);

    const saveConnection = async (type: ConnectionType, ip?: string, bleId?: string) => {
        try {
            await AsyncStorage.setItem('robotConnection', JSON.stringify({ type, ip, bleId }));
            setConnectionType(type);
            setStatusMessage(type === 'wifi' ? 'Wi-Fi connection saved ✓' : 'Bluetooth connection saved ✓');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Error', 'Failed to save connection');
        }
    };

    const forgetConnection = () => {
        Alert.alert('Forget Connection?', 'This will remove the saved robot connection.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Forget',
                style: 'destructive',
                onPress: async () => {
                    await AsyncStorage.removeItem('robotConnection');
                    setConnectionType('none');
                    setWifiIp('');
                    setSelectedBleDevice(null);
                    setStatusMessage('Connection forgotten');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                },
            },
        ]);
    };

    // ==================== Wi-Fi ====================
    const testWifiConnection = async () => {
        if (!wifiIp.trim()) {
            Alert.alert('Missing IP', 'Please enter the robot IP address');
            return;
        }

        setTesting(true);
        setStatusMessage('Testing connection to robot...');

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const res = await fetch(`http://${wifiIp.trim()}/status`, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!res.ok) throw new Error(`Robot returned ${res.status}`);

            const data = await res.json().catch(() => ({}));
            console.log('Robot status:', data);

            await saveConnection('wifi', wifiIp.trim());
            setStatusMessage('✅ Successfully connected via Wi-Fi');
        } catch (err: any) {
            console.warn('Wi-Fi test failed:', err);
            Alert.alert(
                'Connection Failed',
                err.name === 'AbortError' ? 'Timeout – Robot not responding' : 'Could not reach robot. Check IP and network.'
            );
            setStatusMessage('');
        } finally {
            setTesting(false);
        }
    };

    // ==================== BLE ====================
    const initBleManager = async (): Promise<any | null> => {
        if (IS_EXPO_GO) {
            Alert.alert('Not Supported', 'Bluetooth requires a Development Build.\n\nRun:\nnpx expo run:android\nor\nnpx expo run:ios');
            return null;
        }

        if (bleManagerRef.current) return bleManagerRef.current;

        try {
            const { BleManager } = await import('react-native-ble-plx');
            bleManagerRef.current = new BleManager();
            return bleManagerRef.current;
        } catch (e) {
            Alert.alert('BLE Error', 'Failed to load Bluetooth library. Make sure you are using a Development Build.');
            return null;
        }
    };

    const requestBlePermissions = async (): Promise<boolean> => {
        if (Platform.OS !== 'android') return true;

        const perms = Platform.Version >= 31
            ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
            : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

        const granted = await PermissionsAndroid.requestMultiple(perms);
        return Object.values(granted).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
    };

    const startBleScan = useCallback(async () => {
        const manager = await initBleManager();
        if (!manager) return;

        const hasPerms = await requestBlePermissions();
        if (!hasPerms) return;

        setBleDevices([]);
        setIsScanning(true);
        setStatusMessage('Scanning for Smart Cleaner Robot...');

        manager.startDeviceScan(null, null, (error: any, device: any) => {
            if (error) {
                console.error('Scan error:', error);
                return;
            }
            if (!device?.name) return;
            if (!device.name.toLowerCase().includes('clean') && !device.name.toLowerCase().includes('robot')) return;

            setBleDevices(prev => prev.some(d => d.id === device.id) ? prev : [...prev, device]);
        });

        scanTimeoutRef.current = setTimeout(() => {
            manager.stopDeviceScan();
            setIsScanning(false);
            setStatusMessage(bleDevices.length === 0 ? 'No robot found. Make sure it is in pairing mode.' : '');
        }, 15000);
    }, [bleDevices.length]);

    const connectToBleDevice = async (device: any) => {
        const manager = await initBleManager();
        if (!manager) return;

        setTesting(true);
        setStatusMessage(`Connecting to ${device.name || device.id}...`);

        try {
            await manager.connectToDevice(device.id);
            await manager.discoverAllServicesAndCharacteristicsForDevice(device.id); // optional but recommended

            await saveConnection('ble', undefined, device.id);
            setSelectedBleDevice(device.id);
            setStatusMessage('✅ Bluetooth connected successfully');
        } catch (err) {
            Alert.alert('Connection Failed', 'Could not connect to the robot. Try again.');
            setStatusMessage('');
        } finally {
            setTesting(false);
        }
    };

    const disconnectBle = async () => {
        if (!selectedBleDevice || !bleManagerRef.current) return;

        try {
            await bleManagerRef.current.cancelDeviceConnection(selectedBleDevice);
            await AsyncStorage.removeItem('robotConnection');
            setConnectionType('none');
            setSelectedBleDevice(null);
            setStatusMessage('Disconnected');
        } catch {}
    };

    // ==================== UI ====================
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Connection Setup" subtitle="Smart Cleaner Pro" />

            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Instructions */}
                    <LinearGradient colors={['#10B98110', '#10B98105']} style={[styles.card, { backgroundColor: colors.card }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>How to Connect</Text>
                        <View style={styles.instructionItem}>
                            <Ionicons name="wifi" size={24} color={colors.primary} />
                            <Text style={[styles.instructionText, { color: colors.text }]}>
                                Wi-Fi: Enter the robot's IP address (found in robot settings or router) and test.
                            </Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <Ionicons name="bluetooth" size={24} color={colors.primary} />
                            <Text style={[styles.instructionText, { color: colors.text }]}>
                                Bluetooth: Put robot in pairing mode → Scan → Connect
                            </Text>
                        </View>
                    </LinearGradient>

                    {/* Current Status */}
                    <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.statusTitle, { color: colors.text }]}>Current Connection</Text>
                        <View style={styles.statusRow}>
                            <Ionicons
                                name={connectionType === 'wifi' ? 'wifi' : connectionType === 'ble' ? 'bluetooth' : 'wifi-off'}
                                size={32}
                                color={connectionType !== 'none' ? colors.primary : colors.textSecondary}
                            />
                            <Text style={[styles.statusText, { color: colors.text }]}>
                                {connectionType === 'none'
                                    ? 'No connection saved'
                                    : connectionType === 'wifi'
                                        ? `Wi-Fi • ${wifiIp}`
                                        : 'Bluetooth • Connected'}
                            </Text>
                        </View>

                        {connectionType !== 'none' && (
                            <Button title="Forget Connection" variant="destructive" size="small" onPress={forgetConnection} style={{ marginTop: 12 }} />
                        )}
                    </View>

                    {/* Choose Method */}
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Choose Connection Method</Text>

                        <TouchableOpacity
                            style={[styles.option, connectionType === 'wifi' && styles.optionActive]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setConnectionType('wifi');
                            }}
                        >
                            <Ionicons name="wifi" size={24} color={colors.primary} />
                            <Text style={[styles.optionText, { color: colors.text }]}>Wi-Fi</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.option, connectionType === 'ble' && styles.optionActive]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setConnectionType('ble');
                            }}
                        >
                            <Ionicons name="bluetooth" size={24} color={colors.primary} />
                            <Text style={[styles.optionText, { color: colors.text }]}>Bluetooth (Development Build only)</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Wi-Fi Section */}
                    {connectionType === 'wifi' && (
                        <View style={[styles.card, { backgroundColor: colors.card }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Wi-Fi Settings</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="globe-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    placeholder="Robot IP (e.g. 192.168.1.150)"
                                    value={wifiIp}
                                    onChangeText={setWifiIp}
                                    placeholderTextColor={colors.textSecondary}
                                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                    keyboardType="numeric"
                                    autoCapitalize="none"
                                />
                            </View>
                            <Button
                                title={testing ? 'Testing...' : 'Test & Save Connection'}
                                loading={testing}
                                disabled={testing || !wifiIp.trim()}
                                onPress={testWifiConnection}
                                fullWidth
                            />
                        </View>
                    )}

                    {/* BLE Section */}
                    {connectionType === 'ble' && (
                        <View style={[styles.card, { backgroundColor: colors.card }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bluetooth Devices</Text>

                            <Button
                                title={isScanning ? 'Scanning...' : 'Scan for Robot'}
                                loading={isScanning}
                                disabled={isScanning || testing}
                                onPress={startBleScan}
                                fullWidth
                                style={{ marginBottom: 16 }}
                            />

                            {bleDevices.length > 0 ? (
                                bleDevices.map(device => (
                                    <TouchableOpacity
                                        key={device.id}
                                        style={[styles.deviceItem, selectedBleDevice === device.id && styles.deviceActive]}
                                        onPress={() => connectToBleDevice(device)}
                                    >
                                        <Ionicons name="bluetooth" size={22} color={colors.primary} />
                                        <View style={{ marginLeft: 12 }}>
                                            <Text style={[styles.deviceName, { color: colors.text }]}>
                                                {device.name || 'Unnamed Robot'}
                                            </Text>
                                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{device.id}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    {isScanning ? 'Searching for robot...' : 'No devices found.\nMake sure robot is in pairing mode.'}
                                </Text>
                            )}
                        </View>
                    )}

                    <Button title="Done" icon="checkmark-circle" variant="outline" onPress={() => router.back()} fullWidth style={{ marginTop: 24 }} />
                </ScrollView>

                {/* Floating status */}
                {statusMessage && (
                    <View style={[styles.floatingMessage, { backgroundColor: colors.card }]}>
                        <Text style={{ color: colors.text }}>{statusMessage}</Text>
                    </View>
                )}
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 100 },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
    instructionItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
    instructionText: { fontSize: 14, lineHeight: 20, flex: 1 },
    statusCard: { borderRadius: 16, padding: 16, alignItems: 'center' },
    statusTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    statusText: { fontSize: 16, fontWeight: '500' },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#ffffff08',
    },
    optionActive: { backgroundColor: '#10B98115' },
    optionText: { fontSize: 16, marginLeft: 12 },
    inputWrapper: { position: 'relative', marginBottom: 16 },
    inputIcon: { position: 'absolute', left: 16, top: 16, zIndex: 1 },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        paddingLeft: 52,
        fontSize: 16,
    },
    deviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#ffffff08',
    },
    deviceActive: { backgroundColor: '#10B98120' },
    deviceName: { fontSize: 16, fontWeight: '500' },
    emptyText: { textAlign: 'center', paddingVertical: 40, lineHeight: 22 },
    floatingMessage: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
});