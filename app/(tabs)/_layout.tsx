import { Tabs } from "expo-router";
import { useAuthGuard } from "../src/middleware/authGuard";
import { ThemeProvider } from "../src/context/ThemeContext";

export default function TabLayout() {
    const checking = useAuthGuard();
    if (checking) return null;

    return (
        <ThemeProvider>
            <Tabs screenOptions={{ headerShown: false }} />
        </ThemeProvider>
    );
}
