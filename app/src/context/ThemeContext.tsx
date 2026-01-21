import React, { createContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeContextType = {
    darkMode: boolean;
    toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType>({
    darkMode: false,
    toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [darkMode, setDarkMode] = useState(false);

    // ✅ Load theme preference on mount
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

    // ✅ Toggle and persist theme preference
    const toggleTheme = async () => {
        try {
            const newValue = !darkMode;
            setDarkMode(newValue);
            await AsyncStorage.setItem("pref_darkMode", String(newValue));
        } catch (error) {
            console.log("Failed to save theme preference:", error);
        }
    };

    return (
        <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
