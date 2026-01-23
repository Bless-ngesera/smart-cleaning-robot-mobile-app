import React, { useState, useContext } from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import Header from "../src/components/Header";
import Loader from "../src/components/Loader";
import Button from "../src/components/Button";
import { ThemeContext } from "../src/context/ThemeContext";
import { router } from "expo-router";

export default function MapScreen() {
    const [busy, setBusy] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const { colors } = useContext(ThemeContext);

    /* ---------------- Fetch Robot Map ---------------- */
    const fetchMap = async () => {
        setBusy(true);
        setLoadingMessage("Fetching robot map...");
        try {
            // C++ BRIDGE: Replace with RobotBridge.getMap() for native robot mapping integration
            console.log("Fetch map (mock)");
            await new Promise((resolve) => setTimeout(resolve, 1500)); // mock delay
        } catch {
            Alert.alert("Error", "Failed to fetch robot map.");
        } finally {
            setBusy(false);
        }
    };

    if (busy) {
        return <Loader message={loadingMessage} />;
    }

    /* --------------------------- UI --------------------------- */
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Robot Map" />

            <View style={styles.content}>
                {/* ---------------- Map Placeholder ---------------- */}
                <View
                    style={[
                        styles.mapBox,
                        { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                >
                    <Text style={{ color: colors.subtitle }}>
                        Map visualization coming soon…
                    </Text>
                </View>

                {/* ---------------- Info Section ---------------- */}
                <View
                    style={[
                        styles.infoBox,
                        { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                >
                    <Text style={[styles.infoTitle, { color: "#2563eb" }]}>
                        Navigation Info
                    </Text>
                    <Text style={{ color: colors.text }}>
                        The robot’s path, obstacles, and cleaning zones will be displayed
                        here once integrated.
                    </Text>
                    {/* C++ BRIDGE: Integrate robot path, obstacle detection, and zone mapping here */}
                </View>

                {/* ---------------- Fetch Map Button ---------------- */}
                <View style={styles.actions}>
                    <Text style={[styles.actionsTitle, { color: colors.text }]}>
                        Actions
                    </Text>
                    <View style={styles.buttonRow}>
                        <Button
                            title="Fetch Map"
                            icon="map-outline"
                            onPress={fetchMap}
                            variant="primary"
                        />
                    </View>
                </View>

                {/* ---------------- Navigation Buttons ---------------- */}
                <View style={styles.navButtons}>
                    <Button
                        title="Dashboard"
                        icon="grid-outline"
                        onPress={() => router.push("./DashboardScreen")}
                        variant="secondary"
                    />
                    <Button
                        title="Control"
                        icon="settings-outline"
                        onPress={() => router.push("./ControlScreen")}
                        variant="secondary"
                    />
                    <Button
                        title="Schedule"
                        icon="calendar-outline"
                        onPress={() => router.push("./ScheduleScreen")}
                        variant="secondary"
                    />
                </View>
            </View>
        </View>
    );
}

/* ---------------------------- Styles ----------------------------- */
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        gap: 16,
        alignItems: "center",
        justifyContent: "flex-start",
    },
    mapBox: {
        width: "100%",
        height: 300,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    infoBox: {
        width: "100%",
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        marginTop: 16,
    },
    infoTitle: {
        fontWeight: "600",
        marginBottom: 8,
        fontSize: 16,
    },
    actions: {
        width: "100%",
        marginTop: 24,
    },
    actionsTitle: {
        fontWeight: "600",
        marginBottom: 8,
    },
    buttonRow: {
        flexDirection: "row",
        gap: 12,
    },
    navButtons: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 24,
        width: "100%",
    },
});
