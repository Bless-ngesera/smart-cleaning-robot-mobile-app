import React, { useState, useContext } from "react";
import { View, Text, TextInput, FlatList, Alert } from "react-native";
import Button from "../src/components/Button";
import Header from "../src/components/Header";
import Loader from "../src/components/Loader";
import { ThemeContext } from "../src/context/ThemeContext";
import { router } from "expo-router";

type Entry = { day: string; time: string };

export default function ScheduleScreen() {
    const [schedule, setSchedule] = useState<Entry[]>([]);
    const [day, setDay] = useState("");
    const [time, setTime] = useState("");
    const [busy, setBusy] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const { darkMode } = useContext(ThemeContext);

    const addSchedule = () => {
        if (!day || !time) {
            Alert.alert("Error", "Please enter both day and time.");
            return;
        }

        const newEntry = { day, time };
        setSchedule([...schedule, newEntry]);
        setDay("");
        setTime("");

        Alert.alert("Success", "Routine added successfully!");
    };

    const syncFromRobot = async () => {
        setBusy(true);
        setLoadingMessage("Syncing schedule from robot...");
        try {
            console.log("Sync schedule (mock)");
            await new Promise((resolve) => setTimeout(resolve, 1500));
        } catch {
            Alert.alert("Error", "Failed to sync schedule.");
        } finally {
            setBusy(false);
        }
    };

    if (busy) {
        return <Loader message={loadingMessage} />;
    }

    return (
        <View className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
            <Header title="Cleaning Schedule" />

            <View className="p-6">
                {/* Existing Schedule List */}
                <FlatList
                    data={schedule}
                    keyExtractor={(_, i) => i.toString()}
                    ListEmptyComponent={
                        <Text
                            className={`text-center mb-4 ${
                                darkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                        >
                            No routines yet. Add one below.
                        </Text>
                    }
                    renderItem={({ item }) => (
                        <View
                            className={`rounded-xl p-4 mb-3 shadow-sm border ${
                                darkMode
                                    ? "bg-gray-800 border-gray-700"
                                    : "bg-white border-gray-100"
                            }`}
                        >
                            <Text
                                className={`font-semibold ${
                                    darkMode ? "text-gray-200" : "text-gray-800"
                                }`}
                            >
                                {item.day}
                            </Text>
                            <Text className={darkMode ? "text-gray-400" : "text-gray-600"}>
                                {item.time}
                            </Text>
                        </View>
                    )}
                />

                {/* Add New Routine */}
                <View
                    className={`rounded-xl p-4 shadow-sm border mt-4 ${
                        darkMode
                            ? "bg-gray-800 border-gray-700"
                            : "bg-white border-gray-100"
                    }`}
                >
                    <Text
                        className={`font-semibold mb-3 ${
                            darkMode ? "text-gray-200" : "text-gray-700"
                        }`}
                    >
                        Add New Routine
                    </Text>
                    <TextInput
                        placeholder="Day (e.g., Monday)"
                        value={day}
                        onChangeText={setDay}
                        placeholderTextColor={darkMode ? "#9CA3AF" : "#6B7280"}
                        className={`border rounded-xl p-3 mb-3 ${
                            darkMode
                                ? "border-gray-600 bg-gray-700 text-white"
                                : "border-gray-300 bg-gray-50 text-black"
                        }`}
                    />
                    <TextInput
                        placeholder="Time (e.g., 10:00 AM)"
                        value={time}
                        onChangeText={setTime}
                        placeholderTextColor={darkMode ? "#9CA3AF" : "#6B7280"}
                        className={`border rounded-xl p-3 mb-3 ${
                            darkMode
                                ? "border-gray-600 bg-gray-700 text-white"
                                : "border-gray-300 bg-gray-50 text-black"
                        }`}
                    />
                    <View className="flex-row gap-3">
                        <Button title="Add Schedule" onPress={addSchedule} />
                        <Button
                            title="Sync from Robot"
                            onPress={syncFromRobot}
                            variant="secondary"
                        />
                    </View>
                </View>

                {/* Helpful Tip */}
                <View
                    className={`rounded-xl p-4 border mt-6 ${
                        darkMode
                            ? "bg-gray-800 border-gray-700"
                            : "bg-blue-50 border-blue-200"
                    }`}
                >
                    <Text className={darkMode ? "text-gray-300" : "text-blue-700"}>
                        Tip: Keep routines short and avoid overlapping times to reduce battery strain.
                    </Text>
                </View>

                {/* Navigation Buttons */}
                <View className="flex-row gap-3 mt-6">
                    <Button
                        title="Dashboard"
                        onPress={() => router.push("/(tabs)/DashboardScreen")}
                        variant="secondary"
                    />
                    <Button
                        title="Control"
                        onPress={() => router.push("/(tabs)/ControlScreen")}
                        variant="secondary"
                    />
                    <Button
                        title="Map"
                        onPress={() => router.push("/(tabs)/MapScreen")}
                        variant="secondary"
                    />
                </View>
            </View>
        </View>
    );
}
