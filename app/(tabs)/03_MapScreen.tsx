// app/(tabs)/03_MapScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import Header from '../../src/components/Header';
import Loader from '../../src/components/Loader';
import { useThemeContext } from '@/src/context/ThemeContext';
import { router } from 'expo-router';

type MapData = {
    mappedArea: number;
    obstacles: number;
    detectedZones: number;
    lastUpdated: Date;
    robotPosition: { x: number; y: number };
    cleanedAreas: { x: number; y: number; width: number; height: number }[];
};

type DetectedZone = {
    id: string;
    name: string; // auto-generated e.g. "Room A", "Open Area"
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
};

export default function MapScreen() {
    const { colors } = useThemeContext();

    const [busy, setBusy] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [mapData, setMapData] = useState<MapData>({
        mappedArea: 0,
        obstacles: 0,
        detectedZones: 0,
        lastUpdated: new Date(),
        robotPosition: { x: 50, y: 50 },
        cleanedAreas: [],
    });

    const [detectedZones, setDetectedZones] = useState<DetectedZone[]>([]);
    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    const [showGrid, setShowGrid] = useState(true);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const robotAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance animations
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        ]).start();

        // Pulse animation for map indicator
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.3, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        );
        pulseAnimation.start();

        // Robot rotation animation
        const robotAnimation = Animated.loop(
            Animated.timing(robotAnim, { toValue: 1, duration: 4000, useNativeDriver: true })
        );
        robotAnimation.start();

        return () => {
            pulseAnimation.stop();
            robotAnimation.stop();
        };
    }, []);

    /* ---------------- Fetch Real-Time Adaptive Map ---------------- */
    const fetchMap = async () => {
        setBusy(true);
        setLoadingMessage('Scanning environment...');

        try {
            console.log('Fetching adaptive map from robot');

            // === C++ BRIDGE: Replace with real RobotBridge call to get live map ===
            // Android (JNI): await RobotBridge.getAdaptiveMap()
            // iOS (Obj-C++): await [RobotBridge getAdaptiveMap]
            // This should return data from robot's sensors + cameras (SLAM / LiDAR / vision)
            // Expected format: { mappedArea, obstacles, detectedZones: [], robotPosition, cleanedAreas: [] }
            await new Promise((resolve) => setTimeout(resolve, 1800));

            // Simulated adaptive data (replace with real C++ response)
            const newZones: DetectedZone[] = [
                { id: 'z1', name: 'Open Area A', color: '#10B981', x: 5, y: 5, width: 50, height: 45 },
                { id: 'z2', name: 'Furniture Cluster', color: '#F59E0B', x: 60, y: 10, width: 30, height: 35 },
                { id: 'z3', name: 'Narrow Corridor', color: '#3B82F6', x: 55, y: 50, width: 40, height: 20 },
            ];

            setMapData({
                mappedArea: Math.floor(Math.random() * 50) + 100,
                obstacles: Math.floor(Math.random() * 5) + 1,
                detectedZones: newZones.length,
                lastUpdated: new Date(),
                robotPosition: { x: 45 + Math.random() * 10, y: 45 + Math.random() * 10 },
                cleanedAreas: [
                    { x: 10, y: 15, width: 35, height: 30 },
                    { x: 55, y: 40, width: 25, height: 25 },
                ],
            });

            setDetectedZones(newZones);

            Alert.alert('Success', 'Environment scanned and map updated!');
        } catch (err) {
            console.error('Map fetch failed:', err);
            Alert.alert('Error', 'Failed to scan environment. Please check robot connection.');
        } finally {
            setBusy(false);
        }
    };

    /* ---------------- Zone Interactions ---------------- */
    const handleZoneSelect = (zoneId: string) => {
        setSelectedZone(selectedZone === zoneId ? null : zoneId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleDeleteZone = (zoneId: string) => {
        Alert.alert('Delete Zone', 'Remove this detected area?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    setDetectedZones(detectedZones.filter((z) => z.id !== zoneId));
                    setSelectedZone(null);
                    setMapData((prev) => ({ ...prev, detectedZones: prev.detectedZones - 1 }));
                    Alert.alert('Success', 'Area removed');
                },
            },
        ]);
    };

    const handleAddZone = () => {
        // In real use, this could trigger robot to re-scan or let user define via app
        Alert.alert('Add Area', 'Robot will re-scan to detect new areas automatically.');
        // === C++ BRIDGE: Trigger robot re-scan for new zones ===
        // RobotBridge.triggerRescan()
    };

    const robotRotation = robotAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (busy) {
        return <Loader message={loadingMessage} />;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Robot Map" subtitle="Real-time adaptive navigation" />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
                    {/* Premium Adaptive Map Container */}
                    <LinearGradient
                        colors={['rgba(99, 102, 241, 0.12)', 'rgba(99, 102, 241, 0.04)']}
                        style={styles.mapGradientContainer}
                    >
                        <View style={[styles.mapBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            {/* Optional Grid */}
                            {showGrid && (
                                <View style={styles.gridOverlay}>
                                    {[...Array(12)].map((_, i) => (
                                        <View key={`col-${i}`} style={styles.gridColumn}>
                                            {[...Array(12)].map((_, j) => (
                                                <View key={`cell-${j}`} style={styles.gridCell} />
                                            ))}
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Detected Adaptive Zones (from sensors/cameras) */}
                            {detectedZones.map((zone) => (
                                <TouchableOpacity
                                    key={zone.id}
                                    style={[
                                        styles.zone,
                                        {
                                            left: `${zone.x}%`,
                                            top: `${zone.y}%`,
                                            width: `${zone.width}%`,
                                            height: `${zone.height}%`,
                                            backgroundColor: `${zone.color}20`,
                                            borderColor: selectedZone === zone.id ? zone.color : `${zone.color}50`,
                                            borderWidth: selectedZone === zone.id ? 3 : 1,
                                        },
                                    ]}
                                    onPress={() => handleZoneSelect(zone.id)}
                                >
                                    <Text style={[styles.zoneName, { color: zone.color }]}>{zone.name}</Text>
                                </TouchableOpacity>
                            ))}

                            {/* Cleaned Areas (from robot path) */}
                            {mapData.cleanedAreas.map((area, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.cleanedArea,
                                        {
                                            left: `${area.x}%`,
                                            top: `${area.y}%`,
                                            width: `${area.width}%`,
                                            height: `${area.height}%`,
                                        },
                                    ]}
                                />
                            ))}

                            {/* Robot Position (live from sensors) */}
                            <Animated.View
                                style={[
                                    styles.robotPosition,
                                    {
                                        left: `${mapData.robotPosition.x}%`,
                                        top: `${mapData.robotPosition.y}%`,
                                        transform: [{ rotate: robotRotation }],
                                    },
                                ]}
                            >
                                <LinearGradient colors={[colors.primary, `${colors.primary}CC`]} style={styles.robotIcon}>
                                    <Ionicons name="navigate" size={20} color="#FFFFFF" />
                                </LinearGradient>
                                <Animated.View
                                    style={[
                                        styles.robotPulse,
                                        { transform: [{ scale: pulseAnim }], backgroundColor: `${colors.primary}30` },
                                    ]}
                                />
                            </Animated.View>

                            {/* Controls */}
                            <TouchableOpacity
                                style={[styles.gridToggle, { backgroundColor: colors.background }]}
                                onPress={() => setShowGrid(!showGrid)}
                            >
                                <Ionicons name={showGrid ? 'grid' : 'grid-outline'} size={20} color={colors.primary} />
                            </TouchableOpacity>

                            <View style={[styles.updateBadge, { backgroundColor: colors.background }]}>
                                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                                <Text style={[styles.updateText, { color: colors.textSecondary }]}>
                                    Updated {mapData.lastUpdated.toLocaleTimeString()}
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Selected Zone Details */}
                    {selectedZone && (
                        <View style={[styles.zoneInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.zoneInfoHeader}>
                                <View style={styles.zoneInfoLeft}>
                                    <View
                                        style={[
                                            styles.zoneColorIndicator,
                                            { backgroundColor: detectedZones.find((z) => z.id === selectedZone)?.color },
                                        ]}
                                    />
                                    <Text style={[styles.zoneInfoTitle, { color: colors.text }]}>
                                        {detectedZones.find((z) => z.id === selectedZone)?.name}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedZone(null)}>
                                    <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.zoneInfoActions}>
                                <TouchableOpacity
                                    style={[styles.zoneActionButton, { backgroundColor: colors.background }]}
                                    onPress={() => Alert.alert('Edit', 'Zone editing coming soon')}
                                >
                                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                                    <Text style={[styles.zoneActionText, { color: colors.text }]}>Edit</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.zoneActionButton, { backgroundColor: colors.background }]}
                                    onPress={() => handleDeleteZone(selectedZone)}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    <Text style={[styles.zoneActionText, { color: colors.text }]}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Map Stats */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <LinearGradient colors={['#10B981', '#059669']} style={styles.statIconBox}>
                                <Ionicons name="navigate" size={22} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={[styles.statValue, { color: colors.text }]}>{mapData.mappedArea}m²</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mapped</Text>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.statIconBox}>
                                <Ionicons name="warning" size={22} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={[styles.statValue, { color: colors.text }]}>{mapData.obstacles}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Obstacles</Text>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.statIconBox}>
                                <Ionicons name="layers" size={22} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={[styles.statValue, { color: colors.text }]}>{mapData.detectedZones}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Areas</Text>
                        </View>
                    </View>

                    {/* Map Actions */}
                    <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.actionsHeader}>
                            <Text style={[styles.actionsTitle, { color: colors.text }]}>Map Actions</Text>
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={fetchMap}
                                disabled={busy}
                            >
                                <LinearGradient colors={[colors.primary, `${colors.primary}CC`]} style={styles.actionIcon}>
                                    <Ionicons name="refresh" size={24} color="#fff" />
                                </LinearGradient>
                                <Text style={styles.actionText}>Refresh Scan</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleAddZone}
                                disabled={busy}
                            >
                                <LinearGradient colors={['#10B981', '#059669']} style={styles.actionIcon}>
                                    <Ionicons name="add" size={24} color="#fff" />
                                </LinearGradient>
                                <Text style={styles.actionText}>Re-Scan</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => {
                                    Alert.alert('Export', 'Map exported successfully!');
                                    // === C++ BRIDGE: Trigger map export from robot ===
                                    // RobotBridge.exportMap()
                                }}
                                disabled={busy}
                            >
                                <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.actionIcon}>
                                    <Ionicons name="download" size={24} color="#fff" />
                                </LinearGradient>
                                <Text style={styles.actionText}>Export</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Navigation */}
                    <View style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.navTitle, { color: colors.text }]}>Quick Links</Text>
                        <View style={styles.navButtons}>
                            <TouchableOpacity
                                style={styles.navButton}
                                onPress={() => router.push('/(tabs)/01_DashboardScreen')}
                            >
                                <Ionicons name="grid" size={20} color={colors.primary} />
                                <Text style={styles.navButtonText}>Dashboard</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.navButton}
                                onPress={() => router.push('/(tabs)/02_ControlScreen')}
                            >
                                <Ionicons name="game-controller" size={20} color={colors.primary} />
                                <Text style={styles.navButtonText}>Control</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 40, paddingHorizontal: 20, paddingTop: 12 },

    mapGradientContainer: { borderRadius: 24, padding: 2, marginBottom: 20 },
    mapBox: {
        height: 340,
        borderRadius: 22,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
    },
    gridColumn: { flex: 1 },
    gridCell: { flex: 1, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },

    zone: {
        position: 'absolute',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoneName: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
    cleanedArea: {
        position: 'absolute',
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        backgroundColor: '#10B98110',
        borderColor: '#10B98150',
    },
    robotPosition: {
        position: 'absolute',
        width: 40,
        height: 40,
        marginLeft: -20,
        marginTop: -20,
        zIndex: 10,
    },
    robotIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    robotPulse: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 30,
        top: -10,
        left: -10,
        opacity: 0.5,
    },
    gridToggle: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    updateBadge: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        zIndex: 20,
    },
    updateText: { fontSize: 11, fontWeight: '600' },

    zoneInfoCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 20,
    },
    zoneInfoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    zoneInfoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    zoneColorIndicator: {
        width: 24,
        height: 24,
        borderRadius: 6,
    },
    zoneInfoTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    zoneInfoActions: {
        flexDirection: 'row',
        gap: 12,
    },
    zoneActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 10,
    },
    zoneActionText: { fontSize: 14, fontWeight: '600' },

    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    statIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
    },

    actionsCard: {
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        marginBottom: 20,
    },
    actionsHeader: {
        marginBottom: 16,
    },
    actionsTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        gap: 8,
    },
    actionIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
    },

    navCard: {
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
    },
    navTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    navButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    navButton: {
        flex: 1,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        gap: 8,
    },
    navButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
});