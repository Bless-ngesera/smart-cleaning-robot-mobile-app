import { View, Text } from "react-native";
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

type Props = {
    label: string;
    value: string;
    highlight?: boolean;
};

export default function StatTile({ label, value, highlight = false }: Props) {
    const { colors } = useContext(ThemeContext);

    if (!colors) {
        console.warn("ThemeContext is missing 'colors'");
        return null;
    }

    return (
        <View
            style={{
                flex: 1,
                borderRadius: 12,
                padding: 16,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 2,
                borderWidth: 1,
                backgroundColor: highlight ? "#eff6ff" : colors.card,
                borderColor: highlight ? "#bfdbfe" : colors.border,
            }}
        >
            <Text style={{ color: highlight ? "#1e40af" : colors.subtitle }}>
                {label}
            </Text>
            <Text
                style={{
                    fontSize: 22,
                    fontWeight: "700",
                    marginTop: 4,
                    color: highlight ? "#1e40af" : colors.text,
                }}
            >
                {value}
            </Text>
        </View>
    );
}
