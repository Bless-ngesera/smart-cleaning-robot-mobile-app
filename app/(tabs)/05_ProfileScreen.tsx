import React, { useContext } from "react";
import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import Button from "../src/components/Button";
import Header from "../src/components/Header";
import { ThemeContext } from "../src/context/ThemeContext";

export default function ProfileScreen() {
    const { darkMode, toggleTheme } = useContext(ThemeContext);

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem("userToken");
            router.replace("/LoginScreen"); // ✅ send back to login
        } catch {
            Alert.alert("Logout Failed", "Something went wrong. Please try again.");
        }
    };

    return (
        <SafeAreaView
            className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
            edges={["top", "bottom"]}
        >
            <Header title="Profile" subtitle="Manage your account settings" />

            <View className="flex-1 items-center justify-center px-6">
                <View
                    className={`w-full rounded-2xl p-6 shadow-md border gap-4 ${
                        darkMode
                            ? "bg-gray-800 border-gray-700"
                            : "bg-white border-gray-200"
                    }`}
                >
                    <Text
                        className={`text-lg font-semibold mb-4 ${
                            darkMode ? "text-white" : "text-gray-900"
                        }`}
                    >
                        Welcome back, User!
                    </Text>

                    {/* ✅ Toggle Dark/Light Mode */}
                    <Button
                        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        icon={darkMode ? "sunny-outline" : "moon-outline"}
                        onPress={toggleTheme}
                        variant="secondary"
                    />

                    {/* ✅ Logout Button */}
                    <Button
                        title="Logout"
                        icon="log-out-outline"
                        onPress={handleLogout}
                        variant="primary"
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}
