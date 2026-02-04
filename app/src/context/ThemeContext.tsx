// src/lib/ThemeContext.tsx   (or wherever you moved it)
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ────────────────────────────────────────────────
// Theme color palette – always string, no undefined
export interface ThemeColors {
    primary: string;
    error: string;
    textSecondary: string;
    background: string;
    card: string;
    border: string;
    text: string;
    subtitle: string;
}

// ────────────────────────────────────────────────
// Full context shape
export interface ThemeContextType {
    darkMode: boolean;
    toggleTheme: () => void;
    colors: ThemeColors;
}

// ────────────────────────────────────────────────
// Light & dark themes
const lightTheme: ThemeColors = {
    primary: '#2563eb',       // blue-600
    error: '#dc2626',         // red-600
    textSecondary: '#4b5563', // gray-600
    background: '#f9fafb',
    card: '#ffffff',
    border: '#e5e7eb',
    text: '#111827',
    subtitle: '#6b7280',
};

const darkTheme: ThemeColors = {
    primary: '#3b82f6',       // blue-500
    error: '#f87171',         // red-400
    textSecondary: '#9ca3af', // gray-400
    background: '#111827',
    card: '#1f2937',
    border: '#374151',
    text: '#ffffff',
    subtitle: '#9ca3af',
};

// ────────────────────────────────────────────────
// Context – do NOT export or import this directly
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ────────────────────────────────────────────────
// Provider – wrap your app with this
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [darkMode, setDarkMode] = useState<boolean>(false);

    // Load saved preference on mount (once)
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem('pref_darkMode');
                if (stored !== null) {
                    setDarkMode(stored === 'true');
                }
            } catch (err) {
                console.warn('Failed to load theme preference:', err);
            }
        })();
    }, []);

    // Toggle theme & save preference
    const toggleTheme = async () => {
        const newValue = !darkMode;
        setDarkMode(newValue);

        try {
            await AsyncStorage.setItem('pref_darkMode', String(newValue));
        } catch (err) {
            console.warn('Failed to save theme preference:', err);
        }
    };

    // Select active theme
    const colors = darkMode ? darkTheme : lightTheme;

    const value: ThemeContextType = {
        darkMode,
        toggleTheme,
        colors,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

// ────────────────────────────────────────────────
// Custom hook – THIS is what you MUST import in all screens
export const useThemeContext = (): ThemeContextType => {
    const context = useContext(ThemeContext);

    if (context === undefined) {
        throw new Error(
            'useThemeContext must be used within a ThemeProvider. ' +
            'Make sure <ThemeProvider> is wrapping your app in app/_layout.tsx'
        );
    }

    return context;
};