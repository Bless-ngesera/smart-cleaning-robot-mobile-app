import { ActivityIndicator, View, Text } from "react-native";

type LoaderProps = {
    message?: string;
};

export default function Loader({ message }: LoaderProps) {
    return (
        <View className="flex-1 items-center justify-center bg-gray-50">
            {/* C++ BRIDGE: If loader reflects native robot operations (e.g., fetching map, syncing schedule),
          tie into RobotBridge async calls */}
            <ActivityIndicator size="large" color="#2563eb" />
            {message && (
                <Text className="mt-4 text-gray-600 font-medium">{message}</Text>
            )}
        </View>
    );
}
