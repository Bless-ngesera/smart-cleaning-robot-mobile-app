import React, { useContext } from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import Button from "../src/components/Button";
import Header from "../src/components/Header";
import { ThemeContext } from "../src/context/ThemeContext";

export default function ProfileScreen() {
    const { colors, darkMode, toggleTheme } = useContext(ThemeContext);

    /* ---------------- Handle Logout ---------------- */
    const handleLogout = async () => {
        try {
            // C++ BRIDGE: Integrate native secure logout if robot/user data is tied to hardware
            await AsyncStorage.removeItem("userToken");
            router.replace("/LoginScreen"); // ✅ send back to login
        } catch {
            Alert.alert("Logout Failed", "Something went wrong. Please try again.");
        }
    };

    /* --------------------------- UI --------------------------- */
    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={["top", "bottom"]}
        >
            <Header title="Profile" subtitle="Manage your account settings" />

            <View style={styles.content}>
                <View
                    style={[
                        styles.card,
                        { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                >
                    <Text style={[styles.welcomeText, { color: colors.text }]}>
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

/* ---------------------------- Styles ----------------------------- */
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    card: {
        width: "100%",
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        gap: 16,
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
    },
});
