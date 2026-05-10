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
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useAppNavigation } from '@/hooks/useAppNavigation';

import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import {
    connectWifi,
    connectBle,
    disconnectRobot,
} from '@/src/services/robotService';

type ConnectionType = 'wifi' | 'ble' | 'none';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Local Button component with proper theme contrast
const ThemedButton = ({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    fullWidth = false,
    style,
}: {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'danger' | 'outline';
    loading?: boolean;
    fullWidth?: boolean;
    style?: any;
}) => {
    const { colors, darkMode } = useThemeContext();
    let bgColor = colors.primary;
    let textColor = '#FFFFFF';
    let borderColor = 'transparent';

    if (variant === 'danger') {
        bgColor = colors.error || '#dc2626';
        textColor = '#FFFFFF';
    } else if (variant === 'outline') {
        bgColor = 'transparent';
        textColor = colors.primary;
        borderColor = colors.primary;
    } else {
        bgColor = colors.primary;
        textColor = '#FFFFFF';
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={loading}
            style={[
                styles.button,
                {
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    borderWidth: variant === 'outline' ? 1 : 0,
                },
                fullWidth && { width: '100%' },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={textColor} />
            ) : (
                <AppText style={[styles.buttonText, { color: textColor }]}>
                    {title}
                </AppText>
            )}
        </TouchableOpacity>
    );
};

export default function ConnectionScreen() {
  const { push, back, replace } = useAppNavigation();
    const { colors, darkMode } = useThemeContext();

    const [connectionType, setConnectionType] = useState<ConnectionType>('none');
    const [wifiIp, setWifiIp] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [bleDevices, setBleDevices] = useState<any[]>([]);
    const [selectedBleDevice, setSelectedBleDevice] = useState<string | null>(null);
    const [testing, setTesting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const bleManagerRef = useRef<any>(null);
    const scanTimeoutRef = useRef<any>(null);
    const toastTimeoutRef = useRef<any>(null);

    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';

    // Show temporary message (auto‑dismiss after 6 seconds)
    const showToast = useCallback((msg: string) => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToastMessage(msg);
        toastTimeoutRef.current = setTimeout(() => {
            setToastMessage(null);
        }, 6000);
    }, []);

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
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
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
        showToast('Connection removed');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const testWifiConnection = async () => {
        if (!wifiIp.trim()) {
            Alert.alert('Enter IP address');
            return;
        }

        setTesting(true);
        try {
            const status = await connectWifi(wifiIp.trim());
            setConnectionType('wifi');
            showToast(`Wi-Fi connected ✓  Battery: ${status.batteryLevel}%`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            Alert.alert('Failed', error?.message || 'Could not reach robot at that IP address');
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
                Alert.alert('Permission required', 'Location permission is needed to scan for Bluetooth devices.');
                return;
            }
        }

        setBleDevices([]);
        setIsScanning(true);
        showToast('Scanning for robots...');

        manager.startDeviceScan(null, null, (error: any, device: any) => {
            if (error) return;
            if (!device?.name) return;
            if (device.name.toLowerCase().includes('robot') || device.name.toLowerCase().includes('clean')) {
                setBleDevices(prev => (prev.some(d => d.id === device.id) ? prev : [...prev, device]));
            }
        });

        scanTimeoutRef.current = setTimeout(() => {
            manager.stopDeviceScan();
            setIsScanning(false);
            if (bleDevices.length === 0) showToast('No robots found. Make sure your device is advertising.');
        }, 15000);
    }, []);

    const connectToBleDevice = async (device: any) => {
        setTesting(true);
        if (bleManagerRef.current) bleManagerRef.current.stopDeviceScan?.();
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        setIsScanning(false);

        try {
            const status = await connectBle(device.id);
            setSelectedBleDevice(device.id);
            setConnectionType('ble');
            showToast(`Bluetooth connected ✓  Battery: ${status.batteryLevel}%`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            Alert.alert('Connection failed', error?.message || 'Could not connect to this device');
        } finally {
            setTesting(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && { alignItems: 'center' },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && { maxWidth: 480 }]}>
                    {/* Back button */}
                    <TouchableOpacity style={styles.backButton} onPress={() => back()}>
                        <Ionicons name="chevron-back" size={28} color={colors.primary} />
                    </TouchableOpacity>

                    <AppText style={[styles.title, { color: textPrimary }]}>
                        Connection Setup
                    </AppText>

                    {/* Current connection card */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <AppText style={{ color: textPrimary, marginBottom: 8 }}>
                            Current: {connectionType === 'none' ? 'Not connected' : connectionType}
                        </AppText>
                        {connectionType !== 'none' && (
                            <ThemedButton title="Forget" variant="danger" onPress={forgetConnection} />
                        )}
                    </View>

                    {/* Connection method selection */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <TouchableOpacity style={styles.option} onPress={() => setConnectionType('wifi')}>
                            <Ionicons name="wifi" size={22} color={colors.primary} />
                            <AppText style={[styles.optionText, { color: textPrimary }]}>Wi-Fi</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.option} onPress={() => setConnectionType('ble')}>
                            <Ionicons name="bluetooth" size={22} color={colors.primary} />
                            <AppText style={[styles.optionText, { color: textPrimary }]}>Bluetooth</AppText>
                        </TouchableOpacity>
                    </View>

                    {/* Wi‑Fi panel */}
                    {connectionType === 'wifi' && (
                        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <TextInput
                                placeholder="192.168.1.150"
                                value={wifiIp}
                                onChangeText={setWifiIp}
                                placeholderTextColor={textSecondary}
                                style={[styles.input, { color: textPrimary, borderColor: cardBorder }]}
                                autoCapitalize="none"
                            />
                            <ThemedButton title="Test & Save" onPress={testWifiConnection} loading={testing} fullWidth />
                        </View>
                    )}

                    {/* Bluetooth panel */}
                    {connectionType === 'ble' && (
                        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <ThemedButton title="Scan" onPress={startBleScan} loading={isScanning} fullWidth />
                            {bleDevices.map(device => (
                                <TouchableOpacity
                                    key={device.id}
                                    style={styles.device}
                                    onPress={() => connectToBleDevice(device)}
                                >
                                    <AppText style={{ color: textPrimary }}>{device.name}</AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <ThemedButton
                        title="Done"
                        variant="outline"
                        onPress={() => back()}
                        fullWidth
                        style={{ marginTop: 24 }}
                    />
                </View>
            </ScrollView>

            {/* Floating toast message (auto‑dismiss after 6 seconds) */}
            {toastMessage !== null && (
                <View style={[styles.floating, { backgroundColor: cardBg }]}>
                    <AppText style={{ color: textPrimary, fontSize: 14 }}>{toastMessage}</AppText>
                </View>
            )}
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
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    floating: {
        position: 'absolute',
        bottom: 100,
        left: 24,
        right: 24,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
});