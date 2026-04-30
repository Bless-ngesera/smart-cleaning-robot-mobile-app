// app/index.tsx

import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/src/services/supabase";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
    const router = useRouter();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        checkInitialRoute();
    }, []);

    const checkInitialRoute = async () => {
        try {
            // Check for existing session
            const { data: { session } } = await supabase.auth.getSession();

            let initialRoute = '/LoginScreen';

            if (session) {
                // Check if email is verified
                if (session.user.email_confirmed_at) {
                    initialRoute = '/(tabs)/01_DashboardScreen';
                } else {
                    initialRoute = '/verified-account';
                }
            }

            // Small delay to ensure navigation is ready
            setTimeout(() => {
                router.replace(initialRoute as any);
                setIsReady(true);
            }, 100);

        } catch (error) {
            console.error('Error checking auth session:', error);
            // On error, default to login screen
            setTimeout(() => {
                router.replace('/LoginScreen' as any);
                setIsReady(true);
            }, 100);
        }
    };

    // Show loading indicator while determining route
    if (!isReady) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#000'
            }}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return null;
}