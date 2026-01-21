import { ActivityIndicator, View, Text } from "react-native";
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

type LoaderProps = {
    message?: string;
};

export default function Loader({ message }: LoaderProps) {
    const { colors } = useContext(ThemeContext);

    return (
        <View
            style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.background,
            }}
        >
            {/* C++ BRIDGE: If loader reflects native robot operations (e.g., fetching map, syncing schedule),
          tie into RobotBridge async calls */}
            <ActivityIndicator size="large" color={colors.text} />
            {message && (
                <Text
                    style={{
                        marginTop: 16,
                        color: colors.subtitle,
                        fontWeight: "500",
                    }}
                >
                    {message}
                </Text>
            )}
        </View>
    );
}
