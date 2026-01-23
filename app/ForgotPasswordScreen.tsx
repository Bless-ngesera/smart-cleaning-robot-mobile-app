// screens/ForgotPasswordScreen.tsx
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
import { router } from "expo-router";

import Button from "./src/components/Button";
import Header from "./src/components/Header";
import Loader from "./src/components/Loader";
import { ThemeContext } from "./src/context/ThemeContext";

export default function ForgotPasswordScreen() {
    const { colors, darkMode } = useContext(ThemeContext);

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const emailAnim = useState(new Animated.Value(0))[0];
    const [emailError, setEmailError] = useState("");

    const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

    const handleReset = async () => {
        setEmailError("");

        if (!email) {
            setEmailError("Email is required");
            return;
        }
        if (!validateEmail(email)) {
            setEmailError("Please enter a valid email address");
            return;
        }

        setLoading(true);
        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1400));

            // In real app → call your backend password reset endpoint
            // await api.post('/auth/reset-password', { email });

            setSent(true);
        } catch (err) {
            Alert.alert("Error", "Failed to send reset link. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const animateLabel = (toValue: number) => {
        Animated.timing(emailAnim, {
            toValue,
            duration: 180,
            useNativeDriver: false,
        }).start();
    };

    if (loading) {
        return <Loader message="Sending reset link..." />;
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
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Header
                            title="Reset Password"
                            subtitle="We'll send you a link to reset your password"
                        />

                        {sent ? (
                            <View style={styles.successCard}>
                                <Ionicons name="checkmark-circle" size={64} color="#10b981" />
                                <Text style={[styles.successTitle, { color: colors.text }]}>
                                    Check your email
                                </Text>
                                <Text style={[styles.successText, { color: colors.textSecondary }]}>
                                    We sent a password reset link to{"\n"}
                                    <Text style={{ color: colors.primary, fontWeight: "600" }}>
                                        {email}
                                    </Text>
                                </Text>

                                <Button
                                    title="Back to Login"
                                    variant="primary"
                                    onPress={() => router.push("/LoginScreen")}
                                    fullWidth
                                    style={{ marginTop: 32 }}
                                />
                            </View>
                        ) : (
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
                                            {
                                                borderColor: emailError ? "#ef4444" : colors.border,
                                                color: colors.text,
                                            },
                                        ]}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        placeholder=""
                                        onFocus={() => animateLabel(1)}
                                        onBlur={() => animateLabel(email ? 1 : 0)}
                                    />

                                    <Ionicons
                                        name="mail-outline"
                                        size={20}
                                        color={colors.primary}
                                        style={styles.inputIcon}
                                    />

                                    {emailError ? (
                                        <Text style={styles.errorText}>{emailError}</Text>
                                    ) : null}
                                </View>

                                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                                    Enter the email associated with your account and we'll send you a reset link.
                                </Text>

                                <View style={{ marginTop: 32, gap: 16 }}>
                                    <Button
                                        title="Send Reset Link"
                                        icon="mail-outline"
                                        onPress={handleReset}
                                        variant="primary"
                                        fullWidth
                                        size="large"
                                    />

                                    <TouchableOpacity
                                        style={styles.backLink}
                                        onPress={() => router.back()}
                                    >
                                        <Ionicons
                                            name="arrow-back-outline"
                                            size={18}
                                            color={colors.primary}
                                        />
                                        <Text style={[styles.backText, { color: colors.primary }]}>
                                            Back to Login
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

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
    safeArea: { flex: 1 },
    gradientBg: { flex: 1 },
    keyboardAvoid: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
        justifyContent: "center",
    },
    formCard: {
        backgroundColor: "rgba(255,255,255,0.07)",
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
    successCard: {
        alignItems: "center",
        backgroundColor: "rgba(16,185,129,0.08)",
        borderRadius: 24,
        padding: 40,
        borderWidth: 1,
        borderColor: "rgba(16,185,129,0.2)",
        marginTop: 20,
        marginBottom: 32,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: "700",
        marginTop: 16,
        marginBottom: 8,
    },
    successText: {
        fontSize: 16,
        textAlign: "center",
        lineHeight: 24,
    },
    inputWrapper: { marginBottom: 20, position: "relative" },
    input: {
        height: 56,
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 48,
        fontSize: 16,
    },
    inputIcon: { position: "absolute", left: 16, top: 18, zIndex: 1 },
    floatingLabel: {
        position: "absolute",
        left: 48,
        zIndex: 1,
        backgroundColor: "transparent",
        paddingHorizontal: 4,
    },
    errorText: {
        color: "#ef4444",
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
        marginTop: 8,
    },
    backLink: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
    },
    backText: { fontSize: 15, fontWeight: "600" },
    version: { textAlign: "center", fontSize: 12, marginTop: 16 },
});