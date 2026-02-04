// src/navigation/theme.ts
import { DefaultTheme, DarkTheme } from '@react-navigation/native';

export const lightNavigationTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        background: '#f9fafb',
        card: '#ffffff',
        text: '#111827',
        border: '#e5e7eb',
        primary: '#2563eb',
    },
};

export const darkNavigationTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        background: '#111827',
        card: '#1f2937',
        text: '#ffffff',
        border: '#374151',
        primary: '#3b82f6',
    },
};