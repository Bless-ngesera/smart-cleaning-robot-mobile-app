import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    Alert,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { useEffect, useState, useCallback, useContext, JSX } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import Button from "../src/components/Button";
import StatTile from "../src/components/StatTile";
import Header from "../src/components/Header";
import Loader from "../src/components/Loader";

import { getRobotStatus } from "../src/services/robotService";
import { ThemeContext } from "../src/context/ThemeContext";

/* ----------------------------- Types ----------------------------- */

type RobotStatus = {
    batteryLevel: number;
    isCleaning: boolean;
    lastCleaned: string;
    errors: string[];
};

/* ------------------------- Main Screen --------------------------- */

export default function DashboardScreen() {
    const { colors, darkMode } = useContext(ThemeContext);

    const [status, setStatus] = useState<RobotStatus | null>(null);
    const [loading, setLoading] = useState(false);

    /* ------------------------- Data Fetch -------------------------- */
    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true);
            // C++ BRIDGE: Replace getRobotStatus() with RobotBridge.getStatus() for native sensor integration
            const response = await getRobotStatus();
            setStatus(response);
        } catch {
            Alert.alert("Error", "Unable to fetch robot status. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    /* ---------------------- Battery Color ------------------------- */
    const getBatteryColor = (level: number) => {
        if (level > 60) return "#10B981";
        if (level > 30) return "#F59E0B";
        return "#EF4444";
    };

    const getBatteryIcon = (level: number) => {
        if (level > 80) return "battery-full";
        if (level > 60) return "battery-half";
        if (level > 30) return "battery-half";
        if (level > 10) return "battery-dead";
        return "battery-dead";
    };

    /* ---------------------- Initial Loader ------------------------- */
    if (loading && !status) {
        return <Loader message="Fetching robot status..." />;
    }

    /* --------------------------- UI ------------------------------- */
    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={["top", "bottom"]}
        >
            <Header title="Dashboard" subtitle="Monitor your robot's status" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchStatus} />
                }
            >
                <View style={styles.content}>
                    {/* -------------------- Robot Status Card -------------------- */}
                    <View
                        style={[
                            styles.statusCard,
                            {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={styles.statusHeader}>
                            <View style={styles.statusHeaderLeft}>
                                <View style={[
                                    styles.robotIconContainer,
                                    {
                                        backgroundColor: status?.isCleaning
                                            ? "#10B981" + "20"
                                            : colors.primary + "20"
                                    }
                                ]}>
                                    <Ionicons
                                        name="hardware-chip"
                                        size={32}
                                        color={status?.isCleaning ? "#10B981" : colors.primary}
                                    />
                                </View>
                                <View>
                                    <Text style={[styles.robotName, { color: colors.text }]}>
                                        Smart Cleaner Pro
                                    </Text>
                                    <View style={styles.statusBadge}>
                                        <View style={[
                                            styles.statusDot,
                                            {
                                                backgroundColor: status?.isCleaning
                                                    ? "#10B981"
                                                    : "#94A3B8"
                                            }
                                        ]} />
                                        <Text style={[
                                            styles.statusText,
                                            {
                                                color: status?.isCleaning
                                                    ? "#10B981"
                                                    : colors.textSecondary
                                            }
                                        ]}>
                                            {status?.isCleaning ? "Cleaning" : "Idle"}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.refreshButton, { backgroundColor: colors.background }]}
                                onPress={fetchStatus}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="refresh"
                                    size={20}
                                    color={colors.primary}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Battery Progress Bar */}
                        <View style={styles.batterySection}>
                            <View style={styles.batterySectionHeader}>
                                <View style={styles.batteryInfo}>
                                    <Ionicons
                                        name={getBatteryIcon(status?.batteryLevel || 0)}
                                        size={24}
                                        color={getBatteryColor(status?.batteryLevel || 0)}
                                    />
                                    <Text style={[styles.batteryLabel, { color: colors.text }]}>
                                        Battery Level
                                    </Text>
                                </View>
                                <Text style={[
                                    styles.batteryValue,
                                    { color: getBatteryColor(status?.batteryLevel || 0) }
                                ]}>
                                    {status?.batteryLevel || 0}%
                                </Text>
                            </View>

                            <View style={[styles.progressBarBackground, { backgroundColor: colors.background }]}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        {
                                            width: `${status?.batteryLevel || 0}%`,
                                            backgroundColor: getBatteryColor(status?.batteryLevel || 0),
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                    </View>

                    {/* -------------------- Quick Stats -------------------- */}
                    <View style={styles.statsGrid}>
                        <View style={[
                            styles.statCard,
                            { backgroundColor: colors.card, borderColor: colors.border }
                        ]}>
                            <View style={[styles.statIconBox, { backgroundColor: "#10B981" + "20" }]}>
                                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {status?.isCleaning ? "Active" : "Ready"}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                Status
                            </Text>
                        </View>

                        <View style={[
                            styles.statCard,
                            { backgroundColor: colors.card, borderColor: colors.border }
                        ]}>
                            <View style={[styles.statIconBox, { backgroundColor: "#8B5CF6" + "20" }]}>
                                <Ionicons name="time" size={24} color="#8B5CF6" />
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {status?.isCleaning ? "2.5h" : "—"}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                Runtime
                            </Text>
                        </View>

                        <View style={[
                            styles.statCard,
                            { backgroundColor: colors.card, borderColor: colors.border }
                        ]}>
                            <View style={[styles.statIconBox, { backgroundColor: "#F59E0B" + "20" }]}>
                                <Ionicons name="speedometer" size={24} color="#F59E0B" />
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                127m²
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                Area Cleaned
                            </Text>
                        </View>
                    </View>

                    {/* ---------------- Last Cleaned Info ---------------- */}
                    <View
                        style={[
                            styles.infoCard,
                            {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={styles.infoHeader}>
                            <View style={styles.infoTitleContainer}>
                                <Ionicons name="calendar" size={20} color={colors.primary} />
                                <Text style={[styles.infoTitle, { color: colors.text }]}>
                                    Last Cleaning Session
                                </Text>
                            </View>
                        </View>

                        <View style={styles.infoContent}>
                            <View style={styles.infoRow}>
                                <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                                <Text style={[styles.infoText, { color: colors.text }]}>
                                    {status ? new Date(status.lastCleaned).toLocaleString() : "No data available"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ------------------ Error Alerts -------------------- */}
                    {Array.isArray(status?.errors) && status.errors.length > 0 && (
                        <View style={styles.errorCard}>
                            <View style={styles.errorHeader}>
                                <View style={styles.errorIconContainer}>
                                    <Ionicons name="alert-circle" size={24} color="#EF4444" />
                                </View>
                                <View style={styles.errorHeaderText}>
                                    <Text style={styles.errorTitle}>
                                        System Alerts
                                    </Text>
                                    <Text style={styles.errorCount}>
                                        {status.errors.length} issue{status.errors.length > 1 ? "s" : ""} detected
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.errorList}>
                                {status.errors.map((error: string, index: number): JSX.Element => (
                                    <View key={index} style={styles.errorItem}>
                                        <View style={styles.errorBullet} />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* --------------- Quick Actions ---------------- */}
                    <View style={[
                        styles.actionsCard,
                        { backgroundColor: colors.card, borderColor: colors.border }
                    ]}>
                        <View style={styles.actionsHeader}>
                            <View style={styles.actionsTitleContainer}>
                                <Ionicons name="flash" size={20} color={colors.primary} />
                                <Text style={[styles.actionsTitle, { color: colors.text }]}>
                                    Quick Actions
                                </Text>
                            </View>
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.background }]}
                                onPress={() => router.push("/(tabs)/02_ControlScreen")}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.actionIconContainer, { backgroundColor: colors.primary + "20" }]}>
                                    <Ionicons name="game-controller" size={28} color={colors.primary} />
                                </View>
                                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                                    Controls
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.background }]}
                                onPress={() => router.push("/(tabs)/04_ScheduleScreen")}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.actionIconContainer, { backgroundColor: "#8B5CF6" + "20" }]}>
                                    <Ionicons name="calendar" size={28} color="#8B5CF6" />
                                </View>
                                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                                    Schedule
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.background }]}
                                onPress={() => router.push("/(tabs)/03_MapScreen")}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.actionIconContainer, { backgroundColor: "#10B981" + "20" }]}>
                                    <Ionicons name="map" size={28} color="#10B981" />
                                </View>
                                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                                    Map
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* --------------- Performance Tip ---------------- */}
                    <View style={[
                        styles.tipCard,
                        { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }
                    ]}>
                        <Ionicons name="bulb" size={20} color={colors.primary} />
                        <View style={styles.tipContent}>
                            <Text style={[styles.tipTitle, { color: colors.primary }]}>
                                Performance Tip
                            </Text>
                            <Text style={[styles.tipText, { color: colors.text }]}>
                                For optimal cleaning, ensure the dustbin is empty and sensors are clean before each session.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ---------------------------- Styles ----------------------------- */

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    content: {
        padding: 20,
    },

    /* Status Card */
    statusCard: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        marginBottom: 20,
        marginTop: 8,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    statusHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    statusHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    robotIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
    },
    robotName: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 4,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 14,
        fontWeight: "600",
    },
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },

    /* Battery Section */
    batterySection: {
        gap: 12,
    },
    batterySectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    batteryInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    batteryLabel: {
        fontSize: 15,
        fontWeight: "600",
    },
    batteryValue: {
        fontSize: 24,
        fontWeight: "700",
    },
    progressBarBackground: {
        height: 12,
        borderRadius: 6,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 6,
    },

    /* Stats Grid */
    statsGrid: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    statIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    statValue: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: "500",
        textAlign: "center",
    },

    /* Info Card */
    infoCard: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    infoHeader: {
        marginBottom: 16,
    },
    infoTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    infoContent: {
        gap: 12,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    infoText: {
        fontSize: 15,
        fontWeight: "500",
    },

    /* Error Card */
    errorCard: {
        backgroundColor: "#FEF2F2",
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: "#FECACA",
        marginBottom: 20,
        shadowColor: "#EF4444",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    errorHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    errorIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FEE2E2",
        alignItems: "center",
        justifyContent: "center",
    },
    errorHeaderText: {
        flex: 1,
    },
    errorTitle: {
        color: "#B91C1C",
        fontWeight: "700",
        fontSize: 16,
        marginBottom: 2,
    },
    errorCount: {
        color: "#DC2626",
        fontSize: 13,
        fontWeight: "500",
    },
    errorList: {
        gap: 10,
    },
    errorItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    errorBullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#EF4444",
        marginTop: 6,
    },
    errorText: {
        flex: 1,
        color: "#DC2626",
        fontSize: 14,
        lineHeight: 20,
    },

    /* Actions Card */
    actionsCard: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    actionsHeader: {
        marginBottom: 16,
    },
    actionsTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    actionsTitle: {
        fontSize: 18,
        fontWeight: "600",
    },
    actionButtons: {
        flexDirection: "row",
        gap: 12,
    },
    actionButton: {
        flex: 1,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        gap: 10,
    },
    actionIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: "600",
    },

    /* Tip Card */
    tipCard: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
    },
    tipContent: {
        flex: 1,
        gap: 4,
    },
    tipTitle: {
        fontSize: 14,
        fontWeight: "700",
    },
    tipText: {
        fontSize: 13,
        lineHeight: 18,
    },
});