import { View, Text } from "react-native";

type HeaderProps = {
    title: string;
    subtitle?: string;
};

export default function Header({ title, subtitle }: HeaderProps) {
    return (
        <View className="bg-blue-600 p-4 shadow-md">
            {/* C++ BRIDGE: If header needs to show robot status (e.g., battery, connection),
          fetch via RobotBridge.getStatus() and display here */}
            <Text className="text-white text-xl font-bold">{title}</Text>
            {subtitle && (
                <Text className="text-blue-100 text-sm mt-1">{subtitle}</Text>
            )}
        </View>
    );
}
