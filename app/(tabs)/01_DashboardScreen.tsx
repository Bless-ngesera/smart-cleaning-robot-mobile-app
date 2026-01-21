import { View, Text, RefreshControl, ScrollView, Alert } from "react-native";
import { useEffect, useState, useCallback, useContext } from "react";
import { router } from "expo-router";
import Button from "../src/components/Button";
import StatTile from "../src/components/StatTile";
import Header from "../src/components/Header";
import Loader from "../src/components/Loader";
import { getRobotStatus } from "../src/services/robotService";
import { ThemeContext } from "../src/context/ThemeContext";

type RobotStatus = {
    batteryLevel: number;
    isCleaning: boolean;
    lastCleaned: string;
    errors: string[];
};

export default function DashboardScreen() {
    const [status, setStatus] = useState<RobotStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const { colors } = useContext(ThemeContext);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        try {
            const s = await getRobotStatus();
            setStatus(s);
        } catch (err) {
            Alert.alert("Error", "Failed to fetch robot status.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    if (loading && !status) {
        return <Loader message="Fetching robot status..." />;
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            refreshControl={
                <RefreshControl refreshing={loading} onRefresh={fetchStatus} />
            }
        >
            <Header title="Dashboard" />

            <View style={{ padding: 24 }}>
                {/* Robot Status Tiles */}
                <View style={{ flexDirection: "row", gap: 16, marginBottom: 24 }}>
                    <StatTile
                        label="Battery"
                        value={status ? `${status.batteryLevel}%` : "--"}
                    />
                    <StatTile
                        label="State"
                        value={status ? (status.isCleaning ? "Cleaning" : "Idle") : "--"}
                    />
                </View>

                {/* Last Cleaned Info */}
                <View
                    style={{
                        borderRadius: 12,
                        padding: 16,
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: 1,
                        marginBottom: 24,
                        shadowColor: "#000",
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                    }}
                >
                    <Text style={{ color: colors.subtitle }}>Last cleaned</Text>
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: "600",
                            marginTop: 4,
                            color: colors.text,
                        }}
                    >
                        {status ? new Date(status.lastCleaned).toLocaleString() : "—"}
                    </Text>
                </View>

                {/* Error Section */}
                {status?.errors?.length ? (
                    <View
                        style={{
                            backgroundColor: "#fef2f2",
                            borderRadius: 12,
                            padding: 16,
                            borderColor: "#fecaca",
                            borderWidth: 1,
                            marginBottom: 24,
                        }}
                    >
                        <Text style={{ color: "#b91c1c", fontWeight: "600", marginBottom: 8 }}>
                            Errors
                        </Text>
                        {status.errors.map((e, i) => (
                            <Text key={i} style={{ color: "#dc2626" }}>
                                • {e}
                            </Text>
                        ))}
                    </View>
                ) : null}

                {/* Navigation Buttons */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                    <Button
                        title="Controls"
                        onPress={() => router.push("/(tabs)/02_ControlScreen")}
                    />
                    <Button
                        title="Schedule"
                        onPress={() => router.push("/(tabs)/04_ScheduleScreen")}
                        variant="secondary"
                    />
                    <Button
                        title="Map"
                        onPress={() => router.push("/(tabs)/03_MapScreen")}
                        variant="secondary"
                    />
                </View>
            </View>
        </ScrollView>
    );
}
