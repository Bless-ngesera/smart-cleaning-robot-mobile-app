import { View, Text, StyleSheet } from "react-native";
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

type HeaderProps = {
    title: string;
    subtitle?: string;
};

export default function Header({ title, subtitle }: HeaderProps) {
    const { colors } = useContext(ThemeContext);

    const titleColor = colors.primary ?? colors.text;
    const subtitleColor = colors.textSecondary ?? colors.subtitle;

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            {/* C++ BRIDGE: If header needs to show robot status (e.g., battery, connection),
          fetch via RobotBridge.getStatus() and display here */}
            <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
            {subtitle && (
                <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
});
