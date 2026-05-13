// app/settings/robot.tsx
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeContext } from "@/src/context/ThemeContext";
import { supabase } from "@/src/services/supabase";
import AppText from "../../src/components/AppText";
import Loader from "../../src/components/Loader";

// Optional QR scanner import
let BarCodeScanner: any = null;
try {
    BarCodeScanner = require("expo-barcode-scanner").BarCodeScanner;
} catch {
    // expo-barcode-scanner not installed
}

// Toast Message Interface
interface ToastMessage {
    id: string;
    text: string;
    type: "success" | "error" | "info" | "warning";
}

type RobotInfo = {
    id: string;
    name: string;
    serial_number?: string;
    connection_type: "cloud" | "wifi" | "ble" | "none";
    wifi_ip?: string | null;
    ble_id?: string | null;
    status: string;
    battery: number;
    last_cleaned_at: string | null;
    firmware_version: string | null;
    is_online: boolean;
    created_at: string;
};

// Themed Button Component
const ThemedButton = ({
    title,
    onPress,
    variant = "primary",
    loading = false,
    disabled = false,
    fullWidth = false,
    style,
    icon,
}: {
    title: string;
    onPress: () => void;
    variant?: "primary" | "danger" | "outline";
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    style?: any;
    icon?: keyof typeof Ionicons.glyphMap;
}) => {
    const { colors, darkMode } = useThemeContext();

    let bgColor = colors.primary;
    let textColor = "#FFFFFF";
    let borderColor = "transparent";

    if (variant === "danger") {
        bgColor = "#EF4444";
        textColor = "#FFFFFF";
    } else if (variant === "outline") {
        bgColor = "transparent";
        textColor = colors.primary;
        borderColor = colors.primary;
    } else {
        bgColor = colors.primary;
        textColor = "#FFFFFF";
    }

    const opacity = disabled ? 0.6 : 1;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.button,
                {
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    borderWidth: variant === "outline" ? 1.5 : 0,
                    opacity,
                },
                fullWidth && { width: "100%" },
                style,
            ]}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={textColor} size="small" />
            ) : (
                <View style={styles.buttonContent}>
                    {icon && (
                        <Ionicons
                            name={icon}
                            size={20}
                            color={textColor}
                            style={{ marginRight: 8 }}
                        />
                    )}
                    <AppText style={[styles.buttonText, { color: textColor }]}>
                        {title}
                    </AppText>
                </View>
            )}
        </TouchableOpacity>
    );
};

export default function RobotManagement() {
    const { back } = useAppNavigation();
    const { colors, darkMode } = useThemeContext();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const [robots, setRobots] = useState<RobotInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const toastAnimations = useRef<{ [key: string]: Animated.Value }>({});

    // Form states
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingRobotId, setEditingRobotId] = useState<string | null>(null);
    const [robotName, setRobotName] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [registering, setRegistering] = useState(false);

    // QR Scanner
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [scanningQR, setScanningQR] = useState(false);

    // Theme tokens
    const cardBg = darkMode ? "rgba(255,255,255,0.05)" : "#ffffff";
    const cardBorderColor = darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
    const textPrimary = darkMode ? "#ffffff" : "#1a1a2e";
    const textSecondary = darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.60)";
    const successColor = "#10B981";
    const errorColor = "#EF4444";
    const warningColor = "#F59E0B";
    const infoColor = "#3B82F6";

    // Show toast at TOP
    const showToast = useCallback((text: string, type: ToastMessage["type"]) => {
        const id = Date.now().toString();
        const fadeAnim = new Animated.Value(0);
        const slideAnim = new Animated.Value(-100);

        toastAnimations.current[id] = fadeAnim;

        setToasts((prev) => [...prev, { id, text, type }]);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();

        setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: -100,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
                delete toastAnimations.current[id];
            });
        }, 5000);
    }, []);

    // Fetch robots from Supabase
    const fetchRobots = useCallback(async () => {
        setLoading(true);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user?.id) throw new Error("Not authenticated");

            const { data, error } = await supabase
                .from("robots")
                .select("*")
                .eq("owner_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            setRobots(data || []);
        } catch (err: any) {
            console.error("Failed to fetch robots:", err);
            showToast(err.message || "Could not load your robots", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchRobots();
    }, [fetchRobots]);

    // Camera permissions for QR scanner
    useEffect(() => {
        if (!BarCodeScanner) return;
        (async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasCameraPermission(status === "granted");
        })();
    }, []);

    const startQRScan = async () => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (!BarCodeScanner) {
            showToast(
                "QR scanning requires a development build with expo-barcode-scanner",
                "warning",
            );
            return;
        }
        if (hasCameraPermission === null) {
            showToast("Requesting camera permission...", "info");
            return;
        }
        if (hasCameraPermission === false) {
            Alert.alert(
                "No Camera Access",
                "Please enable camera permission in your device settings to scan QR codes.",
                [{ text: "OK" }],
            );
            return;
        }
        setScanningQR(true);
    };

    const handleQRScanned = ({ data }: { data: string }) => {
        setScanningQR(false);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            const parsed = JSON.parse(data);
            if (parsed.serial || parsed.id) {
                setSerialNumber(parsed.serial || parsed.id || "");
                showToast(`QR scanned: ${parsed.serial || parsed.id || "Detected"}`, "success");
            }
            if (parsed.name) setRobotName(parsed.name);
        } catch {
            showToast("Invalid QR code - Could not read robot information", "error");
        }
    };

    const saveOrUpdateRobot = async () => {
        if (!robotName.trim()) {
            showToast("Robot name is required", "warning");
            return;
        }
        if (!serialNumber.trim()) {
            showToast("Serial number is required", "warning");
            return;
        }

        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRegistering(true);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user?.id) throw new Error("Not authenticated");

            const payload: {
                owner_id: string;
                name: string;
                serial_number: string;
                connection_type: "cloud";
                updated_at: string;
                created_at?: string;
            } = {
                owner_id: user.id,
                name: robotName.trim(),
                serial_number: serialNumber.trim(),
                connection_type: "cloud",
                updated_at: new Date().toISOString(),
            };

            let error;
            if (isEditing && editingRobotId) {
                ({ error } = await supabase
                    .from("robots")
                    .update(payload)
                    .eq("id", editingRobotId)
                    .eq("owner_id", user.id));

                if (!error) {
                    showToast("Robot updated successfully!", "success");
                }
            } else {
                payload.created_at = new Date().toISOString();
                ({ error } = await supabase.from("robots").insert(payload));

                if (!error) {
                    showToast("Robot registered successfully!", "success");
                    showToast("Your robot is now ready to connect via the cloud!", "info");
                }
            }

            if (error) throw error;

            resetForm();
            await fetchRobots();
        } catch (err: any) {
            console.error("Save robot error:", err);
            showToast(err.message || "Failed to save robot", "error");
        } finally {
            setRegistering(false);
        }
    };

    const editRobot = (robot: RobotInfo) => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        setIsEditing(true);
        setEditingRobotId(robot.id);
        setRobotName(robot.name);
        setSerialNumber(robot.serial_number || "");
        setShowForm(true);
    };

    const deleteRobot = (id: string, name: string) => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Alert.alert(
            "Delete Robot",
            `Are you sure you want to delete "${name}"? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from("robots")
                                .delete()
                                .eq("id", id);

                            if (error) throw error;

                            showToast(`${name} has been removed`, "success");
                            await fetchRobots();
                        } catch (err: any) {
                            showToast(err.message || "Failed to delete robot", "error");
                        }
                    },
                },
            ],
        );
    };

    const resetForm = () => {
        setShowForm(false);
        setIsEditing(false);
        setEditingRobotId(null);
        setRobotName("");
        setSerialNumber("");
    };

    // Render toast messages
    const renderToasts = () => {
        const statusBarHeight = StatusBar.currentHeight || (Platform.OS === "ios" ? 47 : 0);

        return toasts.map((toast, index) => {
            const toastColor =
                toast.type === "success"
                    ? successColor
                    : toast.type === "error"
                        ? errorColor
                        : toast.type === "warning"
                            ? warningColor
                            : infoColor;
            const fadeAnim = toastAnimations.current[toast.id] || new Animated.Value(1);

            return (
                <Animated.View
                    key={toast.id}
                    style={[
                        styles.toast,
                        {
                            backgroundColor: toastColor,
                            top: statusBarHeight + 10 + index * 70,
                            left: 16,
                            right: 16,
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <Ionicons
                        name={
                            toast.type === "success"
                                ? "checkmark-circle"
                                : toast.type === "error"
                                    ? "alert-circle"
                                    : toast.type === "warning"
                                        ? "warning"
                                        : "information-circle"
                        }
                        size={22}
                        color="#fff"
                    />
                    <AppText style={styles.toastText}>{toast.text}</AppText>
                    <TouchableOpacity
                        onPress={() => {
                            const anim = toastAnimations.current[toast.id];
                            if (anim) {
                                Animated.timing(anim, {
                                    toValue: 0,
                                    duration: 200,
                                    useNativeDriver: true,
                                }).start(() => {
                                    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                                    delete toastAnimations.current[toast.id];
                                });
                            }
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={18} color="rgba(255,255,255,0.9)" />
                    </TouchableOpacity>
                </Animated.View>
            );
        });
    };

    if (loading) {
        return <Loader message="Loading your robots..." />;
    }

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={["top"]}
        >
            <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

            {renderToasts()}

            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.scrollContentLarge,
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                    {/* Back button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={28} color={colors.primary} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Robot Management
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Manage your Smart Cleaner robots (Cloud Connection)
                        </AppText>
                    </View>

                    {/* Cloud Info Card */}
                    <View
                        style={[
                            styles.infoCard,
                            {
                                backgroundColor: `${infoColor}12`,
                                borderColor: `${infoColor}30`,
                            },
                        ]}
                    >
                        <Ionicons name="cloud-outline" size={22} color={infoColor} />
                        <View style={styles.infoCardContent}>
                            <AppText style={[styles.infoCardTitle, { color: textPrimary }]}>
                                Cloud Connection
                            </AppText>
                            <AppText style={[styles.infoCardText, { color: textSecondary }]}>
                                Robots connect via our secure cloud. Just register your robot's serial
                                number and it will be ready to control from anywhere.
                            </AppText>
                        </View>
                    </View>

                    {/* Registration / Edit Form */}
                    {showForm && (
                        <View
                            style={[
                                styles.sectionCard,
                                { backgroundColor: cardBg, borderColor: cardBorderColor },
                            ]}
                        >
                            <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                {isEditing ? "Edit Robot" : "Register New Robot"}
                            </AppText>

                            <View style={styles.field}>
                                <AppText style={[styles.label, { color: textSecondary }]}>
                                    Robot Name *
                                </AppText>
                                <TextInput
                                    value={robotName}
                                    onChangeText={setRobotName}
                                    placeholder="e.g. Living Room Bot"
                                    placeholderTextColor={textSecondary}
                                    allowFontScaling={false}
                                    style={[
                                        styles.input,
                                        { color: textPrimary, borderColor: cardBorderColor },
                                    ]}
                                />
                            </View>

                            <View style={styles.field}>
                                <AppText style={[styles.label, { color: textSecondary }]}>
                                    Serial Number *
                                </AppText>
                                <TextInput
                                    value={serialNumber}
                                    onChangeText={setSerialNumber}
                                    placeholder="Found on robot label or LCD screen"
                                    placeholderTextColor={textSecondary}
                                    allowFontScaling={false}
                                    style={[
                                        styles.input,
                                        { color: textPrimary, borderColor: cardBorderColor },
                                    ]}
                                />
                                <AppText style={[styles.helperText, { color: textSecondary }]}>
                                    The Serial Number is unique to your robot. Find it on the sticker
                                    underneath or on the robot's LCD screen.
                                </AppText>
                            </View>

                            <View style={styles.buttonRow}>
                                <ThemedButton
                                    title={isEditing ? "Update Robot" : "Register Robot"}
                                    loading={registering}
                                    onPress={saveOrUpdateRobot}
                                    disabled={registering || !robotName.trim() || !serialNumber.trim()}
                                    fullWidth
                                    style={{ flex: 1 }}
                                />
                                <ThemedButton
                                    title="Cancel"
                                    variant="outline"
                                    onPress={resetForm}
                                    style={{ marginLeft: 12, flex: 1 }}
                                />
                            </View>

                            {BarCodeScanner && (
                                <ThemedButton
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
                                    <View
                                        key={r.id}
                                        style={[
                                            styles.sectionCard,
                                            { backgroundColor: cardBg, borderColor: cardBorderColor },
                                        ]}
                                    >
                                        <View style={styles.cardHeader}>
                                            <View style={styles.cardTitleRow}>
                                                <View
                                                    style={[
                                                        styles.statusIndicator,
                                                        {
                                                            backgroundColor: r.is_online
                                                                ? `${successColor}20`
                                                                : `${errorColor}20`,
                                                        },
                                                    ]}
                                                >
                                                    <View
                                                        style={[
                                                            styles.statusDot,
                                                            {
                                                                backgroundColor: r.is_online
                                                                    ? successColor
                                                                    : errorColor,
                                                            },
                                                        ]}
                                                    />
                                                    <AppText
                                                        style={[
                                                            styles.statusText,
                                                            {
                                                                color: r.is_online ? successColor : errorColor,
                                                            },
                                                        ]}
                                                    >
                                                        {r.is_online ? "Online" : "Offline"}
                                                    </AppText>
                                                </View>
                                                <AppText
                                                    style={[styles.sectionTitle, { color: textPrimary }]}
                                                >
                                                    {r.name}
                                                </AppText>
                                            </View>
                                            <View style={styles.cardActions}>
                                                <TouchableOpacity
                                                    onPress={() => editRobot(r)}
                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                >
                                                    <Ionicons
                                                        name="pencil"
                                                        size={22}
                                                        color={colors.primary}
                                                    />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => deleteRobot(r.id, r.name)}
                                                    style={{ marginLeft: 16 }}
                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                >
                                                    <Ionicons name="trash" size={22} color={errorColor} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.infoRow}>
                                            <Ionicons
                                                name="cloud-outline"
                                                size={20}
                                                color={infoColor}
                                            />
                                            <AppText style={[styles.infoText, { color: textPrimary }]}>
                                                Connection: Cloud (Supabase)
                                            </AppText>
                                        </View>

                                        <View style={styles.infoRow}>
                                            <Ionicons
                                                name="battery-half"
                                                size={20}
                                                color={r.battery > 20 ? successColor : warningColor}
                                            />
                                            <AppText
                                                style={[
                                                    styles.infoText,
                                                    {
                                                        color: r.battery > 20 ? successColor : warningColor,
                                                    },
                                                ]}
                                            >
                                                Battery: {r.battery}%
                                            </AppText>
                                        </View>

                                        <View style={styles.infoRow}>
                                            <Ionicons
                                                name="time-outline"
                                                size={20}
                                                color={infoColor}
                                            />
                                            <AppText style={[styles.infoText, { color: textPrimary }]}>
                                                Last Cleaned:{" "}
                                                {r.last_cleaned_at
                                                    ? new Date(r.last_cleaned_at).toLocaleDateString()
                                                    : "Never"}
                                            </AppText>
                                        </View>

                                        <View style={styles.infoRow}>
                                            <Ionicons
                                                name="git-network-outline"
                                                size={20}
                                                color={infoColor}
                                            />
                                            <AppText style={[styles.infoText, { color: textPrimary }]}>
                                                Firmware: {r.firmware_version || "v1.0.0"}
                                            </AppText>
                                        </View>

                                        <View style={styles.infoRow}>
                                            <Ionicons
                                                name="qr-code-outline"
                                                size={20}
                                                color={textSecondary}
                                            />
                                            <AppText style={[styles.infoText, { color: textSecondary }]}>
                                                SN: {r.serial_number || "N/A"}
                                            </AppText>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Ionicons
                                        name="hardware-chip-outline"
                                        size={64}
                                        color={textSecondary}
                                        style={{ opacity: 0.5 }}
                                    />
                                    <AppText style={[styles.emptyText, { color: textPrimary }]}>
                                        No Robots Registered
                                    </AppText>
                                    <AppText style={[styles.emptySubtext, { color: textSecondary }]}>
                                        Tap "Register New Robot" to add your first robot
                                    </AppText>
                                </View>
                            )}

                            <ThemedButton
                                title="Register New Robot"
                                icon="add-circle-outline"
                                onPress={() => {
                                    resetForm();
                                    setShowForm(true);
                                }}
                                fullWidth
                                style={{ marginTop: 24 }}
                            />

                            <ThemedButton
                                title="Check for Updates"
                                icon="cloud-upload-outline"
                                onPress={() => {
                                    showToast("Your robots are up to date with the latest cloud configuration", "success");
                                }}
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
                <Modal visible={scanningQR} transparent={false} animationType="slide">
                    <View style={styles.scannerContainer}>
                        <BarCodeScanner
                            onBarCodeScanned={handleQRScanned}
                            style={StyleSheet.absoluteFillObject}
                        />
                        <TouchableOpacity
                            style={styles.closeScanner}
                            onPress={() => setScanningQR(false)}
                        >
                            <Ionicons name="close-circle" size={48} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.scannerFrame}>
                            <View style={styles.scannerCornerTL} />
                            <View style={styles.scannerCornerTR} />
                            <View style={styles.scannerCornerBL} />
                            <View style={styles.scannerCornerBR} />
                        </View>
                        <AppText style={styles.scannerText}>
                            Scan QR code on your robot
                        </AppText>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 100,
    },
    scrollContentLarge: {
        alignItems: "center",
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    wrapper: { width: "100%" },
    largeWrapper: { maxWidth: 480 },
    headerSection: { marginBottom: 24 },
    headerTitle: {
        fontSize: 35,
        fontWeight: "800",
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 15,
        fontWeight: "400",
        letterSpacing: 0.1,
    },
    sectionCard: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    cardTitleRow: {
        flex: 1,
        gap: 8,
    },
    cardActions: { flexDirection: "row", alignItems: "center" },
    field: { marginBottom: 16 },
    label: { fontSize: 13, marginBottom: 6, fontWeight: "500" },
    input: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    helperText: {
        fontSize: 11,
        marginTop: 4,
        marginLeft: 4,
        opacity: 0.7,
    },
    buttonRow: { flexDirection: "row", gap: 12, marginTop: 8 },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonContent: { flexDirection: "row", alignItems: "center" },
    buttonText: { fontSize: 16, fontWeight: "600" },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        gap: 10,
    },
    infoText: { fontSize: 14, fontWeight: "500", flex: 1 },
    footer: {
        textAlign: "center",
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },

    // Info Card
    infoCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        flexDirection: "row",
        gap: 14,
        marginBottom: 20,
    },
    infoCardContent: {
        flex: 1,
    },
    infoCardTitle: {
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 4,
    },
    infoCardText: {
        fontSize: 13,
        lineHeight: 18,
        opacity: 0.8,
    },

    // Status Indicator
    statusIndicator: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: "600",
    },

    // Empty State
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        marginTop: 8,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: "center",
        opacity: 0.7,
        paddingHorizontal: 40,
    },

    // Toast
    toast: {
        position: "absolute",
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 14,
        gap: 12,
        zIndex: 9999,
        elevation: 8,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    toastText: {
        flex: 1,
        color: "#fff",
        fontSize: 14,
        fontWeight: "500",
        lineHeight: 20,
    },

    // QR Scanner Modal
    scannerContainer: {
        flex: 1,
        backgroundColor: "#000",
    },
    closeScanner: {
        position: "absolute",
        top: 60,
        right: 20,
        zIndex: 10,
    },
    scannerFrame: {
        position: "absolute",
        top: "30%",
        left: "10%",
        right: "10%",
        height: 200,
        borderWidth: 2,
        borderColor: "#fff",
        borderRadius: 20,
    },
    scannerCornerTL: {
        position: "absolute",
        top: -2,
        left: -2,
        width: 30,
        height: 30,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderColor: "#3B82F6",
    },
    scannerCornerTR: {
        position: "absolute",
        top: -2,
        right: -2,
        width: 30,
        height: 30,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderColor: "#3B82F6",
    },
    scannerCornerBL: {
        position: "absolute",
        bottom: -2,
        left: -2,
        width: 30,
        height: 30,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderColor: "#3B82F6",
    },
    scannerCornerBR: {
        position: "absolute",
        bottom: -2,
        right: -2,
        width: 30,
        height: 30,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderColor: "#3B82F6",
    },
    scannerText: {
        position: "absolute",
        bottom: 100,
        alignSelf: "center",
        color: "white",
        fontSize: 16,
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: 12,
        borderRadius: 12,
    },
});