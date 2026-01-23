import React, { useState, useContext, useEffect, useRef } from "react";
import { View, Text, Alert, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Header from "../src/components/Header";
import Loader from "../src/components/Loader";
import Button from "../src/components/Button";
import { ThemeContext } from "../src/context/ThemeContext";
import { router } from "expo-router";

export default function MapScreen() {
    const [busy, setBusy] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const { colors, darkMode } = useContext(ThemeContext);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Entrance animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulse animation for map indicator
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        );
        pulseAnimation.start();

        return () => pulseAnimation.stop();
    }, []);

    /* ---------------- Fetch Robot Map ---------------- */
    const fetchMap = async () => {
        setBusy(true);
        setLoadingMessage("Fetching robot map...");
        try {
            // C++ BRIDGE: Replace with RobotBridge.getMap() for native robot mapping integration
            console.log("Fetch map (mock)");
            await new Promise((resolve) => setTimeout(resolve, 1500)); // mock delay
        } catch {
            Alert.alert("Error", "Failed to fetch robot map.");
        } finally {
            setBusy(false);
        }
    };

    if (busy) {
        return <Loader message={loadingMessage} />;
    }

    /* --------------------------- UI --------------------------- */
    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={["top", "bottom"]}
        >
            <Header title="Robot Map" subtitle="View navigation and cleaning zones" />

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}
            >
                {/* ---------------- Premium Map Container ---------------- */}
                <LinearGradient
                    colors={darkMode
                        ? ['rgba(99, 102, 241, 0.15)', 'rgba(99, 102, 241, 0.05)']
                        : ['rgba(99, 102, 241, 0.08)', 'rgba(99, 102, 241, 0.02)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.mapGradientContainer}
                >
                    <View
                        style={[
                            styles.mapBox,
                            {
                                backgroundColor: colors.card,
                                borderColor: darkMode ? 'rgba(99, 102, 241, 0.3)' : colors.border
                            },
                        ]}
                    >
                        {/* Map Placeholder with Icon */}
                        <View style={styles.mapPlaceholder}>
                            <LinearGradient
                                colors={[colors.primary, colors.primary + "CC"]}
                                style={styles.mapIconContainer}
                            >
                                <Ionicons name="map" size={48} color="#FFFFFF" />
                            </LinearGradient>

                            <Text style={[styles.mapPlaceholderTitle, { color: colors.text }]}>
                                Map Visualization
                            </Text>
                            <Text style={[styles.mapPlaceholderSubtitle, { color: colors.textSecondary }]}>
                                Real-time navigation coming soon
                            </Text>

                            {/* Animated Pulse Indicator */}
                            <Animated.View
                                style={[
                                    styles.pulseIndicator,
                                    {
                                        backgroundColor: colors.primary + "30",
                                        transform: [{ scale: pulseAnim }]
                                    }
                                ]}
                            />
                        </View>

                        {/* Grid Pattern Overlay */}
                        <View style={styles.gridOverlay}>
                            {[...Array(8)].map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.gridLine,
                                        { backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }
                                    ]}
                                />
                            ))}
                        </View>
                    </View>
                </LinearGradient>

                {/* ---------------- Map Stats Grid ---------------- */}
                <View style={styles.statsGrid}>
                    <View style={[
                        styles.statCard,
                        { backgroundColor: colors.card, borderColor: darkMode ? 'rgba(16, 185, 129, 0.3)' : colors.border }
                    ]}>
                        <LinearGradient
                            colors={["#10B981", "#059669"]}
                            style={styles.statIconBox}
                        >
                            <Ionicons name="navigate" size={22} color="#FFFFFF" />
                        </LinearGradient>
                        <Text style={[styles.statValue, { color: colors.text }]}>127m²</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                            Mapped Area
                        </Text>
                    </View>

                    <View style={[
                        styles.statCard,
                        { backgroundColor: colors.card, borderColor: darkMode ? 'rgba(139, 92, 246, 0.3)' : colors.border }
                    ]}>
                        <LinearGradient
                            colors={["#8B5CF6", "#7C3AED"]}
                            style={styles.statIconBox}
                        >
                            <Ionicons name="warning" size={22} color="#FFFFFF" />
                        </LinearGradient>
                        <Text style={[styles.statValue, { color: colors.text }]}>3</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                            Obstacles
                        </Text>
                    </View>

                    <View style={[
                        styles.statCard,
                        { backgroundColor: colors.card, borderColor: darkMode ? 'rgba(245, 158, 11, 0.3)' : colors.border }
                    ]}>
                        <LinearGradient
                            colors={["#F59E0B", "#D97706"]}
                            style={styles.statIconBox}
                        >
                            <Ionicons name="grid" size={22} color="#FFFFFF" />
                        </LinearGradient>
                        <Text style={[styles.statValue, { color: colors.text }]}>5</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                            Zones
                        </Text>
                    </View>
                </View>

                {/* ---------------- Premium Info Section ---------------- */}
                <View
                    style={[
                        styles.infoBox,
                        { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                >
                    <View style={styles.infoHeader}>
                        <View style={[
                            styles.infoIconContainer,
                            { backgroundColor: colors.primary + "15" }
                        ]}>
                            <Ionicons name="information-circle" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.infoTitle, { color: colors.primary }]}>
                            Navigation Info
                        </Text>
                    </View>

                    <Text style={[styles.infoText, { color: colors.text }]}>
                        The robot's path, obstacles, and cleaning zones will be displayed here once integrated with native mapping.
                    </Text>

                    {/* Feature List */}
                    <View style={styles.featureList}>
                        <View style={styles.featureItem}>
                            <View style={[styles.featureBullet, { backgroundColor: "#10B981" }]} />
                            <Text style={[styles.featureText, { color: colors.text }]}>
                                Real-time position tracking
                            </Text>
                        </View>
                        <View style={styles.featureItem}>
                            <View style={[styles.featureBullet, { backgroundColor: "#8B5CF6" }]} />
                            <Text style={[styles.featureText, { color: colors.text }]}>
                                Obstacle detection & mapping
                            </Text>
                        </View>
                        <View style={styles.featureItem}>
                            <View style={[styles.featureBullet, { backgroundColor: "#F59E0B" }]} />
                            <Text style={[styles.featureText, { color: colors.text }]}>
                                Custom cleaning zones
                            </Text>
                        </View>
                    </View>
                    {/* C++ BRIDGE: Integrate robot path, obstacle detection, and zone mapping here */}
                </View>

                {/* ---------------- Map Actions ---------------- */}
                <View style={[
                    styles.actionsCard,
                    { backgroundColor: colors.card, borderColor: colors.border }
                ]}>
                    <View style={styles.actionsHeader}>
                        <View style={styles.actionsTitleContainer}>
                            <View style={[
                                styles.flashIconContainer,
                                { backgroundColor: colors.primary + "15" }
                            ]}>
                                <Ionicons name="flash" size={18} color={colors.primary} />
                            </View>
                            <Text style={[styles.actionsTitle, { color: colors.text }]}>
                                Map Actions
                            </Text>
                        </View>
                    </View>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : colors.background }
                            ]}
                            onPress={fetchMap}
                            activeOpacity={0.7}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.primary + "CC"]}
                                style={styles.actionIconContainer}
                            >
                                <Ionicons name="refresh" size={24} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={[styles.actionButtonText, { color: colors.text }]}>
                                Refresh Map
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : colors.background }
                            ]}
                            onPress={() => Alert.alert("Info", "Zone editor coming soon")}
                            activeOpacity={0.7}
                        >
                            <LinearGradient
                                colors={["#10B981", "#059669"]}
                                style={styles.actionIconContainer}
                            >
                                <Ionicons name="create" size={24} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={[styles.actionButtonText, { color: colors.text }]}>
                                Edit Zones
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : colors.background }
                            ]}
                            onPress={() => Alert.alert("Info", "Export feature coming soon")}
                            activeOpacity={0.7}
                        >
                            <LinearGradient
                                colors={["#8B5CF6", "#7C3AED"]}
                                style={styles.actionIconContainer}
                            >
                                <Ionicons name="download" size={24} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={[styles.actionButtonText, { color: colors.text }]}>
                                Export
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ---------------- Quick Navigation ---------------- */}
                <View style={[
                    styles.navCard,
                    { backgroundColor: colors.card, borderColor: colors.border }
                ]}>
                    <Text style={[styles.navTitle, { color: colors.text }]}>
                        Quick Navigation
                    </Text>

                    <View style={styles.navButtons}>
                        <TouchableOpacity
                            style={[
                                styles.navButton,
                                { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : colors.background }
                            ]}
                            onPress={() => router.push("./DashboardScreen")}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="grid" size={20} color={colors.primary} />
                            <Text style={[styles.navButtonText, { color: colors.text }]}>
                                Dashboard
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.navButton,
                                { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : colors.background }
                            ]}
                            onPress={() => router.push("./ControlScreen")}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="game-controller" size={20} color={colors.primary} />
                            <Text style={[styles.navButtonText, { color: colors.text }]}>
                                Control
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.navButton,
                                { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : colors.background }
                            ]}
                            onPress={() => router.push("./ScheduleScreen")}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="calendar" size={20} color={colors.primary} />
                            <Text style={[styles.navButtonText, { color: colors.text }]}>
                                Schedule
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ---------------- Premium Tip ---------------- */}
                <LinearGradient
                    colors={darkMode
                        ? ['rgba(99, 102, 241, 0.15)', 'rgba(99, 102, 241, 0.08)']
                        : ['rgba(99, 102, 241, 0.08)', 'rgba(99, 102, 241, 0.03)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.tipCard,
                        { borderColor: darkMode ? 'rgba(99, 102, 241, 0.3)' : colors.primary + "30" }
                    ]}
                >
                    <View style={[
                        styles.tipIconContainer,
                        { backgroundColor: colors.primary + "20" }
                    ]}>
                        <Ionicons name="bulb" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.tipContent}>
                        <Text style={[styles.tipTitle, { color: colors.primary }]}>
                            Pro Tip
                        </Text>
                        <Text style={[styles.tipText, { color: colors.text }]}>
                            Run a full mapping cycle in an empty room for the most accurate navigation data.
                        </Text>
                    </View>
                </LinearGradient>
            </Animated.View>
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
        padding: 20,
        gap: 20,
    },

    /* Map Container */
    mapGradientContainer: {
        borderRadius: 24,
        padding: 2,
    },
    mapBox: {
        width: "100%",
        height: 320,
        borderRadius: 22,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        shadowColor: "#6366F1",
        shadowOpacity: 0.15,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
        position: "relative",
    },
    mapPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        zIndex: 2,
    },
    mapIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#6366F1",
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },
    mapPlaceholderTitle: {
        fontSize: 20,
        fontWeight: "800",
        letterSpacing: 0.5,
        marginTop: 8,
    },
    mapPlaceholderSubtitle: {
        fontSize: 14,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
    pulseIndicator: {
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: 60,
        opacity: 0.3,
    },
    gridOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: "row",
        justifyContent: "space-evenly",
        zIndex: 1,
    },
    gridLine: {
        width: 1,
        height: "100%",
    },

    /* Stats Grid */
    statsGrid: {
        flexDirection: "row",
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    statIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: "600",
        textAlign: "center",
        letterSpacing: 0.5,
    },

    /* Info Box */
    infoBox: {
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    infoHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 14,
    },
    infoIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    infoTitle: {
        fontWeight: "800",
        fontSize: 17,
        letterSpacing: 0.3,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 21,
        fontWeight: "500",
        letterSpacing: 0.2,
        marginBottom: 16,
    },
    featureList: {
        gap: 12,
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    featureBullet: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    featureText: {
        fontSize: 13,
        fontWeight: "600",
        letterSpacing: 0.2,
    },

    /* Actions Card */
    actionsCard: {
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    actionsHeader: {
        marginBottom: 18,
    },
    actionsTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    flashIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    actionsTitle: {
        fontSize: 18,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 12,
    },
    actionButton: {
        flex: 1,
        borderRadius: 14,
        padding: 16,
        alignItems: "center",
        gap: 10,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    actionIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.5,
        textAlign: "center",
    },

    /* Navigation Card */
    navCard: {
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    navTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 16,
        letterSpacing: 0.3,
    },
    navButtons: {
        flexDirection: "row",
        gap: 10,
    },
    navButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 14,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    navButtonText: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.3,
    },

    /* Tip Card */
    tipCard: {
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        flexDirection: "row",
        gap: 14,
        alignItems: "flex-start",
        shadowColor: "#6366F1",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    tipIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    tipContent: {
        flex: 1,
        gap: 6,
    },
    tipTitle: {
        fontSize: 15,
        fontWeight: "800",
        letterSpacing: 0.3,
    },
    tipText: {
        fontSize: 13,
        lineHeight: 19,
        fontWeight: "500",
        letterSpacing: 0.2,
        opacity: 0.9,
    },
});