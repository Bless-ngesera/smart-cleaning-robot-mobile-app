import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

type LoaderProps = {
    message?: string;
};

export default function Loader({ message }: LoaderProps) {
    const { colors } = useContext(ThemeContext);

    const spinnerColor = colors.primary ?? colors.text;
    const messageColor = colors.textSecondary ?? colors.subtitle;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* C++ BRIDGE: If loader reflects native robot operations (e.g., fetching map, syncing schedule),
          tie into RobotBridge async calls */}
            <ActivityIndicator size="large" color={spinnerColor} />
            {message && (
                <Text style={[styles.message, { color: messageColor }]}>{message}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    message: {
        marginTop: 16,
        fontWeight: "500",
        fontSize: 15,
        textAlign: "center",
    },
});
