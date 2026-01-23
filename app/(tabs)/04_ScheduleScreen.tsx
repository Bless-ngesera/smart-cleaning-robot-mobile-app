import React, { useState, useContext, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    Alert,
    StyleSheet,
} from "react-native";
import Button from "../src/components/Button";
import Header from "../src/components/Header";
import Loader from "../src/components/Loader";
import { ThemeContext } from "../src/context/ThemeContext";
import { router } from "expo-router";

type Entry = { day: string; time: string };

export default function ScheduleScreen() {
    const [schedule, setSchedule] = useState<Entry[]>([]);
    const [history, setHistory] = useState<Entry[]>([]);
    const [day, setDay] = useState("");
    const [time, setTime] = useState("");
    const [busy, setBusy] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const { colors } = useContext(ThemeContext);

    /* ---------------- Add New Routine ---------------- */
    const addSchedule = () => {
        if (!day || !time) {
            Alert.alert("Error", "Please enter both day and time.");
            return;
        }
        const newEntry = { day, time };
        setSchedule([...schedule, newEntry]);
        setDay("");
        setTime("");
        Alert.alert("Success", "Routine added successfully!");
        // C++ BRIDGE: RobotBridge.addSchedule(day, time)
    };

    /* ---------------- Sync From Robot ---------------- */
    const syncFromRobot = async () => {
        setBusy(true);
        setLoadingMessage("Syncing schedule from robot...");
        try {
            console.log("Sync schedule (mock)");
            await new Promise((resolve) => setTimeout(resolve, 1500));
            // C++ BRIDGE: RobotBridge.getSchedule()
        } catch {
            Alert.alert("Error", "Failed to sync schedule.");
        } finally {
            setBusy(false);
        }
    };

    /* ---------------- Clear All Routines ---------------- */
    const clearAllSchedules = () => {
        Alert.alert("Confirm Reset", "Clear all routines?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Clear",
                style: "destructive",
                onPress: () => {
                    setHistory([...history, ...schedule]); // move current routines to history
                    setSchedule([]);
                    Alert.alert("Success", "All routines cleared.");
                    // C++ BRIDGE: RobotBridge.clearSchedules()
                },
            },
        ]);
    };

    /* ---------------- Next Scheduled Routine ---------------- */
    const nextRoutine = useMemo(() => {
        return schedule.length > 0 ? schedule[0] : null;
    }, [schedule]);

    if (busy) return <Loader message={loadingMessage} />;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Cleaning Schedule" />

            <View style={styles.content}>
                {/* ---------------- Next Routine Card ---------------- */}
                {nextRoutine && (
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Next Scheduled Routine</Text>
                        <Text style={[styles.cardSubtitle, { color: colors.subtitle }]}>
                            {nextRoutine.day} at {nextRoutine.time}
                        </Text>
                    </View>
                )}

                {/* ---------------- Sync Button ---------------- */}
                <View style={styles.syncBox}>
                    <Button title="Sync from Robot" icon="sync-outline" onPress={syncFromRobot} variant="primary" />
                </View>

                {/* ---------------- Active Schedule List ---------------- */}
                <FlatList
                    data={schedule}
                    keyExtractor={(_, i) => i.toString()}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: colors.subtitle }]}>
                            No routines yet. Add one below.
                        </Text>
                    }
                    renderItem={({ item }) => (
                        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.day}</Text>
                            <Text style={[styles.cardSubtitle, { color: colors.subtitle }]}>{item.time}</Text>
                        </View>
                    )}
                />

                {/* ---------------- Add New Routine ---------------- */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Add New Routine</Text>
                    <TextInput
                        placeholder="Day (e.g., Monday)"
                        value={day}
                        onChangeText={setDay}
                        placeholderTextColor={colors.subtitle}
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                    />
                    <TextInput
                        placeholder="Time (e.g., 10:00 AM)"
                        value={time}
                        onChangeText={setTime}
                        placeholderTextColor={colors.subtitle}
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                    />
                    <Button title="Add Schedule" icon="add-outline" onPress={addSchedule} />
                </View>

                {/* ---------------- Clear All Routines ---------------- */}
                {schedule.length > 0 && (
                    <View style={styles.clearBox}>
                        <Button title="Clear All Routines" icon="trash-outline" onPress={clearAllSchedules} variant="danger" />
                    </View>
                )}

                {/* ---------------- History of Completed Routines ---------------- */}
                {history.length > 0 && (
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>History of Completed Routines</Text>
                        {history.map((entry, index) => (
                            <Text key={index} style={[styles.cardSubtitle, { color: colors.subtitle }]}>
                                {entry.day} at {entry.time}
                            </Text>
                        ))}
                    </View>
                )}

                {/* ---------------- Helpful Tip ---------------- */}
                <View style={[styles.tipBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={{ color: colors.subtitle }}>
                        Tip: Keep routines short and avoid overlapping times to reduce battery strain.
                    </Text>
                </View>

                {/* ---------------- Navigation Buttons ---------------- */}
                <View style={styles.navButtons}>
                    <Button title="Dashboard" icon="grid-outline" variant="secondary" onPress={() => router.push("./DashboardScreen")} />
                    <Button title="Control" icon="settings-outline" variant="secondary" onPress={() => router.push("./ControlScreen")} />
                    <Button title="Map" icon="map-outline" variant="secondary" onPress={() => router.push("./MapScreen")} />
                </View>
            </View>
        </View>
    );
}

/* ---------------------------- Styles ----------------------------- */
const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 24 },
    syncBox: { marginBottom: 16 },
    emptyText: { textAlign: "center", marginBottom: 16 },
    card: {
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: { fontWeight: "600", marginBottom: 6, fontSize: 16 },
    cardSubtitle: { fontSize: 14 },
    input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
    clearBox: { marginTop: 8, marginBottom: 16 },
    tipBox: { borderRadius: 14, padding: 16, borderWidth: 1, marginTop: 24 },
    navButtons: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 24,
        justifyContent: "space-between",
    },
});
