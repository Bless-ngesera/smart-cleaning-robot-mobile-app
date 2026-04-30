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
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import AppText from '../../src/components/AppText';
import Button from '../../src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import {
    connectWifi,
    connectBle,
    disconnectRobot,
} from '@/src/services/robotService';

type ConnectionType = 'wifi' | 'ble' | 'none';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

export default function ConnectionScreen() {
    const { colors, darkMode } = useThemeContext();

    const [connectionType, setConnectionType] =
        useState<ConnectionType>('none');
    const [wifiIp, setWifiIp] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [bleDevices, setBleDevices] = useState<any[]>([]);
    const [selectedBleDevice, setSelectedBleDevice] = useState<string | null>(
        null
    );
    const [testing, setTesting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const bleManagerRef = useRef<any>(null);
    const scanTimeoutRef = useRef<any>(null);

    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode
        ? 'rgba(255,255,255,0.7)'
        : 'rgba(0,0,0,0.60)';

    useEffect(() => {
        (async () => {
            const saved = await AsyncStorage.getItem('robotConnection');
            if (!saved) return;

            const { type, ip, bleId } = JSON.parse(saved);
            setConnectionType(type);
            if (type === 'wifi') setWifiIp(ip ?? '');
            if (type === 'ble') setSelectedBleDevice(bleId ?? null);
        })();
    }, []);

    useEffect(() => {
        return () => {
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
            if (bleManagerRef.current) {
                bleManagerRef.current.stopDeviceScan?.();
                bleManagerRef.current.destroy?.();
            }
        };
    }, []);

    const forgetConnection = async () => {
        await disconnectRobot();
        setConnectionType('none');
        setWifiIp('');
        setSelectedBleDevice(null);
        setStatusMessage('Connection removed');
    };

    const testWifiConnection = async () => {
        if (!wifiIp.trim()) {
            Alert.alert('Enter IP address');
            return;
        }

        setTesting(true);

        try {
            // connectWifi reaches the robot, confirms status, and persists the connection
            const status = await connectWifi(wifiIp.trim());
            setConnectionType('wifi');
            setStatusMessage(`Wi-Fi connected ✓  Battery: ${status.batteryLevel}%`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Failed', 'Could not reach robot at that IP address');
        } finally {
            setTesting(false);
        }
    };

    const initBleManager = async () => {
        if (Platform.OS === 'web' || IS_EXPO_GO) {
            Alert.alert(
                'Bluetooth not supported',
                'Bluetooth requires a native device build, not Expo Go or web.'
            );
            return null;
        }

        if (bleManagerRef.current) return bleManagerRef.current;

        try {
            const { BleManager } = await import('react-native-ble-plx');
            bleManagerRef.current = new BleManager();
            return bleManagerRef.current;
        } catch {
            Alert.alert('Bluetooth unavailable', 'BLE is not available in this environment.');
            return null;
        }
    };

    const startBleScan = useCallback(async () => {
        const manager = await initBleManager();
        if (!manager) return;

        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                Alert.alert('Permission required');
                return;
            }
        }

        setBleDevices([]);
        setIsScanning(true);

        manager.startDeviceScan(null, null, (error: any, device: any) => {
            if (error) return;
            if (!device?.name) return;

            if (
                device.name.toLowerCase().includes('robot') ||
                device.name.toLowerCase().includes('clean')
            ) {
                setBleDevices(prev =>
                    prev.some(d => d.id === device.id)
                        ? prev
                        : [...prev, device]
                );
            }
        });

        scanTimeoutRef.current = setTimeout(() => {
            manager.stopDeviceScan();
            setIsScanning(false);
        }, 15000);
    }, []);

    const connectToBleDevice = async (device: any) => {
        setTesting(true);

        // Stop the local scan before delegating to robotService
        if (bleManagerRef.current) {
            bleManagerRef.current.stopDeviceScan?.();
        }
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        setIsScanning(false);

        try {
            // connectBle handles the GATT connect, service discovery, and AsyncStorage persistence
            const status = await connectBle(device.id);
            setSelectedBleDevice(device.id);
            setConnectionType('ble');
            setStatusMessage(`Bluetooth connected ✓  Battery: ${status.batteryLevel}%`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Connection failed', 'Could not connect to this device');
        } finally {
            setTesting(false);
        }
    };

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && { alignItems: 'center' },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View
                    style={[
                        styles.wrapper,
                        isLargeScreen && { maxWidth: 480 },
                    ]}
                >
                    {/* Back Navigation */}
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={28} color={colors.primary} />
                    </TouchableOpacity>

                    <AppText
                        style={[styles.title, { color: textPrimary }]}
                    >
                        Connection Setup
                    </AppText>

                    <View
                        style={[
                            styles.card,
                            { backgroundColor: cardBg, borderColor: cardBorder },
                        ]}
                    >
                        <AppText style={{ color: textPrimary }}>
                            Current: {connectionType}
                        </AppText>

                        {connectionType !== 'none' && (
                            <Button
                                title="Forget"
                                variant="danger"
                                onPress={forgetConnection}
                                style={{ marginTop: 12 }}
                            />
                        )}
                    </View>

                    <View
                        style={[
                            styles.card,
                            { backgroundColor: cardBg, borderColor: cardBorder },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.option}
                            onPress={() => setConnectionType('wifi')}
                        >
                            <Ionicons
                                name="wifi"
                                size={22}
                                color={colors.primary}
                            />
                            <AppText
                                style={[
                                    styles.optionText,
                                    { color: textPrimary },
                                ]}
                            >
                                Wi-Fi
                            </AppText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.option}
                            onPress={() => setConnectionType('ble')}
                        >
                            <Ionicons
                                name="bluetooth"
                                size={22}
                                color={colors.primary}
                            />
                            <AppText
                                style={[
                                    styles.optionText,
                                    { color: textPrimary },
                                ]}
                            >
                                Bluetooth
                            </AppText>
                        </TouchableOpacity>
                    </View>

                    {connectionType === 'wifi' && (
                        <View
                            style={[
                                styles.card,
                                {
                                    backgroundColor: cardBg,
                                    borderColor: cardBorder,
                                },
                            ]}
                        >
                            <TextInput
                                placeholder="192.168.1.150"
                                value={wifiIp}
                                onChangeText={setWifiIp}
                                placeholderTextColor={textSecondary}
                                style={[
                                    styles.input,
                                    { color: textPrimary, borderColor: cardBorder },
                                ]}
                                allowFontScaling={false}
                            />

                            <Button
                                title="Test & Save"
                                onPress={testWifiConnection}
                                loading={testing}
                                fullWidth
                            />
                        </View>
                    )}

                    {connectionType === 'ble' && (
                        <View
                            style={[
                                styles.card,
                                {
                                    backgroundColor: cardBg,
                                    borderColor: cardBorder,
                                },
                            ]}
                        >
                            <Button
                                title="Scan"
                                onPress={startBleScan}
                                loading={isScanning}
                                fullWidth
                            />

                            {bleDevices.map(device => (
                                <TouchableOpacity
                                    key={device.id}
                                    style={styles.device}
                                    onPress={() =>
                                        connectToBleDevice(device)
                                    }
                                >
                                    <AppText style={{ color: textPrimary }}>
                                        {device.name}
                                    </AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <Button
                        title="Done"
                        variant="outline"
                        onPress={() => router.back()}
                        fullWidth
                        style={{ marginTop: 24 }}
                    />
                </View>
            </ScrollView>

            {statusMessage ? (
                <View
                    style={[
                        styles.floating,
                        { backgroundColor: cardBg },
                    ]}
                >
                    <AppText style={{ color: textPrimary }}>
                        {statusMessage}
                    </AppText>
                </View>
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: 16,
    },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 80,
    },

    wrapper: { width: '100%' },

    title: {
        fontSize: 30,
        fontWeight: '800',
        marginBottom: 24,
    },

    card: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        marginBottom: 20,
    },

    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },

    optionText: {
        fontSize: 16,
        marginLeft: 12,
    },

    input: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        marginBottom: 16,
        fontSize: 16,
        fontFamily: 'SF-Pro-Display-Regular',
    },

    device: {
        paddingVertical: 12,
    },

    floating: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
});