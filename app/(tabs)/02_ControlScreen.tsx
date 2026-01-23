import React, { useState, useContext } from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import Button from "../src/components/Button";
import Header from "../src/components/Header";
import Loader from "../src/components/Loader";
import { ThemeContext } from "../src/context/ThemeContext";
import { router } from "expo-router";

export default function ControlScreen() {
    const [busy, setBusy] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const { colors } = useContext(ThemeContext);

    /* ---------------- Simulated Robot Actions ---------------- */
    const simulateAction = async (
        message: string,
        log: string,
        errorMsg: string
    ) => {
        setBusy(true);
        setLoadingMessage(message);
        try {
            console.log(log);

            // C++ BRIDGE: Replace with RobotBridge.start(), stop(), dock() etc.
            await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch {
            Alert.alert("Error", errorMsg);
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
            <Header title="Control Robot" />

            <View style={styles.content}>
                {/* ---------------- Main Control Buttons ---------------- */}
                <Button
                    title="Start Cleaning"
                    icon="play-outline"
                    onPress={() =>
                        simulateAction(
                            "Starting cleaning...",
                            "Start cleaning (mock)",
                            "Failed to start cleaning."
                        )
                    }
                />
                <Button
                    title="Stop Cleaning"
                    icon="stop-outline"
                    variant="secondary"
                    onPress={() =>
                        simulateAction(
                            "Stopping cleaning...",
                            "Stop cleaning (mock)",
                            "Failed to stop cleaning."
                        )
                    }
                />
                <Button
                    title="Return to Dock"
                    icon="home-outline"
                    variant="secondary"
                    onPress={() =>
                        simulateAction(
                            "Returning to dock...",
                            "Return to dock (mock)",
                            "Failed to dock robot."
                        )
                    }
                />

                {/* ---------------- Manual Controls ---------------- */}
                <View
                    style={[
                        styles.card,
                        { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                >
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                        Manual Controls
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.subtitle }]}>
                        Joystick and advanced controls coming soon…
                    </Text>
                    {/* C++ BRIDGE: Integrate joystick and directional controls here */}
                </View>

                {/* ---------------- Navigation Buttons ---------------- */}
                <View style={styles.navButtons}>
                    <Button
                        title="Dashboard"
                        icon="grid-outline"
                        variant="secondary"
                        onPress={() => router.push("./DashboardScreen")}
                    />
                    <Button
                        title="Schedule"
                        icon="calendar-outline"
                        variant="secondary"
                        onPress={() => router.push("./ScheduleScreen")}
                    />
                    <Button
                        title="Map"
                        icon="map-outline"
                        variant="secondary"
                        onPress={() => router.push("./MapScreen")}
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
        padding: 24,
        gap: 16,
    },
    card: {
        marginTop: 24,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: {
        fontWeight: "600",
        fontSize: 16,
        marginBottom: 6,
    },
    cardSubtitle: {
        fontSize: 14,
    },
    navButtons: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 24,
    },
});
