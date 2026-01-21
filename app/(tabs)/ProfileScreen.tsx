import React, { useContext } from "react";
import { View, Text, Switch, Alert } from "react-native";
import Button from "../src/components/Button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "../src/context/ThemeContext";
import { router } from "expo-router";

export default function ProfileScreen() {
    const { darkMode, toggleDarkMode } = useContext(ThemeContext);

    const handleLogout = async () => {
        await AsyncStorage.removeItem("userToken");
        Alert.alert("Logged Out", "You have been signed out successfully.");
        router.replace("/LoginScreen");
    };

    return (
        <View className={`flex-1 p-6 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
            <Text
                className={`text-2xl font-bold mb-6 ${
                    darkMode ? "text-white" : "text-black"
                }`}
            >
                Profile & Settings
            </Text>

            {/* Account Section */}
            <View
                className={`mb-6 rounded-xl p-4 shadow-sm border ${
                    darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
            >
                <Text
                    className={`text-lg font-semibold mb-2 ${
                        darkMode ? "text-gray-200" : "text-gray-800"
                    }`}
                >
                    Account
                </Text>
                <Button title="Logout" onPress={handleLogout} variant="danger" />
            </View>

            {/* Preferences Section */}
            <View
                className={`mb-6 rounded-xl p-4 shadow-sm border ${
                    darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
            >
                <Text
                    className={`text-lg font-semibold mb-2 ${
                        darkMode ? "text-gray-200" : "text-gray-800"
                    }`}
                >
                    Preferences
                </Text>
                <View className="flex-row items-center justify-between mb-2">
                    <Text className={darkMode ? "text-gray-200" : "text-gray-700"}>
                        Dark Mode
                    </Text>
                    <Switch value={darkMode} onValueChange={toggleDarkMode} />
                </View>
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
                    title="Schedule"
                    onPress={() => router.push("/(tabs)/ScheduleScreen")}
                    variant="secondary"
                />
                <Button
                    title="Map"
                    onPress={() => router.push("/(tabs)/MapScreen")}
                    variant="secondary"
                />
            </View>
        </View>
    );
}
