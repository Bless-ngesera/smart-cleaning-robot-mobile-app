import React, { useState, useContext } from "react";
import { View, Text, Alert } from "react-native";
import Button from "../src/components/Button";
import Header from "../src/components/Header";
import Loader from "../src/components/Loader";
import { ThemeContext } from "../src/context/ThemeContext";
import { router } from "expo-router";

export default function ControlScreen() {
    const [busy, setBusy] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const { darkMode } = useContext(ThemeContext);

    const simulateAction = async (message: string, log: string, errorMsg: string) => {
        setBusy(true);
        setLoadingMessage(message);
        try {
            console.log(log);
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

    return (
        <View className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
            <Header title="Control Robot" />

            <View className="p-6 gap-4">
                {/* Main Control Buttons */}
                <Button title="Start Cleaning" onPress={() => simulateAction("Starting cleaning...", "Start cleaning (mock)", "Failed to start cleaning.")} />
                <Button title="Stop Cleaning" onPress={() => simulateAction("Stopping cleaning...", "Stop cleaning (mock)", "Failed to stop cleaning.")} variant="secondary" />
                <Button title="Return to Dock" onPress={() => simulateAction("Returning to dock...", "Return to dock (mock)", "Failed to dock robot.")} variant="secondary" />

                {/* Manual Controls Section */}
                <View
                    className={`mt-8 rounded-xl p-4 shadow-sm border ${
                        darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                    }`}
                >
                    <Text className={`font-semibold mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                        Manual Controls
                    </Text>
                    <Text className={darkMode ? "text-gray-400" : "text-gray-500"}>
                        Joystick and advanced controls coming soon…
                    </Text>
                </View>

                {/* Navigation Buttons */}
                <View className="flex-row gap-3 mt-6">
                    <Button title="Dashboard" onPress={() => router.push("/(tabs)/DashboardScreen")} variant="secondary" />
                    <Button title="Schedule" onPress={() => router.push("/(tabs)/ScheduleScreen")} variant="secondary" />
                    <Button title="Map" onPress={() => router.push("/(tabs)/MapScreen")} variant="secondary" />
                </View>
            </View>
        </View>
    );
}
