import { useEffect, useState } from "react";
import { router, usePathname } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function useAuthGuard() {
    const pathname = usePathname();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = await AsyncStorage.getItem("userToken");
            if (!token && pathname.startsWith("/(tabs)")) {
                router.replace("/LoginScreen");
            }
            setChecking(false);
        };
        checkAuth();
    }, [pathname]);

    return checking;
}
