import React, { createContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OpaqueColorValue } from "react-native";

/* ---------------- Theme Types ---------------- */
type ThemeColors = {
    primary: string | OpaqueColorValue | undefined;
    error: string | OpaqueColorValue | undefined;
    textSecondary: string;
    background: string;
    card: string;
    border: string;
    text: string;
    subtitle: string;
};

type ThemeContextType = {
    darkMode: boolean;
    toggleTheme: () => void;
    colors: ThemeColors;
};

/* ---------------- Default Colors ---------------- */
const defaultColors: ThemeColors = {
    primary: "#2563eb", // blue
    error: "#dc2626", // red-600
    textSecondary: "#4b5563", // gray-600
    background: "#f9fafb",
    card: "#ffffff",
    border: "#e5e7eb",
    text: "#111827",
    subtitle: "#6b7280",
};

/* ---------------- Context ---------------- */
export const ThemeContext = createContext<ThemeContextType>({
    darkMode: false,
    toggleTheme: () => {},
    colors: defaultColors,
});

/* ---------------- Provider ---------------- */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const storedDarkMode = await AsyncStorage.getItem("pref_darkMode");
                if (storedDarkMode !== null) {
                    setDarkMode(storedDarkMode === "true");
                }
            } catch (error) {
                console.log("Failed to load theme preference:", error);
            }
        };
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        try {
            const newValue = !darkMode;
            setDarkMode(newValue);
            await AsyncStorage.setItem("pref_darkMode", String(newValue));
        } catch (error) {
            console.log("Failed to save theme preference:", error);
        }
    };

    const colors: ThemeColors = darkMode
        ? {
            primary: "#3b82f6", // blue-500
            error: "#f87171", // red-400
            textSecondary: "#9ca3af", // gray-400
            background: "#111827",
            card: "#1f2937",
            border: "#374151",
            text: "#ffffff",
            subtitle: "#9ca3af",
        }
        : {
            primary: "#2563eb", // blue-600
            error: "#dc2626", // red-600
            textSecondary: "#4b5563", // gray-600
            background: "#f9fafb",
            card: "#ffffff",
            border: "#e5e7eb",
            text: "#111827",
            subtitle: "#6b7280",
        };

    return (
        <ThemeContext.Provider value={{ darkMode, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};
