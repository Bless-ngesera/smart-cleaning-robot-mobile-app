import { View, Text } from "react-native";

type Props = {
    label: string;
    value: string;
    highlight?: boolean;
};

export default function StatTile({ label, value, highlight = false }: Props) {
    return (
        <View
            className={`flex-1 rounded-xl p-4 shadow-sm border ${
                highlight
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white border-gray-100"
            }`}
        >
            {/* C++ BRIDGE: If value comes from robot sensors,
          fetch via RobotBridge.getStatus() */}
            <Text className="text-gray-500">{label}</Text>
            <Text
                className={`text-2xl font-bold mt-1 ${
                    highlight ? "text-blue-700" : "text-gray-900"
                }`}
            >
                {value}
            </Text>
        </View>
    );
}
