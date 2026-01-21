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
    const { darkMode } = useContext(ThemeContext);

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
            className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
            refreshControl={
                <RefreshControl refreshing={loading} onRefresh={fetchStatus} />
            }
        >
            <Header title="Dashboard" />

            <View className="p-6">
                {/* Robot Status Tiles */}
                <View className="flex-row gap-4 mb-6">
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
                    className={`rounded-xl p-4 shadow-sm border mb-6 ${
                        darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                    }`}
                >
                    <Text className={darkMode ? "text-gray-300" : "text-gray-600"}>
                        Last cleaned
                    </Text>
                    <Text
                        className={`text-lg font-semibold mt-1 ${
                            darkMode ? "text-white" : "text-black"
                        }`}
                    >
                        {status ? new Date(status.lastCleaned).toLocaleString() : "—"}
                    </Text>
                </View>

                {/* Error Section */}
                {status?.errors?.length ? (
                    <View className="bg-red-50 rounded-xl p-4 border border-red-200 mb-6">
                        <Text className="text-red-700 font-semibold mb-2">Errors</Text>
                        {status.errors.map((e, i) => (
                            <Text key={i} className="text-red-600">
                                • {e}
                            </Text>
                        ))}
                    </View>
                ) : null}

                {/* Navigation Buttons */}
                <View className="flex-row gap-3">
                    <Button title="Controls" onPress={() => router.push("/(tabs)/ControlScreen")} />
                    <Button title="Schedule" onPress={() => router.push("/(tabs)/ScheduleScreen")} variant="secondary" />
                    <Button title="Map" onPress={() => router.push("/(tabs)/MapScreen")} variant="secondary" />
                </View>
            </View>
        </ScrollView>
    );
}
