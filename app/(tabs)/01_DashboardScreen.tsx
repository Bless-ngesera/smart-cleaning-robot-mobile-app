import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    Alert,
    StyleSheet,
} from "react-native";
import {useEffect, useState, useCallback, useContext, JSX} from "react";
import { router } from "expo-router";

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
    const { colors } = useContext(ThemeContext);

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

    /* ---------------------- Initial Loader ------------------------- */
    if (loading && !status) {
        return <Loader message="Fetching robot status..." />;
    }

    /* --------------------------- UI ------------------------------- */
    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl refreshing={loading} onRefresh={fetchStatus} />
            }
        >
            <Header title="Dashboard" />

            <View style={styles.content}>
                {/* -------------------- Stats -------------------- */}
                <View style={styles.statsRow}>
                    <StatTile
                        label="Battery"
                        value={status ? `${status.batteryLevel}%` : "--"}
                        highlight
                    />
                    <StatTile
                        label="State"
                        value={status ? (status.isCleaning ? "Cleaning" : "Idle") : "--"}
                    />
                </View>

                {/* ---------------- Last Cleaned ---------------- */}
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <Text style={[styles.subtitle, { color: colors.subtitle }]}>
                        Last cleaned
                    </Text>
                    <Text style={[styles.cardText, { color: colors.text }]}>
                        {status ? new Date(status.lastCleaned).toLocaleString() : "—"}
                    </Text>
                </View>

                {/* ------------------ Errors -------------------- */}
                {Array.isArray(status?.errors) && status.errors.length > 0 && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorTitle}>Errors</Text>
                        {status.errors.map((error: string, index: number): JSX.Element => (
                            <Text key={index} style={styles.errorText}>
                                • {error}
                            </Text>
                        ))}
                    </View>
                )}

                {/* --------------- Responsive Buttons ---------------- */}
                <View style={styles.buttonContainer}>
                    <View style={styles.buttonWrapper}>
                        <Button
                            title="Controls"
                            icon="settings-outline"
                            onPress={() => router.push("/(tabs)/02_ControlScreen")}
                        />
                    </View>

                    <View style={styles.buttonWrapper}>
                        <Button
                            title="Schedule"
                            icon="calendar-outline"
                            variant="secondary"
                            onPress={() => router.push("/(tabs)/04_ScheduleScreen")}
                        />
                    </View>

                    <View style={styles.buttonWrapper}>
                        <Button
                            title="Map"
                            icon="map-outline"
                            variant="secondary"
                            onPress={() => router.push("/(tabs)/03_MapScreen")}
                        />
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

/* ---------------------------- Styles ----------------------------- */

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    content: {
        padding: 24,
    },
    statsRow: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 24,
        flexWrap: "wrap",
    },
    card: {
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    subtitle: {
        fontSize: 13,
    },
    cardText: {
        fontSize: 18,
        fontWeight: "600",
        marginTop: 4,
    },
    errorBox: {
        backgroundColor: "#FEF2F2",
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: "#FECACA",
        marginBottom: 24,
    },
    errorTitle: {
        color: "#B91C1C",
        fontWeight: "600",
        marginBottom: 8,
    },
    errorText: {
        color: "#DC2626",
    },

    /* ---------- Responsive Buttons ---------- */
    buttonContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    buttonWrapper: {
        flexBasis: "48%",
        flexGrow: 1,
    },
});
