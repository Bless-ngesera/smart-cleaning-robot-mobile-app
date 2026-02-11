// app/settings/connection.tsx
import React, { useEffect, useRef, useState } from 'react';
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

/* ────────────────────────────────────────────── */
/* Expo-safe BLE guard (prevents Expo Go crash)   */
/* ────────────────────────────────────────────── */
const BLE_AVAILABLE = Constants.appOwnership !== 'expo';

let BleManager: any;
let bleManager: any = null;

if (BLE_AVAILABLE) {
    // === C++ BRIDGE POINT ===
    // If using native C++ for BLE, replace 'react-native-ble-plx' with your bridge module
    // Android (JNI): const ble = require('your-native-bridge');
    // iOS (Obj-C++): const ble = require('your-native-bridge');
    const ble = require('react-native-ble-plx');
    BleManager = ble.BleManager;
    bleManager = new BleManager();
}

type ConnectionType = 'wifi' | 'ble' | 'none';

export default function ConnectionScreen() {
    const { colors } = useThemeContext();
    const [connectionType, setConnectionType] = useState<ConnectionType>('none');
    const [wifiIp, setWifiIp] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [bleDevices, setBleDevices] = useState<any[]>([]);
    const [selectedBleDevice, setSelectedBleDevice] = useState<string | null>(null);
    const [testing, setTesting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [fadeAnim] = useState(new Animated.Value(0));
    const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();

        (async () => {
            try {
                const saved = await AsyncStorage.getItem('robotConnection');
                if (saved) {
                    const { type, ip, bleId } = JSON.parse(saved);
                    setConnectionType(type);
                    if (type === 'wifi') setWifiIp(ip ?? '');
                    if (type === 'ble') setSelectedBleDevice(bleId ?? null);
                }
            } catch {}
        })();

        return () => {
            scanTimeoutRef.current && clearTimeout(scanTimeoutRef.current);
            if (BLE_AVAILABLE) bleManager?.destroy?.();
        };
    }, []);

    const saveConnection = async (type: ConnectionType, ip?: string, bleId?: string) => {
        try {
            await AsyncStorage.setItem('robotConnection', JSON.stringify({ type, ip, bleId }));
            setConnectionType(type);
            setStatusMessage(type === 'wifi' ? 'Wi-Fi saved' : 'Bluetooth saved');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Error', 'Could not save connection');
        }
    };

    const forgetConnection = () => {
        Alert.alert('Forget Connection', 'Remove saved connection?', [
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

    /* ────────────────────────────────────────────── */
    /* Wi-Fi test (real endpoint)                     */
    /* ────────────────────────────────────────────── */
    const testWifiConnection = async () => {
        if (!wifiIp.trim()) {
            Alert.alert('Missing IP', 'Enter robot IP address');
            return;
        }
        setTesting(true);
        setStatusMessage('Testing Wi-Fi...');
        try {
            // === C++ BRIDGE / REAL IMPLEMENTATION POINT ===
            // Replace with your robot's real HTTP endpoint
            // Example: http://192.168.1.150/status or /api/health
            // C++ bridge call example:
            // Android (JNI): await RobotBridge.testWifiConnection(wifiIp)
            // iOS (Obj-C++): await [RobotBridge testWifiConnection:wifiIp]
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 7000);
            const res = await fetch(`http://${wifiIp.trim()}/status`, {
                method: 'GET',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await saveConnection('wifi', wifiIp.trim());
            setStatusMessage('Wi-Fi connected!');
        } catch (err: any) {
            console.warn('Wi-Fi test failed:', err);
            Alert.alert(
                'Connection Failed',
                err.name === 'AbortError' ? 'Timeout – robot not responding' : 'Cannot reach robot'
            );
            setStatusMessage('');
        } finally {
            setTesting(false);
        }
    };

    /* ────────────────────────────────────────────── */
    /* BLE Permissions (Android only)                 */
    /* ────────────────────────────────────────────── */
    const requestBlePermissions = async () => {
        if (Platform.OS !== 'android') return true;
        const perms =
            Platform.Version >= 31
                ? [
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                ]
                : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
        const res = await PermissionsAndroid.requestMultiple(perms);
        return Object.values(res).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
    };

    /* ────────────────────────────────────────────── */
    /* BLE Scan (only if native build)                */
    /* ────────────────────────────────────────────── */
    const startBleScan = async () => {
        if (!BLE_AVAILABLE) {
            Alert.alert('Not available', 'Bluetooth requires a development or production build (not Expo Go)');
            return;
        }
        if (!(await requestBlePermissions())) return;
        setBleDevices([]);
        setIsScanning(true);
        setStatusMessage('Scanning for robot…');
        bleManager.startDeviceScan(null, null, (_: any, device: any) => {
            if (!device?.name) return;
            if (!device.name.toLowerCase().includes('cleaner') && !device.name.toLowerCase().includes('robot')) return;
            setBleDevices(prev =>
                prev.some(d => d.id === device.id) ? prev : [...prev, device]
            );
        });
        scanTimeoutRef.current = setTimeout(() => {
            bleManager.stopDeviceScan();
            setIsScanning(false);
            setStatusMessage(bleDevices.length ? '' : 'No robot found');
        }, 12000);
    };

    /* ────────────────────────────────────────────── */
    /* BLE Connect                                    */
    /* ────────────────────────────────────────────── */
    const connectToBleDevice = async (device: any) => {
        if (!BLE_AVAILABLE) return;
        setTesting(true);
        setStatusMessage(`Connecting to ${device.name || device.id}...`);
        try {
            // === C++ BRIDGE / REAL IMPLEMENTATION POINT ===
            // Replace with native call for better performance & reliability
            // Android (JNI): await RobotBridge.connectBle(device.id)
            // iOS (Obj-C++): await [RobotBridge connectBleWithId:device.id]
            await bleManager.connectToDevice(device.id);
            await saveConnection('ble', undefined, device.id);
            setSelectedBleDevice(device.id);
            setStatusMessage('Connected!');
        } catch {
            Alert.alert('Failed', 'Could not connect to robot');
            setStatusMessage('');
        } finally {
            setTesting(false);
        }
    };
    const disconnectBle = async () => {
        if (!selectedBleDevice || !BLE_AVAILABLE) return;
        try {
            await bleManager.cancelDeviceConnection(selectedBleDevice);
            await AsyncStorage.removeItem('robotConnection');
            setConnectionType('none');
            setSelectedBleDevice(null);
            setStatusMessage('Disconnected');
        } catch {}
    };
    /* ────────────────────────────────────────────── */
    /* UI                                             */
    /* ────────────────────────────────────────────── */
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Connection Setup" subtitle="Smart Cleaner Pro" />
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* How to Connect Orientation */}
                    <LinearGradient
                        colors={['#10B98110', '#10B98105']}
                        style={[styles.card, { backgroundColor: colors.card }]}
                    >
                        <Text style={[styles.cardTitle, { color: colors.text }]}>How to Connect</Text>
                        <View style={styles.instructionItem}>
                            <Ionicons name="wifi" size={24} color={colors.primary} />
                            <Text style={[styles.instructionText, { color: colors.text }]}>
                                Wi-Fi: Find your robot's IP in its settings or router app. Enter it below and test.
                            </Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <Ionicons name="bluetooth" size={24} color={colors.primary} />
                            <Text style={[styles.instructionText, { color: colors.text }]}>
                                Bluetooth: Turn on robot pairing mode. Scan, select, and connect.
                            </Text>
                        </View>
                        <Text style={[styles.instructionNote, { color: colors.textSecondary }]}>
                            Tip: Ensure robot is charged and nearby for Bluetooth.
                        </Text>
                    </LinearGradient>

                    {/* Current Status */}
                    <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.statusTitle, { color: colors.text }]}>Status</Text>
                        <View style={styles.statusRow}>
                            <Ionicons
                                name={connectionType === 'wifi' ? 'wifi' : connectionType === 'ble' ? 'bluetooth' : 'wifi-off'}
                                size={28}
                                color={connectionType !== 'none' ? colors.primary : colors.textSecondary}
                            />
                            <Text style={[styles.statusText, { color: colors.text }]}>
                                {connectionType === 'none'
                                    ? 'Disconnected'
                                    : connectionType === 'wifi'
                                        ? `Wi-Fi (${wifiIp || '—'})`
                                        : 'Bluetooth'}
                            </Text>
                        </View>
                        {connectionType !== 'none' && (
                            <Button
                                title="Forget Connection"
                                variant="destructive"
                                size="small"
                                onPress={forgetConnection}
                                style={{ marginTop: 12 }}
                            />
                        )}
                    </View>
                    {/* Choose Method */}
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Connection Method</Text>
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
                            <Text style={[styles.optionText, { color: colors.text }]}>Bluetooth</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Wi-Fi Section */}
                    {connectionType === 'wifi' && (
                        <View style={[styles.card, { backgroundColor: colors.card }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Wi-Fi Settings</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="globe-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    placeholder="Robot IP (e.g. 192.168.1.100)"
                                    value={wifiIp}
                                    onChangeText={setWifiIp}
                                    placeholderTextColor={colors.textSecondary}
                                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                    keyboardType="numeric"
                                    autoCapitalize="none"
                                />
                            </View>
                            <Button
                                title={testing ? 'Testing...' : 'Test & Save'}
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
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bluetooth</Text>
                            <Button
                                title={isScanning ? 'Scanning...' : 'Scan for Robot'}
                                loading={isScanning}
                                disabled={isScanning || testing}
                                onPress={startBleScan}
                                fullWidth
                                style={{ marginBottom: 16 }}
                            />
                            {bleDevices.length > 0 ? (
                                <FlatList
                                    data={bleDevices}
                                    keyExtractor={d => d.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.deviceItem,
                                                selectedBleDevice === item.id && styles.deviceActive,
                                            ]}
                                            onPress={() => connectToBleDevice(item)}
                                        >
                                            <Ionicons name="bluetooth" size={20} color={colors.primary} />
                                            <Text style={[styles.deviceName, { color: colors.text }]}>
                                                {item.name || 'Unnamed Device'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            ) : (
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    {isScanning ? 'Searching...' : 'No devices found'}
                                </Text>
                            )}
                        </View>
                    )}
                    {/* Done */}
                    <Button
                        title="Done"
                        icon="checkmark-circle"
                        variant="outline"
                        onPress={() => router.back()}
                        fullWidth
                        style={{ marginTop: 24 }}
                    />
                </ScrollView>
                {/* Floating Status Message */}
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
    scrollContent: { padding: 20, paddingBottom: 80 },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    instructionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
    instructionText: { fontSize: 14, lineHeight: 20, flex: 1 },
    instructionNote: { fontSize: 13, fontStyle: 'italic', marginTop: 8 },
    statusCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statusTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    statusText: { fontSize: 16, fontWeight: '500' },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 8,
    },
    optionActive: { backgroundColor: '#10B98110' },
    optionText: { fontSize: 16, marginLeft: 12 },
    inputWrapper: { position: 'relative', marginBottom: 16 },
    inputIcon: { position: 'absolute', left: 16, top: 16, zIndex: 1 },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        paddingLeft: 48,
        fontSize: 16,
    },
    deviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
    },
    deviceActive: { backgroundColor: '#10B98110' },
    deviceName: { fontSize: 16, marginLeft: 12 },
    emptyText: { fontSize: 16, textAlign: 'center', paddingVertical: 20 },
    floatingMessage: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
});