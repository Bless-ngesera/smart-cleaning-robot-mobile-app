import { useEffect, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { supabase } from '@/src/services/supabase';

export function useAuthGuard() {
    const pathname = usePathname();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (
                isMounted &&
                !session &&
                pathname.startsWith('/(tabs)')
            ) {
                router.replace('/LoginScreen');
            }

            if (isMounted) setChecking(false);
        };

        checkSession();

        const { data: listener } =
            supabase.auth.onAuthStateChange((_event, session) => {
                if (!session && pathname.startsWith('/(tabs)')) {
                    router.replace('/LoginScreen');
                }
            });

        return () => {
            isMounted = false;
            listener.subscription.unsubscribe();
        };
    }, [pathname]);

    return checking;
}
