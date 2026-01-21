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
    const { colors } = useContext(ThemeContext);

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
            await AsyncStorage.setItem("userName", name);
            await AsyncStorage.setItem("userEmail", email);
            router.replace("/(tabs)/01_DashboardScreen"); // ✅ fixed route
        } catch {
            Alert.alert("Signup Failed", "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loader message="Creating account..." />;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <Header title="Sign Up" subtitle="Create your robot account" />

                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
                        <View
                            style={{
                                width: "100%",
                                borderRadius: 16,
                                padding: 20,
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                borderWidth: 1,
                                shadowColor: "#000",
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                gap: 16,
                            }}
                        >
                            <TextInput
                                placeholder="Name"
                                autoCapitalize="words"
                                value={name}
                                onChangeText={setName}
                                placeholderTextColor={colors.subtitle}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 12,
                                    padding: 12,
                                    backgroundColor: colors.background,
                                    color: colors.text,
                                    marginBottom: 12,
                                }}
                            />
                            <TextInput
                                placeholder="Email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                                placeholderTextColor={colors.subtitle}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 12,
                                    padding: 12,
                                    backgroundColor: colors.background,
                                    color: colors.text,
                                    marginBottom: 12,
                                }}
                            />
                            <TextInput
                                placeholder="Password"
                                secureTextEntry
                                autoCapitalize="none"
                                value={password}
                                onChangeText={setPassword}
                                placeholderTextColor={colors.subtitle}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 12,
                                    padding: 12,
                                    backgroundColor: colors.background,
                                    color: colors.text,
                                    marginBottom: 12,
                                }}
                            />

                            <View style={{ gap: 12, marginTop: 16 }}>
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
