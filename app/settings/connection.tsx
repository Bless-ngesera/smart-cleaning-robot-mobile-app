// app/settings/connection.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Platform,
    PermissionsAndroid,
    Animated,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import Loader from '../../src/components/Loader';
import AppText from '../../src/components/AppText';
import Button from '../../src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';

type ConnectionType = 'wifi' | 'ble' | 'none';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

export default function ConnectionScreen() {
    const { colors, darkMode } = useThemeContext();

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

    // Same as Dashboard
    const { width } = Dimensions.get('window');
    const isLargeScreen = width >= 768;

    // Design tokens matching Dashboard
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

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

    // Cleanup
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

    // Wi-Fi Test
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

    // BLE Helpers
    const initBleManager = async () => {
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

    const requestBlePermissions = async () => {
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
            await manager.discoverAllServicesAndCharacteristicsForDevice(device.id);

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
                            Connection Setup
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Connect to your Smart Cleaner Robot
                        </AppText>
                    </View>

                    {/* Instructions */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                            How to Connect
                        </AppText>
                        <View style={styles.instructionItem}>
                            <Ionicons name="wifi" size={24} color={colors.primary} />
                            <AppText style={[styles.instructionText, { color: textPrimary }]}>
                                Wi-Fi: Enter the robot's IP address (found in robot settings or router) and test.
                            </AppText>
                        </View>
                        <View style={styles.instructionItem}>
                            <Ionicons name="bluetooth" size={24} color={colors.primary} />
                            <AppText style={[styles.instructionText, { color: textPrimary }]}>
                                Bluetooth: Put robot in pairing mode → Scan → Connect (requires Development Build)
                            </AppText>
                        </View>
                    </View>

                    {/* Current Status */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                            Current Connection
                        </AppText>
                        <View style={styles.statusRow}>
                            <Ionicons
                                name={connectionType === 'wifi' ? 'wifi' : connectionType === 'ble' ? 'bluetooth' : 'wifi-off'}
                                size={32}
                                color={connectionType !== 'none' ? colors.primary : textSecondary}
                            />
                            <AppText style={[styles.statusText, { color: textPrimary }]}>
                                {connectionType === 'none'
                                    ? 'No connection saved'
                                    : connectionType === 'wifi'
                                        ? `Wi-Fi • ${wifiIp || 'Not set'}`
                                        : 'Bluetooth • Connected'}
                            </AppText>
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
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                            Choose Connection Method
                        </AppText>

                        <TouchableOpacity
                            style={[styles.option, connectionType === 'wifi' && styles.optionActive]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setConnectionType('wifi');
                            }}
                        >
                            <Ionicons name="wifi" size={24} color={colors.primary} />
                            <AppText style={[styles.optionText, { color: textPrimary }]}>Wi-Fi</AppText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.option, connectionType === 'ble' && styles.optionActive]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setConnectionType('ble');
                            }}
                        >
                            <Ionicons name="bluetooth" size={24} color={colors.primary} />
                            <AppText style={[styles.optionText, { color: textPrimary }]}>Bluetooth (Development Build only)</AppText>
                        </TouchableOpacity>
                    </View>

                    {/* Wi-Fi Section */}
                    {connectionType === 'wifi' && (
                        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                Wi-Fi Settings
                            </AppText>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="globe-outline" size={20} color={textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    placeholder="Robot IP (e.g. 192.168.1.150)"
                                    value={wifiIp}
                                    onChangeText={setWifiIp}
                                    placeholderTextColor={textSecondary}
                                    style={[styles.input, { color: textPrimary, borderColor: cardBorder }]}
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
                        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                Bluetooth Devices
                            </AppText>

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
                                            <AppText style={[styles.deviceName, { color: textPrimary }]}>
                                                {device.name || 'Unnamed Robot'}
                                            </AppText>
                                            <AppText style={{ color: textSecondary, fontSize: 12 }}>{device.id}</AppText>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <AppText style={[styles.emptyText, { color: textSecondary }]}>
                                    {isScanning ? 'Searching for robot...' : 'No devices found.\nMake sure robot is in pairing mode.'}
                                </AppText>
                            )}
                        </View>
                    )}

                    <Button
                        title="Done"
                        icon="checkmark-circle"
                        variant="outline"
                        onPress={() => router.back()}
                        fullWidth
                        style={{ marginTop: 24 }}
                    />
                </View>

                {/* Footer */}
                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>

            {/* Floating status */}
            {statusMessage && (
                <View style={[styles.floatingMessage, { backgroundColor: cardBg }]}>
                    <AppText style={{ color: textPrimary }}>{statusMessage}</AppText>
                </View>
            )}
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

    instructionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
    },
    instructionText: {
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },

    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '500',
    },

    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
    },
    optionActive: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}15`,
    },
    optionText: {
        fontSize: 16,
        marginLeft: 12,
    },

    inputWrapper: {
        position: 'relative',
        marginBottom: 16,
    },
    inputIcon: {
        position: 'absolute',
        left: 16,
        top: 16,
        zIndex: 1,
    },
    input: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        paddingLeft: 52,
        paddingRight: 16,
        fontSize: 16,
    },

    deviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
    },
    deviceActive: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}15`,
    },
    deviceName: {
        fontSize: 16,
        fontWeight: '500',
    },
    emptyText: {
        textAlign: 'center',
        paddingVertical: 40,
        lineHeight: 22,
    },

    floatingMessage: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});