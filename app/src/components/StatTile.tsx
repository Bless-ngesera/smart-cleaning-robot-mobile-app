import { View, Text, StyleSheet } from "react-native";
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

    const backgroundColor = highlight ? colors.primary ?? "#eff6ff" : colors.card;
    const borderColor = highlight ? colors.primary ?? "#bfdbfe" : colors.border;
    const labelColor = highlight ? colors.primary ?? "#1e40af" : colors.textSecondary ?? colors.subtitle;
    const valueColor = highlight ? colors.primary ?? "#1e40af" : colors.text;

    return (
        <View style={[styles.tile, { backgroundColor, borderColor }]}>
            <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
            <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    tile: {
        flex: 1,
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 2,
        borderWidth: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
    },
    value: {
        fontSize: 22,
        fontWeight: "700",
        marginTop: 4,
    },
});
