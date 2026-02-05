// src/context/ThemeContext.tsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ────────────────────────────────────────────────
// Theme color palette – always string, no undefined allowed
export interface ThemeColors {
    primary: string;
    error: string;
    textSecondary: string;
    background: string;
    card: string;
    border: string;
    text: string;
    subtitle: string;
    muted: string;              // for disabled states, subtle backgrounds
    gradientStart: string;      // for full-screen gradients (Login, Signup, etc.)
    gradientMiddle: string;
    gradientEnd: string;
    statusBarStyle: 'light' | 'dark'; // for expo-status-bar
}

// ────────────────────────────────────────────────
// Full context shape
export interface ThemeContextType {
    darkMode: boolean;
    toggleTheme: () => void;
    colors: ThemeColors;
}

// ────────────────────────────────────────────────
// Light theme – clean, professional, high contrast
const lightTheme: ThemeColors = {
    primary: '#2563eb',         // blue-600
    error: '#dc2626',           // red-600
    textSecondary: '#4b5563',   // gray-600
    background: '#f9fafb',      // very light gray
    card: '#ffffff',
    border: '#e5e7eb',
    text: '#111827',
    subtitle: '#6b7280',
    muted: '#f3f4f6',           // light gray for disabled / subtle bg
    gradientStart: '#f8fafc',
    gradientMiddle: '#e2e8f0',
    gradientEnd: '#f8fafc',
    statusBarStyle: 'dark',
};

// ────────────────────────────────────────────────
// Dark theme – deep, elegant, readable
const darkTheme: ThemeColors = {
    primary: '#3b82f6',         // blue-500 (slightly brighter for visibility)
    error: '#f87171',           // red-400
    textSecondary: '#9ca3af',   // gray-400
    background: '#0f172a',      // slate-950 (deep dark)
    card: '#1f2937',            // slate-800
    border: '#374151',          // slate-700
    text: '#f3f4f6',            // gray-100
    subtitle: '#9ca3af',        // gray-400
    muted: '#374151',           // slate-700 for disabled / subtle bg
    gradientStart: '#0f172a',
    gradientMiddle: '#1e293b',
    gradientEnd: '#0f172a',
    statusBarStyle: 'light',
};

// ────────────────────────────────────────────────
// Context – private, do NOT export or import directly
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ────────────────────────────────────────────────
// Provider – wrap your entire app with this (in app/_layout.tsx)
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [darkMode, setDarkMode] = useState<boolean>(false);

    // Load saved preference on mount (runs once)
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

    // Toggle theme & persist to storage
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
// Custom hook – THIS is what you MUST use in all components/screens
export const useThemeContext = (): ThemeContextType => {
    const context = useContext(ThemeContext);

    if (context === undefined) {
        throw new Error(
            'useThemeContext must be used within a ThemeProvider. ' +
            'Wrap your root layout with <ThemeProvider> in app/_layout.tsx'
        );
    }

    return context;
};