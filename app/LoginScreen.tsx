import React, { useState, useContext } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    StyleSheet,
    ScrollView,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

import Button from "./src/components/Button";
import Header from "./src/components/Header";
import Loader from "./src/components/Loader";
import { ThemeContext } from "./src/context/ThemeContext";

export default function LoginScreen() {
    const { colors, darkMode } = useContext(ThemeContext);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Floating label animation
    const emailAnim = useState(new Animated.Value(email ? 1 : 0))[0];
    const passAnim = useState(new Animated.Value(password ? 1 : 0))[0];

    const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

    const handleLogin = async () => {
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
            // Mock API delay
            await new Promise((resolve) => setTimeout(resolve, 1400));

            await AsyncStorage.setItem("userToken", "mock-token-" + Date.now());
            router.replace("/(tabs)/01_DashboardScreen");
        } catch (err) {
            Alert.alert("Login Failed", "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const animateLabel = (anim: Animated.Value, toValue: number) => {
        Animated.timing(anim, {
            toValue,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    if (loading) {
        return <Loader message="Signing in..." />;
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={
                    darkMode
                        ? ["#0f172a", "#1e293b", "#0f172a"]
                        : ["#f8fafc", "#e2e8f0", "#f8fafc"]
                }
                style={styles.gradientBg}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoid}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Header
                            title="Welcome Back"
                            subtitle="Sign in to control your Smart Cleaner"
                        />

                        <View style={styles.formCard}>
                            {/* Email Field */}
                            <View style={styles.inputWrapper}>
                                <Animated.Text
                                    style={[
                                        styles.floatingLabel,
                                        {
                                            top: emailAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [18, 6],
                                            }),
                                            fontSize: emailAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [16, 12],
                                            }),
                                            color: emailAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [colors.textSecondary, colors.primary],
                                            }),
                                        },
                                    ]}
                                >
                                    Email
                                </Animated.Text>

                                <TextInput
                                    style={[
                                        styles.input,
                                        { borderColor: colors.border, color: colors.text },
                                    ]}
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        animateLabel(emailAnim, text.length > 0 ? 1 : 0);
                                    }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholder=""
                                    onFocus={() => animateLabel(emailAnim, 1)}
                                    onBlur={() => animateLabel(emailAnim, email ? 1 : 0)}
                                />

                                <Ionicons
                                    name="mail-outline"
                                    size={20}
                                    color={colors.primary}
                                    style={styles.inputIcon}
                                />
                            </View>

                            {/* Password Field */}
                            <View style={styles.inputWrapper}>
                                <Animated.Text
                                    style={[
                                        styles.floatingLabel,
                                        {
                                            top: passAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [18, 6],
                                            }),
                                            fontSize: passAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [16, 12],
                                            }),
                                            color: passAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [colors.textSecondary, colors.primary],
                                            }),
                                        },
                                    ]}
                                >
                                    Password
                                </Animated.Text>

                                <TextInput
                                    style={[
                                        styles.input,
                                        { borderColor: colors.border, color: colors.text },
                                    ]}
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        animateLabel(passAnim, text.length > 0 ? 1 : 0);
                                    }}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    placeholder=""
                                    onFocus={() => animateLabel(passAnim, 1)}
                                    onBlur={() => animateLabel(passAnim, password ? 1 : 0)}
                                />

                                <Ionicons
                                    name="lock-closed-outline"
                                    size={20}
                                    color={colors.primary}
                                    style={styles.inputIcon}
                                />

                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Forgot Password */}
                            <TouchableOpacity style={styles.forgotLink}>
                                <Text style={[styles.forgotText, { color: colors.primary }]}>
                                    Forgot password?
                                </Text>
                            </TouchableOpacity>

                            {/* Buttons */}
                            <View style={styles.buttonContainer}>
                                <Button
                                    title="Sign In"
                                    icon="log-in-outline"
                                    onPress={handleLogin}
                                    variant="primary"
                                    fullWidth
                                    size="large"
                                />

                                <View style={styles.orContainer}>
                                    <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                                    <Text style={[styles.orText, { color: colors.textSecondary }]}>
                                        OR
                                    </Text>
                                    <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                                </View>

                                <Button
                                    title="Create New Account"
                                    icon="person-add-outline"
                                    onPress={() => router.push("/SignupScreen")}
                                    variant="outline"
                                    fullWidth
                                    size="large"
                                />
                            </View>
                        </View>

                        <Text style={[styles.version, { color: colors.textSecondary }]}>
                            Version 1.0.0 • Smart Cleaner Pro
                        </Text>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    gradientBg: {
        flex: 1,
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
        justifyContent: "center",
    },
    formCard: {
        backgroundColor: "rgba(255,255,255,0.07)", // subtle glass-like in both modes
        borderRadius: 24,
        padding: 28,
        borderWidth: 1,
        borderColor: "rgba(200,200,200,0.12)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 10,
        marginTop: 20,
        marginBottom: 32,
    },
    inputWrapper: {
        marginBottom: 20,
        position: "relative",
    },
    input: {
        height: 56,
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 48,
        fontSize: 16,
    },
    inputIcon: {
        position: "absolute",
        left: 16,
        top: 18,
        zIndex: 1,
    },
    eyeIcon: {
        position: "absolute",
        right: 16,
        top: 18,
        zIndex: 1,
    },
    floatingLabel: {
        position: "absolute",
        left: 48,
        zIndex: 1,
        backgroundColor: "transparent",
        paddingHorizontal: 4,
    },
    forgotLink: {
        alignSelf: "flex-end",
        marginBottom: 24,
    },
    forgotText: {
        fontSize: 14,
        fontWeight: "600",
    },
    buttonContainer: {
        gap: 16,
    },
    orContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 8,
    },
    orLine: {
        flex: 1,
        height: 1,
        opacity: 0.4,
    },
    orText: {
        marginHorizontal: 16,
        fontSize: 13,
        fontWeight: "500",
    },
    version: {
        textAlign: "center",
        fontSize: 12,
        marginTop: 16,
    },
});