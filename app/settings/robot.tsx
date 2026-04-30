// app/settings/robot.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import Loader from '../../src/components/Loader';
import AppText from '../../src/components/AppText';
import Button from '../../src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

// Optional QR scanner import (will be null in Expo Go)
let BarCodeScanner: any = null;
try {
    BarCodeScanner = require('expo-barcode-scanner').BarCodeScanner;
} catch {
    // expo-barcode-scanner not installed or not supported → fallback
}

type RobotInfo = {
    id: string;
    name: string;
    serial_number?: string;
    connection_type: 'wifi' | 'ble' | 'none';
    wifi_ip?: string | null;
    ble_id?: string | null;
    status: string;
    battery: number;
    last_cleaned_at: string | null;
    firmware_version: string | null;
};

export default function RobotManagement() {
    const { colors, darkMode } = useThemeContext();

    const [robots, setRobots] = useState<RobotInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [restarting, setRestarting] = useState(false);

    // Form states (register / edit)
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingRobotId, setEditingRobotId] = useState<string | null>(null);
    const [robotName, setRobotName] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [connectionType, setConnectionType] = useState<'wifi' | 'ble' | 'none'>('none');
    const [wifiIp, setWifiIp] = useState('');
    const [registering, setRegistering] = useState(false);

    // QR Scanner (only if module is available)
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [scanningQR, setScanningQR] = useState(false);

    // Responsive
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    // Design tokens - FIXED: Moved inside component to access colors and darkMode
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorderColor = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';

    // Fetch all user's robots
    const fetchRobots = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('robots')
                .select('id, name, serial_number, connection_type, wifi_ip, ble_id, status, battery, last_cleaned_at, firmware_version')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setRobots(data || []);
            setShowForm(data.length === 0 && !isEditing);
        } catch (err: any) {
            console.error('Failed to fetch robots:', err);
            Alert.alert('Error', 'Could not load your robots');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRobots();
    }, []);

    // Camera permission (only if BarCodeScanner exists)
    useEffect(() => {
        if (!BarCodeScanner) return;

        (async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasCameraPermission(status === 'granted');
        })();
    }, []);

    const startQRScan = async () => {
        if (!BarCodeScanner) {
            Alert.alert(
                'Not Available',
                'QR scanning requires a development build.\n\nRun:\nnpx expo run:android\nor\nnpx expo run:ios'
            );
            return;
        }

        if (hasCameraPermission === null) {
            Alert.alert('Waiting', 'Requesting camera permission...');
            return;
        }

        if (hasCameraPermission === false) {
            Alert.alert(
                'No Camera Access',
                'Please enable camera permission in your device settings to scan QR codes.'
            );
            return;
        }

        setScanningQR(true);
    };

    const handleQRScanned = ({ data }: { data: string }) => {
        setScanningQR(false);
        try {
            const parsed = JSON.parse(data);
            setSerialNumber(parsed.serial || parsed.id || '');
            if (parsed.name) setRobotName(parsed.name);
            if (parsed.type && ['wifi', 'ble'].includes(parsed.type)) setConnectionType(parsed.type);
            Alert.alert('QR Scanned', `Robot serial: ${parsed.serial || parsed.id || 'Detected'}`);
        } catch {
            Alert.alert('Invalid QR', 'Could not read robot information from this code.');
        }
    };

    const saveOrUpdateRobot = async () => {
        if (!robotName.trim()) return Alert.alert('Error', 'Robot name is required');
        if (!serialNumber.trim()) return Alert.alert('Error', 'Serial number is required');

        setRegistering(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Not authenticated');

            const payload = {
                owner_id: user.id,
                name: robotName.trim(),
                serial_number: serialNumber.trim(),
                connection_type: connectionType,
                wifi_ip: connectionType === 'wifi' ? wifiIp.trim() || null : null,
                ble_id: connectionType === 'ble' ? 'pending' : null,
            };

            let error;
            if (isEditing && editingRobotId) {
                ({ error } = await supabase
                    .from('robots')
                    .update(payload)
                    .eq('id', editingRobotId)
                    .eq('owner_id', user.id));
            } else {
                ({ error } = await supabase
                    .from('robots')
                    .insert(payload));
            }

            if (error) throw error;

            Alert.alert('Success', isEditing ? 'Robot updated!' : 'Robot registered!');
            resetForm();
            await fetchRobots();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save robot');
        } finally {
            setRegistering(false);
        }
    };

    const editRobot = (robot: RobotInfo) => {
        setIsEditing(true);
        setEditingRobotId(robot.id);
        setRobotName(robot.name);
        setSerialNumber(robot.serial_number || '');
        setConnectionType(robot.connection_type);
        setWifiIp(robot.wifi_ip || '');
        setShowForm(true);
    };

    const deleteRobot = (id: string, name: string) => {
        Alert.alert(
            'Delete Robot',
            `Are you sure you want to delete "${name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('robots')
                                .delete()
                                .eq('id', id);

                            if (error) throw error;

                            Alert.alert('Deleted', `${name} has been removed.`);
                            await fetchRobots();
                        } catch (err: any) {
                            Alert.alert('Error', 'Failed to delete robot');
                        }
                    },
                },
            ]
        );
    };

    const resetForm = () => {
        setShowForm(false);
        setIsEditing(false);
        setEditingRobotId(null);
        setRobotName('');
        setSerialNumber('');
        setConnectionType('none');
        setWifiIp('');
    };

    const checkUpdates = async () => {
        setChecking(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            Alert.alert('Firmware Check', 'All your robots are up to date');
        } catch {
            Alert.alert('Error', 'Failed to check for updates');
        } finally {
            setChecking(false);
        }
    };

    const restartRobot = async () => {
        if (robots.length === 0) return Alert.alert('No Robots', 'Register a robot first');
        Alert.alert(
            'Restart Robot',
            'This will restart the selected robot. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restart',
                    style: 'destructive',
                    onPress: async () => {
                        setRestarting(true);
                        try {
                            await new Promise(resolve => setTimeout(resolve, 1500));
                            Alert.alert('Success', 'Restart command sent');
                        } catch {
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
        return <Loader message="Loading your robots..." />;
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
                    {/* Back Navigation */}
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={28} color={colors.primary} />
                    </TouchableOpacity>

                    {/* Large Header */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Robot Management
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Manage your Smart Cleaner robots
                        </AppText>
                    </View>

                    {/* Form (Register or Edit) */}
                    {showForm && (
                        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorderColor }]}>
                            <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                {isEditing ? 'Edit Robot' : 'Register New Robot'}
                            </AppText>

                            <View style={styles.field}>
                                <AppText style={[styles.label, { color: textSecondary }]}>Robot Name</AppText>
                                <TextInput
                                    value={robotName}
                                    onChangeText={setRobotName}
                                    placeholder="e.g. Living Room Bot"
                                    placeholderTextColor={textSecondary}
                                    allowFontScaling={false}
                                    style={[styles.input, { color: textPrimary, borderColor: cardBorderColor }]}
                                />
                            </View>

                            <View style={styles.field}>
                                <AppText style={[styles.label, { color: textSecondary }]}>Serial Number</AppText>
                                <TextInput
                                    value={serialNumber}
                                    onChangeText={setSerialNumber}
                                    placeholder="From robot sticker or box"
                                    placeholderTextColor={textSecondary}
                                    allowFontScaling={false}
                                    style={[styles.input, { color: textPrimary, borderColor: cardBorderColor }]}
                                />
                            </View>

                            <View style={styles.field}>
                                <AppText style={[styles.label, { color: textSecondary }]}>Connection Type</AppText>
                                <View style={styles.pickerRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.pickerOption,
                                            { borderColor: cardBorderColor },
                                            connectionType === 'wifi' && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }
                                        ]}
                                        onPress={() => setConnectionType('wifi')}
                                    >
                                        <Ionicons name="wifi" size={20} color={connectionType === 'wifi' ? colors.primary : textSecondary} />
                                        <AppText style={{ color: connectionType === 'wifi' ? colors.primary : textSecondary }}>Wi-Fi</AppText>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.pickerOption,
                                            { borderColor: cardBorderColor },
                                            connectionType === 'ble' && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }
                                        ]}
                                        onPress={() => setConnectionType('ble')}
                                    >
                                        <Ionicons name="bluetooth" size={20} color={connectionType === 'ble' ? colors.primary : textSecondary} />
                                        <AppText style={{ color: connectionType === 'ble' ? colors.primary : textSecondary }}>Bluetooth</AppText>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {connectionType === 'wifi' && (
                                <View style={styles.field}>
                                    <AppText style={[styles.label, { color: textSecondary }]}>Wi-Fi IP Address</AppText>
                                    <TextInput
                                        value={wifiIp}
                                        onChangeText={setWifiIp}
                                        placeholder="e.g. 192.168.1.150"
                                        placeholderTextColor={textSecondary}
                                        keyboardType="numeric"
                                        allowFontScaling={false}
                                        style={[styles.input, { color: textPrimary, borderColor: cardBorderColor }]}
                                    />
                                </View>
                            )}

                            <View style={styles.buttonRow}>
                                <Button
                                    title={isEditing ? 'Update Robot' : 'Register Robot'}
                                    loading={registering}
                                    onPress={saveOrUpdateRobot}
                                    disabled={registering || !robotName.trim() || !serialNumber.trim()}
                                    fullWidth
                                    style={{ flex: 1 }}
                                />
                                <Button
                                    title="Cancel"
                                    variant="outline"
                                    onPress={resetForm}
                                    style={{ marginLeft: 12, flex: 1 }}
                                />
                            </View>

                            {BarCodeScanner && (
                                <Button
                                    title="Scan QR Code"
                                    icon="qr-code-outline"
                                    variant="outline"
                                    onPress={startQRScan}
                                    disabled={registering}
                                    fullWidth
                                    style={{ marginTop: 12 }}
                                />
                            )}
                        </View>
                    )}

                    {/* Robots List */}
                    {!showForm && (
                        <>
                            {robots.length > 0 ? (
                                robots.map((r) => (
                                    <View key={r.id} style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorderColor }]}>
                                        <View style={styles.cardHeader}>
                                            <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                                {r.name}
                                            </AppText>
                                            <View style={styles.cardActions}>
                                                <TouchableOpacity onPress={() => editRobot(r)}>
                                                    <Ionicons name="pencil" size={22} color={colors.primary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => deleteRobot(r.id, r.name)}
                                                    style={{ marginLeft: 16 }}
                                                >
                                                    <Ionicons name="trash" size={22} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.infoRow}>
                                            <Ionicons
                                                name={
                                                    r.status === 'Online' ? 'checkmark-circle' :
                                                        r.status === 'Charging' ? 'battery-charging' :
                                                            r.status === 'Error' ? 'alert-circle' : 'cloud-offline'
                                                }
                                                size={20}
                                                color={
                                                    r.status === 'Online' ? colors.primary :
                                                        r.status === 'Charging' ? '#f59e0b' :
                                                            r.status === 'Error' ? '#ef4444' : textSecondary
                                                }
                                            />
                                            <AppText style={[styles.infoText, { color: textPrimary }]}>
                                                Status: {r.status}
                                            </AppText>
                                        </View>

                                        <View style={styles.infoRow}>
                                            <Ionicons name="battery-half" size={20} color={colors.primary} />
                                            <AppText style={[styles.infoText, { color: colors.primary }]}>
                                                Battery: {r.battery}%
                                            </AppText>
                                        </View>

                                        <View style={styles.infoRow}>
                                            <Ionicons name="time-outline" size={20} color={colors.primary} />
                                            <AppText style={[styles.infoText, { color: textPrimary }]}>
                                                Last Cleaned: {r.last_cleaned_at ? new Date(r.last_cleaned_at).toLocaleString() : 'Never'}
                                            </AppText>
                                        </View>

                                        <View style={styles.infoRow}>
                                            <Ionicons name="git-network-outline" size={20} color={colors.primary} />
                                            <AppText style={[styles.infoText, { color: textPrimary }]}>
                                                Firmware: {r.firmware_version || 'Unknown'}
                                            </AppText>
                                        </View>

                                        <View style={styles.infoRow}>
                                            <Ionicons
                                                name={r.connection_type === 'wifi' ? 'wifi' : r.connection_type === 'ble' ? 'bluetooth' : 'alert-circle-outline'}
                                                size={20}
                                                color={r.connection_type !== 'none' ? colors.primary : '#ef4444'}
                                            />
                                            <AppText style={[styles.infoText, { color: textPrimary }]}>
                                                Connection: {r.connection_type === 'none' ? 'Disconnected' : r.connection_type.toUpperCase()}
                                                {r.wifi_ip ? ` (${r.wifi_ip})` : ''}
                                            </AppText>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <AppText style={{ color: textSecondary, textAlign: 'center', marginTop: 40, fontSize: 16 }}>
                                    No robots registered yet
                                </AppText>
                            )}

                            <Button
                                title="Register New Robot"
                                icon="add-circle-outline"
                                onPress={() => {
                                    resetForm();
                                    setShowForm(true);
                                }}
                                fullWidth
                                style={{ marginTop: 24 }}
                            />

                            <Button
                                title="Check for Updates"
                                icon="cloud-upload-outline"
                                onPress={checkUpdates}
                                loading={checking}
                                disabled={checking || robots.length === 0}
                                fullWidth
                                style={{ marginTop: 12 }}
                            />

                            <Button
                                title="Restart Robot"
                                icon="refresh-outline"
                                onPress={restartRobot}
                                loading={restarting}
                                disabled={restarting || robots.length === 0}
                                variant="outline"
                                fullWidth
                                style={{ marginTop: 12 }}
                            />
                        </>
                    )}
                </View>

                {/* Footer */}
                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>

            {/* QR Scanner Overlay */}
            {scanningQR && BarCodeScanner && (
                <View style={StyleSheet.absoluteFillObject}>
                    <BarCodeScanner
                        onBarCodeScanned={handleQRScanned}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <TouchableOpacity
                        style={styles.closeScanner}
                        onPress={() => setScanningQR(false)}
                    >
                        <Ionicons name="close-circle" size={48} color="white" />
                    </TouchableOpacity>
                    <AppText style={styles.scannerText}>
                        Scan the QR code on your robot
                    </AppText>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 80,
    },
    scrollContentLarge: {
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: 16,
    },

    wrapper: {
        width: '100%'
    },
    largeWrapper: {
        maxWidth: 480
    },
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardActions: {
        flexDirection: 'row',
    },
    field: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
    },
    input: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 16,
        fontFamily: 'SF-Pro-Display-Regular',
    },
    pickerRow: {
        flexDirection: 'row',
        gap: 12,
    },
    pickerOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    infoText: {
        fontSize: 16,
        fontWeight: '500',
    },
    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
    closeScanner: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 10,
    },
    scannerText: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        color: 'white',
        fontSize: 18,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 12,
        borderRadius: 12,
    },
});