// src/context/ThemeContext.tsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native'; // ← Built-in hook for system theme
import { StatusBarStyle } from 'expo-status-bar';

// ────────────────────────────────────────────────
// Theme color palette – strict, no undefined allowed
export interface ThemeColors {
    primary: string;
    error: string;
    textSecondary: string;
    background: string;
    card: string;
    border: string;
    text: string;
    subtitle: string;
    muted: string; // disabled states, subtle backgrounds
    gradientStart: string;
    gradientMiddle: string;
    gradientEnd: string;
    statusBarStyle: StatusBarStyle; // 'light' | 'dark'
}

// ────────────────────────────────────────────────
// Full context shape
export interface ThemeContextType {
    darkMode: boolean;
    toggleTheme: () => Promise<void>;
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
    muted: '#f3f4f6',
    gradientStart: '#f8fafc',
    gradientMiddle: '#e2e8f0',
    gradientEnd: '#f8fafc',
    statusBarStyle: 'dark',
};

// ────────────────────────────────────────────────
// Dark theme – deep, elegant, readable
const darkTheme: ThemeColors = {
    primary: '#3b82f6',         // blue-500 (brighter for visibility)
    error: '#f87171',           // red-400
    textSecondary: '#9ca3af',   // gray-400
    background: '#0f172a',      // slate-950
    card: '#1f2937',            // slate-800
    border: '#374151',          // slate-700
    text: '#f3f4f6',            // gray-100
    subtitle: '#9ca3af',
    muted: '#374151',
    gradientStart: '#0f172a',
    gradientMiddle: '#1e293b',
    gradientEnd: '#0f172a',
    statusBarStyle: 'light',
};

// ────────────────────────────────────────────────
// Context – private
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ────────────────────────────────────────────────
// Provider – wrap your entire app in app/_layout.tsx
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemColorScheme = useColorScheme(); // 'light' | 'dark' | null
    const [darkMode, setDarkMode] = useState<boolean>(systemColorScheme === 'dark');

    // Load saved preference on mount (overrides system if saved)
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

    // Toggle theme & persist
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
// Custom hook – use this in all components/screens
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