import { View, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from "react-native";
import Button from "./src/components/Button";
import Header from "./src/components/Header";
import Loader from "./src/components/Loader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useContext } from "react";
import { router } from "expo-router";
import { ThemeContext } from "./src/context/ThemeContext";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { darkMode } = useContext(ThemeContext);

    const validateEmail = (value: string): boolean => /\S+@\S+\.\S+/.test(value);

    const handleLogin = async (): Promise<void> => {
        if (!email || !password) {
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
            // simulate login delay
            await new Promise((resolve) => setTimeout(resolve, 1500));
            // save token
            await AsyncStorage.setItem("userToken", "mock-token");
            // redirect to dashboard
            router.replace("/(tabs)/DashboardScreen");
        } catch {
            Alert.alert("Login Failed", "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Loader message="Logging in..." />;
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <Header title="Login" subtitle="Access your smart cleaning robot" />

                <View className="flex-1 items-center justify-center px-6">
                    <View
                        className={`w-full rounded-2xl p-6 shadow-md border ${
                            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                        }`}
                    >
                        <TextInput
                            placeholder="Email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                            placeholderTextColor={darkMode ? "#9CA3AF" : "#6B7280"}
                            className={`border rounded-xl p-3 mb-4 ${
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
                            className={`border rounded-xl p-3 mb-6 ${
                                darkMode
                                    ? "border-gray-600 bg-gray-700 text-white"
                                    : "border-gray-300 bg-gray-50 text-black"
                            }`}
                        />

                        {/* Login button with icon + spinner */}
                        <Button
                            title="Login"
                            icon="log-in-outline"
                            onPress={handleLogin}
                            loading={loading}
                            variant="primary"
                        />

                        {/* Signup navigation button */}
                        <Button
                            title="Create Account"
                            icon="person-add-outline"
                            onPress={() => router.push("/SignupScreen")}
                            variant="secondary"
                            fullWidth={false}
                        />
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
