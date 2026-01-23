import React, { useContext } from "react";
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    View,
    StyleSheet,
    ViewStyle,
    TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "../context/ThemeContext";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
    title: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "danger";
    disabled?: boolean;
    icon?: IoniconName;
    loading?: boolean;
    fullWidth?: boolean;
};

export default function Button({
                                   title,
                                   onPress,
                                   variant = "primary",
                                   disabled = false,
                                   icon,
                                   loading = false,
                                   fullWidth = true,
                               }: Props) {
    const { colors } = useContext(ThemeContext);

    const isSecondary = variant === "secondary";
    const isDanger = variant === "danger";

    const backgroundColor =
        variant === "primary"
            ? colors.primary ?? "#2563eb"
            : isDanger
                ? "#ef4444"
                : colors.card;

    const borderColor =
        variant === "primary"
            ? colors.primary ?? "#2563eb"
            : isDanger
                ? "#ef4444"
                : colors.border;

    const textColor =
        variant === "primary" || isDanger
            ? "#ffffff"
            : colors.textSecondary ?? colors.text;

    const buttonStyle: ViewStyle = {
        width: fullWidth ? "100%" : undefined,
        paddingVertical: 12,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
        backgroundColor,
        borderColor,
        borderWidth: isSecondary ? 1 : 0,
        shadowColor: "#000",
        shadowOpacity: isSecondary ? 0.05 : 0.1,
        shadowRadius: 3,
    };

    const textStyle: TextStyle = {
        fontWeight: "600",
        color: textColor,
    };

    return (
        <TouchableOpacity
            style={buttonStyle}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {/* C++ BRIDGE: If button triggers native robot commands,
          connect here via RobotBridge.start(), stop(), etc. */}

            {loading ? (
                <ActivityIndicator color={textColor} />
            ) : (
                <View style={styles.content}>
                    {icon && <Ionicons name={icon} size={20} color={textColor} />}
                    <Text style={textStyle}>{title}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    content: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
});
