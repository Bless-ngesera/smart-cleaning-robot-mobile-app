import { View, Text } from "react-native";
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

type HeaderProps = {
    title: string;
    subtitle?: string;
};

export default function Header({ title, subtitle }: HeaderProps) {
    const { colors } = useContext(ThemeContext);

    return (
        <View
            style={{
                backgroundColor: colors.card,
                padding: 16,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 4,
            }}
        >
            {/* C++ BRIDGE: If header needs to show robot status (e.g., battery, connection),
          fetch via RobotBridge.getStatus() and display here */}
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "bold" }}>
                {title}
            </Text>
            {subtitle && (
                <Text style={{ color: colors.subtitle, fontSize: 14, marginTop: 4 }}>
                    {subtitle}
                </Text>
            )}
        </View>
    );
}
