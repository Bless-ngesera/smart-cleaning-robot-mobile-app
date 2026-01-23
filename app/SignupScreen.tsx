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

export default function SignupScreen() {
    const { colors, darkMode } = useContext(ThemeContext);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Error states
    const [nameError, setNameError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmError, setConfirmError] = useState("");

    // Floating label animations
    const nameAnim = useState(new Animated.Value(0))[0];
    const emailAnim = useState(new Animated.Value(0))[0];
    const passAnim = useState(new Animated.Value(0))[0];
    const confirmAnim = useState(new Animated.Value(0))[0];

    const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

    const getPasswordStrength = () => {
        if (password.length < 6) return { strength: "Weak", color: "#ef4444", width: "33%" };
        if (password.length < 10) return { strength: "Medium", color: "#f59e0b", width: "66%" };
        return { strength: "Strong", color: "#10b981", width: "100%" };
    };

    const { strength, color, width } = getPasswordStrength();

    const validateForm = () => {
        let valid = true;

        setNameError("");
        setEmailError("");
        setPasswordError("");
        setConfirmError("");

        if (!name.trim()) {
            setNameError("Name is required");
            valid = false;
        } else if (name.trim().length < 2) {
            setNameError("Name must be at least 2 characters");
            valid = false;
        }

        if (!email) {
            setEmailError("Email is required");
            valid = false;
        } else if (!validateEmail(email)) {
            setEmailError("Please enter a valid email address");
            valid = false;
        }

        if (!password) {
            setPasswordError("Password is required");
            valid = false;
        } else if (password.length < 6) {
            setPasswordError("Password must be at least 6 characters");
            valid = false;
        }

        if (!confirmPassword) {
            setConfirmError("Please confirm your password");
            valid = false;
        } else if (confirmPassword !== password) {
            setConfirmError("Passwords do not match");
            valid = false;
        }

        return valid;
    };

    const handleSignup = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 1400));

            await AsyncStorage.setItem("userToken", "mock-token-" + Date.now());
            await AsyncStorage.setItem("userName", name.trim());
            await AsyncStorage.setItem("userEmail", email.trim());

            router.replace("/(tabs)/01_DashboardScreen");
        } catch (err) {
            Alert.alert("Signup Failed", "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const animateLabel = (anim: Animated.Value, toValue: number) => {
        Animated.timing(anim, {
            toValue,
            duration: 180,
            useNativeDriver: false,
        }).start();
    };

    if (loading) {
        return <Loader message="Creating your account..." />;
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
                            title="Create Account"
                            subtitle="Join Smart Cleaner Pro today"
                        />

                        <View style={styles.formCard}>
                            {/* Name */}
                            <View style={styles.inputWrapper}>
                                <Animated.Text
                                    style={[
                                        styles.floatingLabel,
                                        {
                                            top: nameAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 6] }),
                                            fontSize: nameAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                                            color: nameAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [colors.textSecondary, colors.primary],
                                            }),
                                        },
                                    ]}
                                >
                                    Full Name
                                </Animated.Text>
                                <TextInput
                                    style={[styles.input, { borderColor: nameError ? "#ef4444" : colors.border, color: colors.text }]}
                                    value={name}
                                    onChangeText={(text) => {
                                        setName(text);
                                        animateLabel(nameAnim, text.length > 0 ? 1 : 0);
                                    }}
                                    autoCapitalize="words"
                                    placeholder=""
                                    onFocus={() => animateLabel(nameAnim, 1)}
                                    onBlur={() => animateLabel(nameAnim, name ? 1 : 0)}
                                />
                                <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                            </View>

                            {/* Email */}
                            <View style={styles.inputWrapper}>
                                <Animated.Text
                                    style={[
                                        styles.floatingLabel,
                                        {
                                            top: emailAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 6] }),
                                            fontSize: emailAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
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
                                    style={[styles.input, { borderColor: emailError ? "#ef4444" : colors.border, color: colors.text }]}
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
                                <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                            </View>

                            {/* Password */}
                            <View style={styles.inputWrapper}>
                                <Animated.Text
                                    style={[
                                        styles.floatingLabel,
                                        {
                                            top: passAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 6] }),
                                            fontSize: passAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
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
                                    style={[styles.input, { borderColor: passwordError ? "#ef4444" : colors.border, color: colors.text }]}
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
                                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={colors.textSecondary}
                                    />
                                </TouchableOpacity>

                                {password.length > 0 && (
                                    <View style={styles.strengthBarContainer}>
                                        <View style={[styles.strengthBar, { backgroundColor: color, width }]} />
                                        <Text style={[styles.strengthText, { color }]}>{strength}</Text>
                                    </View>
                                )}

                                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                            </View>

                            {/* Confirm Password */}
                            <View style={styles.inputWrapper}>
                                <Animated.Text
                                    style={[
                                        styles.floatingLabel,
                                        {
                                            top: confirmAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 6] }),
                                            fontSize: confirmAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                                            color: confirmAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [colors.textSecondary, colors.primary],
                                            }),
                                        },
                                    ]}
                                >
                                    Confirm Password
                                </Animated.Text>
                                <TextInput
                                    style={[styles.input, { borderColor: confirmError ? "#ef4444" : colors.border, color: colors.text }]}
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        animateLabel(confirmAnim, text.length > 0 ? 1 : 0);
                                    }}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                    placeholder=""
                                    onFocus={() => animateLabel(confirmAnim, 1)}
                                    onBlur={() => animateLabel(confirmAnim, confirmPassword ? 1 : 0)}
                                />
                                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={colors.textSecondary}
                                    />
                                </TouchableOpacity>

                                {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
                            </View>

                            {/* Terms */}
                            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                                By creating an account, you agree to our{" "}
                                <Text style={{ color: colors.primary }}>Terms of Service</Text> and{" "}
                                <Text style={{ color: colors.primary }}>Privacy Policy</Text>
                            </Text>

                            {/* Action Buttons */}
                            <View style={styles.buttonContainer}>
                                <Button
                                    title="Create Account"
                                    icon="person-add-outline"
                                    onPress={handleSignup}
                                    variant="primary"
                                    fullWidth
                                    size="large"
                                />

                                {/* Social Signup (placeholders – connect real SDKs later) */}
                                <View style={styles.socialContainer}>
                                    <TouchableOpacity style={[styles.socialButton, { backgroundColor: "#4285F4" }]}>
                                        <Ionicons name="logo-google" size={20} color="#fff" />
                                        <Text style={styles.socialButtonText}>Sign up with Google</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.socialButton, { backgroundColor: "#000" }]}>
                                        <Ionicons name="logo-apple" size={20} color="#fff" />
                                        <Text style={styles.socialButtonText}>Sign up with Apple</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={styles.backToLogin}
                                    onPress={() => router.push("/LoginScreen")}
                                >
                                    <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
                                    <Text style={[styles.backToLoginText, { color: colors.primary }]}>
                                        Already have an account? Sign in
                                    </Text>
                                </TouchableOpacity>
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
    inputWrapper: { marginBottom: 20, position: "relative" },
    input: {
        height: 56,
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 48,
        fontSize: 16,
    },
    inputIcon: { position: "absolute", left: 16, top: 18, zIndex: 1 },
    eyeIcon: { position: "absolute", right: 16, top: 18, zIndex: 1 },
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
    strengthBarContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        gap: 8,
    },
    strengthBar: {
        height: 6,
        borderRadius: 3,
    },
    strengthText: {
        fontSize: 12,
        fontWeight: "600",
    },
    termsText: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 8,
        marginBottom: 24,
        textAlign: "center",
    },
    buttonContainer: { gap: 16 },
    socialContainer: { gap: 12, marginTop: 12 },
    socialButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 12,
        gap: 10,
    },
    socialButtonText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    backToLogin: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
    },
    backToLoginText: { fontSize: 15, fontWeight: "600" },
    version: { textAlign: "center", fontSize: 12, marginTop: 16 },
});