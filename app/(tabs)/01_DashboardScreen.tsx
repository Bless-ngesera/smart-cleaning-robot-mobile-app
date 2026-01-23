import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    Alert,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { useEffect, useState, useCallback, useContext } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import Button from "../src/components/Button"; // assuming still used elsewhere
import StatTile from "../src/components/StatTile"; // not used now — consider removing import if unused
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

    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true);
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

    // Battery helpers
    const getBatteryColor = (level: number) => {
        if (level > 60) return "#10B981";
        if (level > 30) return "#F59E0B";
        return "#EF4444";
    };

    const getBatteryIcon = (level: number) => {
        if (level > 80) return "battery-full";
        if (level > 50) return "battery-half";
        if (level > 20) return "battery-low";
        return "battery-dead";
    };

    if (loading && !status) {
        return <Loader message="Fetching robot status..." />;
    }

    const batteryLevel = status?.batteryLevel ?? 0;
    const isCleaning = status?.isCleaning ?? false;

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={["bottom"]} // ← key change: header goes to true top
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

                    {/* ─── Hero Status Card ──────────────────────────────────────── */}
                    <View
                        style={[
                            styles.heroCard,
                            {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={styles.heroHeader}>
                            <View style={styles.robotInfo}>
                                <View
                                    style={[
                                        styles.robotAvatar,
                                        {
                                            backgroundColor: isCleaning
                                                ? "#10B98133"
                                                : `${colors.primary}33`,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name="hardware-chip"
                                        size={40}
                                        color={isCleaning ? "#10B981" : colors.primary}
                                    />
                                </View>

                                <View style={styles.robotText}>
                                    <Text style={[styles.robotName, { color: colors.text }]}>
                                        Smart Cleaner Pro
                                    </Text>
                                    <View style={styles.statusBadge}>
                                        <View
                                            style={[
                                                styles.statusDot,
                                                { backgroundColor: isCleaning ? "#10B981" : "#94A3B8" },
                                            ]}
                                        />
                                        <Text
                                            style={[
                                                styles.statusLabel,
                                                { color: isCleaning ? "#10B981" : colors.textSecondary },
                                            ]}
                                        >
                                            {isCleaning ? "Cleaning" : "Idle"}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.refreshBtn, { backgroundColor: colors.background }]}
                                onPress={fetchStatus}
                            >
                                <Ionicons name="refresh" size={22} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Battery – prominent */}
                        <View style={styles.batteryBlock}>
                            <View style={styles.batteryHeader}>
                                <View style={styles.batteryLabelRow}>
                                    <Ionicons
                                        name={getBatteryIcon(batteryLevel)}
                                        size={28}
                                        color={getBatteryColor(batteryLevel)}
                                    />
                                    <Text style={[styles.batteryTitle, { color: colors.text }]}>
                                        Battery
                                    </Text>
                                </View>
                                <Text
                                    style={[
                                        styles.batteryPercent,
                                        { color: getBatteryColor(batteryLevel) },
                                    ]}
                                >
                                    {batteryLevel}%
                                </Text>
                            </View>

                            <View
                                style={[
                                    styles.progressBg,
                                    { backgroundColor: darkMode ? "#333" : "#E5E7EB" },
                                ]}
                            >
                                <LinearGradient
                                    colors={[getBatteryColor(batteryLevel), `${getBatteryColor(batteryLevel)}CC`]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.progressFill, { width: `${batteryLevel}%` }]}
                                />
                            </View>
                        </View>
                    </View>

                    {/* ─── Quick Stats ────────────────────────────────────────────── */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.statIcon, { backgroundColor: "#10B98133" }]}>
                                <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                            </View>
                            <Text style={[styles.statNumber, { color: colors.text }]}>
                                {isCleaning ? "Active" : "Ready"}
                            </Text>
                            <Text style={[styles.statCaption, { color: colors.textSecondary }]}>Status</Text>
                        </View>

                        <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.statIcon, { backgroundColor: "#8B5CF633" }]}>
                                <Ionicons name="time" size={28} color="#8B5CF6" />
                            </View>
                            <Text style={[styles.statNumber, { color: colors.text }]}>
                                {isCleaning ? "2.5 h" : "—"}
                            </Text>
                            <Text style={[styles.statCaption, { color: colors.textSecondary }]}>Runtime</Text>
                        </View>

                        <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.statIcon, { backgroundColor: "#F59E0B33" }]}>
                                <Ionicons name="speedometer" size={28} color="#F59E0B" />
                            </View>
                            <Text style={[styles.statNumber, { color: colors.text }]}>127 m²</Text>
                            <Text style={[styles.statCaption, { color: colors.textSecondary }]}>Cleaned</Text>
                        </View>
                    </View>

                    {/* ─── Last Cleaned ───────────────────────────────────────────── */}
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="calendar" size={22} color={colors.primary} />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Last Session</Text>
                        </View>
                        <Text style={[styles.lastCleanedText, { color: colors.text }]}>
                            {status?.lastCleaned
                                ? new Date(status.lastCleaned).toLocaleString([], {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                })
                                : "No data yet"}
                        </Text>
                    </View>

                    {/* ─── Errors (only when present) ─────────────────────────────── */}
                    {status?.errors?.length ? (
                        <View style={styles.errorCard}>
                            <View style={styles.errorHeader}>
                                <View style={styles.errorIconWrap}>
                                    <Ionicons name="alert-circle" size={26} color="#EF4444" />
                                </View>
                                <View>
                                    <Text style={styles.errorTitle}>System Alerts</Text>
                                    <Text style={styles.errorSubtitle}>
                                        {status.errors.length} issue{status.errors.length > 1 ? "s" : ""} detected
                                    </Text>
                                </View>
                            </View>
                            {status.errors.map((err, i) => (
                                <View key={i} style={styles.errorRow}>
                                    <View style={styles.errorBullet} />
                                    <Text style={styles.errorMessage}>{err}</Text>
                                </View>
                            ))}
                        </View>
                    ) : null}

                    {/* ─── Quick Actions ──────────────────────────────────────────── */}
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="flash" size={22} color={colors.primary} />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Quick Actions</Text>
                        </View>

                        <View style={styles.actionsGrid}>
                            {[
                                { icon: "game-controller", label: "Controls", route: "/(tabs)/02_ControlScreen", color: colors.primary },
                                { icon: "calendar", label: "Schedule", route: "/(tabs)/04_ScheduleScreen", color: "#8B5CF6" },
                                { icon: "map", label: "Map", route: "/(tabs)/03_MapScreen", color: "#10B981" },
                            ].map((item, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.actionTile}
                                    onPress={() => router.push(item.route)}
                                >
                                    <View style={[styles.actionIconWrap, { backgroundColor: `${item.color}22` }]}>
                                        <Ionicons name={item.icon} size={32} color={item.color} />
                                    </View>
                                    <Text style={[styles.actionLabel, { color: colors.text }]}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* ─── Tip (optional premium touch) ───────────────────────────── */}
                    <View
                        style={[
                            styles.tipCard,
                            { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}40` },
                        ]}
                    >
                        <Ionicons name="bulb" size={24} color={colors.primary} />
                        <View style={styles.tipBody}>
                            <Text style={[styles.tipHeading, { color: colors.primary }]}>Pro Tip</Text>
                            <Text style={[styles.tipText, { color: colors.text }]}>
                                Empty the dustbin and wipe sensors before starting for best performance.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*                               Styles                                    */
/* ──────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    content: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },

    // Hero card – biggest visual impact
    heroCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
        elevation: 8,
    },
    heroHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 28,
    },
    robotInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    robotAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    robotText: { gap: 4 },
    robotName: {
        fontSize: 22,
        fontWeight: "700",
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    statusLabel: {
        fontSize: 16,
        fontWeight: "600",
    },
    refreshBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },

    // Battery
    batteryBlock: { gap: 12 },
    batteryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    batteryLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    batteryTitle: {
        fontSize: 17,
        fontWeight: "600",
    },
    batteryPercent: {
        fontSize: 32,
        fontWeight: "800",
    },
    progressBg: {
        height: 14,
        borderRadius: 7,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 7,
    },

    // Stats row
    statsRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 24,
    },
    statTile: {
        flex: 1,
        borderRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 12,
        borderWidth: 1,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
    },
    statIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 4,
    },
    statCaption: {
        fontSize: 13,
        fontWeight: "500",
    },

    // Generic card
    card: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    lastCleanedText: {
        fontSize: 16,
        fontWeight: "500",
    },

    // Error card
    errorCard: {
        backgroundColor: "#FEF2F2",
        borderColor: "#FECACA",
        borderWidth: 1,
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
    },
    errorHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    errorIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FEE2E2",
        alignItems: "center",
        justifyContent: "center",
    },
    errorTitle: {
        color: "#991B1B",
        fontSize: 18,
        fontWeight: "700",
    },
    errorSubtitle: {
        color: "#B91C1C",
        fontSize: 14,
    },
    errorRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 10,
    },
    errorBullet: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#EF4444",
        marginTop: 6,
    },
    errorMessage: {
        flex: 1,
        color: "#DC2626",
        fontSize: 15,
        lineHeight: 22,
    },

    // Actions grid
    actionsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        marginTop: 8,
    },
    actionTile: {
        flex: 1,
        minWidth: "30%",
        alignItems: "center",
        paddingVertical: 16,
        borderRadius: 16,
    },
    actionIconWrap: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: "600",
    },

    // Tip
    tipCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        flexDirection: "row",
        gap: 14,
        alignItems: "flex-start",
    },
    tipBody: { flex: 1, gap: 4 },
    tipHeading: {
        fontSize: 15,
        fontWeight: "700",
    },
    tipText: {
        fontSize: 14,
        lineHeight: 20,
    },
});