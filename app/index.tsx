import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import "./global.css";

export default function Index() {
    const router = useRouter();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setReady(true);
        }, 0); // wait for layout to mount

        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (ready) {
            router.replace("/LoginScreen");
        }
    }, [ready]);

    return null;
}
