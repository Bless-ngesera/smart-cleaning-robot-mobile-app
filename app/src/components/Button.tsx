import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
    title: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "danger";
    disabled?: boolean;
    icon?: IoniconName; // ✅ strictly typed icon name
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
    const baseStyle = `${fullWidth ? "w-full" : "px-4"} py-3 rounded-xl flex-row items-center justify-center`;

    const variantStyles: Record<NonNullable<Props["variant"]>, string> = {
        primary: "bg-blue-600",
        secondary: "bg-gray-200",
        danger: "bg-red-500",
    };

    const textStyles: Record<NonNullable<Props["variant"]>, string> = {
        primary: "text-white",
        secondary: "text-gray-800",
        danger: "text-white",
    };

    const background = variantStyles[variant];
    const textColor = textStyles[variant];
    const opacity = disabled ? "opacity-50" : "opacity-100";

    return (
        <TouchableOpacity
            className={`${baseStyle} ${background} ${opacity}`}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {/* C++ BRIDGE: If button triggers native robot commands,
          connect here via RobotBridge.start(), stop(), etc. */}

            {loading ? (
                <ActivityIndicator color={variant === "secondary" ? "#1f2937" : "#fff"} />
            ) : (
                <View className="flex-row items-center gap-2">
                    {icon && <Ionicons name={icon} size={20} color={variant === "secondary" ? "#1f2937" : "#fff"} />}
                    <Text className={`font-semibold ${textColor}`}>{title}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}
