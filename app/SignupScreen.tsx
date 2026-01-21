import React, { useState, useContext } from "react";
import {
    View,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import Button from "./src/components/Button";
import Header from "./src/components/Header";
import Loader from "./src/components/Loader";
import { ThemeContext } from "./src/context/ThemeContext";

export default function SignupScreen() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { darkMode } = useContext(ThemeContext);

    const validateEmail = (value: string): boolean => /\S+@\S+\.\S+/.test(value);

    const handleSignup = async (): Promise<void> => {
        if (!name || !email || !password) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }
        if (!validateEmail(email)) {
            Alert.alert("Error", "Please enter a valid email address.");
            return;
        }
        if (password.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await AsyncStorage.setItem("userToken", "mock-token");
            router.replace("/(tabs)/01_DashboardScreen"); // ✅ fixed route
        } catch {
            Alert.alert("Signup Failed", "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loader message="Creating account..." />;

    return (
        <SafeAreaView className="flex-1">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <Header title="Sign Up" subtitle="Create your robot account" />

                    <View className="flex-1 items-center justify-center px-6">
                        <View
                            className={`w-full rounded-2xl p-6 shadow-md border gap-4 ${
                                darkMode
                                    ? "bg-gray-800 border-gray-700"
                                    : "bg-white border-gray-200"
                            }`}
                        >
                            <TextInput
                                placeholder="Name"
                                autoCapitalize="words"
                                value={name}
                                onChangeText={setName}
                                placeholderTextColor={darkMode ? "#9CA3AF" : "#6B7280"}
                                className={`border rounded-xl p-3 ${
                                    darkMode
                                        ? "border-gray-600 bg-gray-700 text-white"
                                        : "border-gray-300 bg-gray-50 text-black"
                                }`}
                            />
                            <TextInput
                                placeholder="Email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                                placeholderTextColor={darkMode ? "#9CA3AF" : "#6B7280"}
                                className={`border rounded-xl p-3 ${
                                    darkMode
                                        ? "border-gray-600 bg-gray-700 text-white"
                                        : "border-gray-300 bg-gray-50 text-black"
                                }`}
                            />
                            <TextInput
                                placeholder="Password"
                                secureTextEntry
                                autoCapitalize="none"
                                value={password}
                                onChangeText={setPassword}
                                placeholderTextColor={darkMode ? "#9CA3AF" : "#6B7280"}
                                className={`border rounded-xl p-3 ${
                                    darkMode
                                        ? "border-gray-600 bg-gray-700 text-white"
                                        : "border-gray-300 bg-gray-50 text-black"
                                }`}
                            />

                            <View className="gap-3 mt-4">
                                <Button
                                    title="Sign Up"
                                    icon="person-add-outline"
                                    onPress={handleSignup}
                                    loading={loading}
                                    variant="primary"
                                />
                                <Button
                                    title="Back to Login"
                                    icon="log-in-outline"
                                    onPress={() => router.push("/LoginScreen")}
                                    variant="secondary"
                                />
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}