// app/_layout.tsx  (root layout)
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext'; // ← use the correct path (lib, not context)
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                {/* StatusBar adapts automatically to your theme (light/dark) */}
                <StatusBar style="auto" />

                <Slot />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}