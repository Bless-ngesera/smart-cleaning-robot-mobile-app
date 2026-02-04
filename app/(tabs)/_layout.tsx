import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthGuard } from "../src/lib/authGuard";
import { ThemeProvider } from "../src/lib/ThemeContext";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const tabIcons: Record<string, IoniconName> = {
    dashboard: "home-outline",
    control: "game-controller-outline",
    map: "map-outline",
    schedule: "calendar-outline",
    profile: "person-outline",
};

export default function TabLayout() {
    const checking = useAuthGuard();
    if (checking) return null;

    return (
        <ThemeProvider>
            <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
                <Tabs
                    screenOptions={{
                        headerShown: false,
                        tabBarActiveTintColor: "#2563eb",
                        tabBarInactiveTintColor: "#6b7280",
                        tabBarStyle: {
                            backgroundColor: "#f9fafb",
                            borderTopWidth: 1,
                            borderTopColor: "#e5e7eb",
                            height: 60,
                        },
                    }}
                >
                    <Tabs.Screen
                        name="01_DashboardScreen"
                        options={{
                            tabBarLabel: "Dashboard",
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name={tabIcons.dashboard} size={size} color={color} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="02_ControlScreen"
                        options={{
                            tabBarLabel: "Control",
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name={tabIcons.control} size={size} color={color} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="03_MapScreen"
                        options={{
                            tabBarLabel: "Map",
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name={tabIcons.map} size={size} color={color} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="04_ScheduleScreen"
                        options={{
                            tabBarLabel: "Schedule",
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name={tabIcons.schedule} size={size} color={color} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="05_ProfileScreen"
                        options={{
                            tabBarLabel: "Profile",
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name={tabIcons.profile} size={size} color={color} />
                            ),
                        }}
                    />
                </Tabs>
            </SafeAreaView>
        </ThemeProvider>
    );
}
