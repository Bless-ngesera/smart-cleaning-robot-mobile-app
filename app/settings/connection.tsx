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
    Dimensions,
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

    const { width } = Dimensions.get('window');
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

    const saveConnection = async (
        type: ConnectionType,
        ip?: string,
        bleId?: string
    ) => {
        await AsyncStorage.setItem(
            'robotConnection',
            JSON.stringify({ type, ip, bleId })
        );
        setConnectionType(type);
        Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
        );
    };

    const forgetConnection = async () => {
        await AsyncStorage.removeItem('robotConnection');
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
            const res = await fetch(`http://${wifiIp.trim()}/status`, {
                method: 'GET',
            });

            if (!res.ok) throw new Error();

            await saveConnection('wifi', wifiIp.trim());
            setStatusMessage('Wi-Fi connected ✓');
        } catch {
            Alert.alert('Failed', 'Could not reach robot');
        } finally {
            setTesting(false);
        }
    };

    const initBleManager = async () => {
        if (IS_EXPO_GO) {
            Alert.alert(
                'Bluetooth not supported in Expo Go',
                'Use Development Build'
            );
            return null;
        }

        if (bleManagerRef.current) return bleManagerRef.current;

        const { BleManager } = await import('react-native-ble-plx');
        bleManagerRef.current = new BleManager();
        return bleManagerRef.current;
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

        manager.startDeviceScan(null, null, (error, device) => {
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
        const manager = await initBleManager();
        if (!manager) return;

        setTesting(true);

        try {
            await manager.connectToDevice(device.id);
            await manager.discoverAllServicesAndCharacteristicsForDevice(
                device.id
            );

            await saveConnection('ble', undefined, device.id);
            setSelectedBleDevice(device.id);
            setStatusMessage('Bluetooth connected ✓');
        } catch {
            Alert.alert('Connection failed');
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
                                variant="destructive"
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

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 120,
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