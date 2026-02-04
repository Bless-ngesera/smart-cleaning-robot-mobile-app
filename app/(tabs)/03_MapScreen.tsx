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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import Header from '../src/components/Header';
import Loader from '../src/components/Loader';
import { useThemeContext } from '../src/lib/ThemeContext';
import { router } from 'expo-router';

type MapData = {
    mappedArea: number;
    obstacles: number;
    zones: number;
    lastUpdated: Date;
    robotPosition: { x: number; y: number };
    cleanedAreas: { x: number; y: number; width: number; height: number }[];
};

type Zone = {
    id: string;
    name: string;
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
};

export default function MapScreen() {
    const { colors, darkMode } = useThemeContext();

    const [busy, setBusy] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [mapData, setMapData] = useState<MapData>({
        mappedArea: 127,
        obstacles: 3,
        zones: 5,
        lastUpdated: new Date(),
        robotPosition: { x: 50, y: 50 },
        cleanedAreas: [
            { x: 20, y: 30, width: 40, height: 30 },
            { x: 65, y: 45, width: 25, height: 35 },
        ],
    });
    const [zones, setZones] = useState<Zone[]>([
        { id: '1', name: 'Living Room', color: '#10B981', x: 10, y: 10, width: 45, height: 40 },
        { id: '2', name: 'Kitchen', color: '#8B5CF6', x: 60, y: 10, width: 35, height: 30 },
        { id: '3', name: 'Bedroom', color: '#F59E0B', x: 10, y: 55, width: 40, height: 40 },
        { id: '4', name: 'Hallway', color: '#3B82F6', x: 55, y: 45, width: 15, height: 50 },
        { id: '5', name: 'Bathroom', color: '#EF4444', x: 75, y: 45, width: 20, height: 25 },
    ]);
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
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulse animation for map indicator
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.3,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        );
        pulseAnimation.start();

        // Robot rotation animation
        const robotAnimation = Animated.loop(
            Animated.timing(robotAnim, {
                toValue: 1,
                duration: 4000,
                useNativeDriver: true,
            })
        );
        robotAnimation.start();

        return () => {
            pulseAnimation.stop();
            robotAnimation.stop();
        };
    }, []);

    /* ---------------- Fetch Robot Map ---------------- */
    const fetchMap = async () => {
        setBusy(true);
        setLoadingMessage('Fetching robot map...');
        try {
            // C++ BRIDGE: Replace with RobotBridge.getMap() for native robot mapping
            console.log('Fetch map (mock)');
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Simulate updated map data
            setMapData({
                ...mapData,
                lastUpdated: new Date(),
                mappedArea: mapData.mappedArea + Math.floor(Math.random() * 10),
            });

            Alert.alert('Success', 'Map data refreshed successfully!');
        } catch {
            Alert.alert('Error', 'Failed to fetch robot map.');
        } finally {
            setBusy(false);
        }
    };

    /* ---------------- Zone Management ---------------- */
    const handleZoneSelect = (zoneId: string) => {
        setSelectedZone(selectedZone === zoneId ? null : zoneId);
    };

    const handleDeleteZone = (zoneId: string) => {
        Alert.alert('Delete Zone', 'Are you sure you want to delete this zone?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    setZones(zones.filter((z) => z.id !== zoneId));
                    setSelectedZone(null);
                    setMapData({
                        ...mapData,
                        zones: mapData.zones - 1,
                    });
                    Alert.alert('Success', 'Zone deleted successfully!');
                },
            },
        ]);
    };

    const handleEditZone = () => {
        Alert.alert('Edit Zone', 'Zone editor will open with advanced customization options.');
    };

    const handleAddZone = () => {
        const newZone: Zone = {
            id: Date.now().toString(),
            name: `Zone ${zones.length + 1}`,
            color: ['#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#EF4444'][zones.length % 5],
            x: Math.random() * 60 + 10,
            y: Math.random() * 60 + 10,
            width: 20 + Math.random() * 20,
            height: 20 + Math.random() * 20,
        };
        setZones([...zones, newZone]);
        setMapData({
            ...mapData,
            zones: mapData.zones + 1,
        });
        Alert.alert('Success', 'New zone added successfully!');
    };

    /* ---------------- Export Map ---------------- */
    const handleExportMap = () => {
        Alert.alert('Export Map', 'Choose export format:', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'PNG Image',
                onPress: () => {
                    console.log('Exporting as PNG...');
                    Alert.alert('Success', 'Map exported as PNG image!');
                },
            },
            {
                text: 'JSON Data',
                onPress: () => {
                    console.log('Exporting as JSON...', { mapData, zones });
                    Alert.alert('Success', 'Map data exported as JSON!');
                },
            },
        ]);
    };

    const robotRotation = robotAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (busy) {
        return <Loader message={loadingMessage} />;
    }

    /* --------------------------- UI --------------------------- */
    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Header title="Robot Map" subtitle="View navigation and cleaning zones" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* Premium Map Container */}
                    <LinearGradient
                        colors={
                            darkMode
                                ? ['rgba(99, 102, 241, 0.15)', 'rgba(99, 102, 241, 0.05)']
                                : ['rgba(99, 102, 241, 0.08)', 'rgba(99, 102, 241, 0.02)']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.mapGradientContainer}
                    >
                        <View
                            style={[
                                styles.mapBox,
                                {
                                    backgroundColor: colors.card,
                                    borderColor: darkMode ? 'rgba(99, 102, 241, 0.3)' : colors.border,
                                },
                            ]}
                        >
                            {/* Grid Pattern Overlay */}
                            {showGrid && (
                                <View style={styles.gridOverlay}>
                                    {[...Array(10)].map((_, i) => (
                                        <View key={`v-${i}`} style={styles.gridColumn}>
                                            {[...Array(10)].map((_, j) => (
                                                <View
                                                    key={`h-${j}`}
                                                    style={[
                                                        styles.gridCell,
                                                        {
                                                            borderColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                                        },
                                                    ]}
                                                />
                                            ))}
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Zones */}
                            {zones.map((zone) => (
                                <TouchableOpacity
                                    key={zone.id}
                                    style={[
                                        styles.zone,
                                        {
                                            left: `${zone.x}%`,
                                            top: `${zone.y}%`,
                                            width: `${zone.width}%`,
                                            height: `${zone.height}%`,
                                            backgroundColor: `${zone.color}30`,
                                            borderColor: selectedZone === zone.id ? zone.color : `${zone.color}60`,
                                            borderWidth: selectedZone === zone.id ? 3 : 1,
                                        },
                                    ]}
                                    onPress={() => handleZoneSelect(zone.id)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.zoneName, { color: zone.color }]}>{zone.name}</Text>
                                </TouchableOpacity>
                            ))}

                            {/* Cleaned Areas */}
                            {mapData.cleanedAreas.map((area, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.cleanedArea,
                                        {
                                            left: `${area.x}%`,
                                            top: `${area.y}%`,
                                            width: `${area.width}%`,
                                            height: `${area.height}%`,
                                            backgroundColor: '#10B98115',
                                            borderColor: '#10B98140',
                                        },
                                    ]}
                                />
                            ))}

                            {/* Robot Position */}
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
                                <LinearGradient
                                    colors={[colors.primary, `${colors.primary}CC`]}
                                    style={styles.robotIcon}
                                >
                                    <Ionicons name="navigate" size={20} color="#FFFFFF" />
                                </LinearGradient>
                                <Animated.View
                                    style={[
                                        styles.robotPulse,
                                        {
                                            backgroundColor: `${colors.primary}30`,
                                            transform: [{ scale: pulseAnim }],
                                        },
                                    ]}
                                />
                            </Animated.View>

                            {/* Grid Toggle */}
                            <TouchableOpacity
                                style={[styles.gridToggle, { backgroundColor: colors.background }]}
                                onPress={() => setShowGrid(!showGrid)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name={showGrid ? 'grid' : 'grid-outline'} size={20} color={colors.primary} />
                            </TouchableOpacity>

                            {/* Last Updated */}
                            <View style={[styles.updateBadge, { backgroundColor: colors.background }]}>
                                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                                <Text style={[styles.updateText, { color: colors.textSecondary }]}>
                                    {mapData.lastUpdated.toLocaleTimeString()}
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Selected Zone Info */}
                    {selectedZone && (
                        <Animated.View
                            style={[
                                styles.zoneInfoCard,
                                { backgroundColor: colors.card, borderColor: colors.border },
                            ]}
                        >
                            <View style={styles.zoneInfoHeader}>
                                <View style={styles.zoneInfoLeft}>
                                    <View
                                        style={[
                                            styles.zoneColorIndicator,
                                            {
                                                backgroundColor: zones.find((z) => z.id === selectedZone)?.color,
                                            },
                                        ]}
                                    />
                                    <Text style={[styles.zoneInfoTitle, { color: colors.text }]}>
                                        {zones.find((z) => z.id === selectedZone)?.name}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedZone(null)} activeOpacity={0.7}>
                                    <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.zoneInfoActions}>
                                <TouchableOpacity
                                    style={[styles.zoneActionButton, { backgroundColor: colors.background }]}
                                    onPress={handleEditZone}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                                    <Text style={[styles.zoneActionText, { color: colors.text }]}>Edit</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.zoneActionButton, { backgroundColor: colors.background }]}
                                    onPress={() => handleDeleteZone(selectedZone)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    <Text style={[styles.zoneActionText, { color: colors.text }]}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}

                    {/* Map Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View
                            style={[
                                styles.statCard,
                                {
                                    backgroundColor: colors.card,
                                    borderColor: darkMode ? 'rgba(16, 185, 129, 0.3)' : colors.border,
                                },
                            ]}
                        >
                            <LinearGradient colors={['#10B981', '#059669']} style={styles.statIconBox}>
                                <Ionicons name="navigate" size={22} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {mapData.mappedArea}m²
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mapped Area</Text>
                        </View>

                        <View
                            style={[
                                styles.statCard,
                                {
                                    backgroundColor: colors.card,
                                    borderColor: darkMode ? 'rgba(139, 92, 246, 0.3)' : colors.border,
                                },
                            ]}
                        >
                            <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.statIconBox}>
                                <Ionicons name="warning" size={22} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={[styles.statValue, { color: colors.text }]}>{mapData.obstacles}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Obstacles</Text>
                        </View>

                        <View
                            style={[
                                styles.statCard,
                                {
                                    backgroundColor: colors.card,
                                    borderColor: darkMode ? 'rgba(245, 158, 11, 0.3)' : colors.border,
                                },
                            ]}
                        >
                            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.statIconBox}>
                                <Ionicons name="grid" size={22} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={[styles.statValue, { color: colors.text }]}>{mapData.zones}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Zones</Text>
                        </View>
                    </View>

                    {/* Zone List */}
                    <View
                        style={[styles.zoneListCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                        <View style={styles.zoneListHeader}>
                            <View style={styles.cardTitleContainer}>
                                <Ionicons name="layers" size={20} color={colors.primary} />
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Cleaning Zones</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.addZoneButton, { backgroundColor: colors.primary }]}
                                onPress={handleAddZone}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.zoneList}>
                            {zones.map((zone, index) => (
                                <TouchableOpacity
                                    key={zone.id}
                                    style={[
                                        styles.zoneListItem,
                                        { backgroundColor: colors.background },
                                        index < zones.length - 1 && {
                                            borderBottomWidth: 1,
                                            borderBottomColor: colors.border,
                                        },
                                    ]}
                                    onPress={() => handleZoneSelect(zone.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.zoneListColor, { backgroundColor: zone.color }]} />
                                    <Text style={[styles.zoneListName, { color: colors.text }]}>{zone.name}</Text>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Map Actions */}
                    <View
                        style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                        <View style={styles.actionsHeader}>
                            <View style={styles.actionsTitleContainer}>
                                <View style={[styles.flashIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                    <Ionicons name="flash" size={18} color={colors.primary} />
                                </View>
                                <Text style={[styles.actionsTitle, { color: colors.text }]}>Map Actions</Text>
                            </View>
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : colors.background },
                                ]}
                                onPress={fetchMap}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={[colors.primary, `${colors.primary}CC`]}
                                    style={styles.actionIconContainer}
                                >
                                    <Ionicons name="refresh" size={24} color="#FFFFFF" />
                                </LinearGradient>
                                <Text style={[styles.actionButtonText, { color: colors.text }]}>Refresh Map</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : colors.background },
                                ]}
                                onPress={handleAddZone}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={styles.actionIconContainer}
                                >
                                    <Ionicons name="add" size={24} color="#FFFFFF" />
                                </LinearGradient>
                                <Text style={[styles.actionButtonText, { color: colors.text }]}>Add Zone</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : colors.background },
                                ]}
                                onPress={handleExportMap}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={['#8B5CF6', '#7C3AED']}
                                    style={styles.actionIconContainer}
                                >
                                    <Ionicons name="download" size={24} color="#FFFFFF" />
                                </LinearGradient>
                                <Text style={[styles.actionButtonText, { color: colors.text }]}>Export</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Premium Info Section */}
                    <View
                        style={[
                            styles.infoBox,
                            { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                    >
                        <View style={styles.infoHeader}>
                            <View style={[styles.infoIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                <Ionicons name="information-circle" size={20} color={colors.primary} />
                            </View>
                            <Text style={[styles.infoTitle, { color: colors.primary }]}>Navigation Info</Text>
                        </View>

                        <Text style={[styles.infoText, { color: colors.text }]}>
                            Interactive map showing real-time robot position, cleaned areas, and custom zones. Tap zones to edit or delete.
                        </Text>

                        {/* Feature List */}
                        <View style={styles.featureList}>
                            <View style={styles.featureItem}>
                                <View style={[styles.featureBullet, { backgroundColor: '#10B981' }]} />
                                <Text style={[styles.featureText, { color: colors.text }]}>Real-time position tracking</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <View style={[styles.featureBullet, { backgroundColor: '#8B5CF6' }]} />
                                <Text style={[styles.featureText, { color: colors.text }]}>Obstacle detection & mapping</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <View style={[styles.featureBullet, { backgroundColor: '#F59E0B' }]} />
                                <Text style={[styles.featureText, { color: colors.text }]}>Custom cleaning zones</Text>
                            </View>
                        </View>
                    </View>

                    {/* Quick Navigation */}
                    <View
                        style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                        <Text style={[styles.navTitle, { color: colors.text }]}>Quick Navigation</Text>

                        <View style={styles.navButtons}>
                            <TouchableOpacity
                                style={[styles.navButton, { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : colors.background }]}
                                onPress={() => router.push('/(tabs)/01_DashboardScreen')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="grid" size={20} color={colors.primary} />
                                <Text style={[styles.navButtonText, { color: colors.text }]}>Dashboard</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.navButton, { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : colors.background }]}
                                onPress={() => router.push('/(tabs)/02_ControlScreen')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="game-controller" size={20} color={colors.primary} />
                                <Text style={[styles.navButtonText, { color: colors.text }]}>Control</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.navButton, { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : colors.background }]}
                                onPress={() => router.push('/(tabs)/04_ScheduleScreen')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="calendar" size={20} color={colors.primary} />
                                <Text style={[styles.navButtonText, { color: colors.text }]}>Schedule</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Premium Tip */}
                    <LinearGradient
                        colors={
                            darkMode
                                ? ['rgba(99, 102, 241, 0.15)', 'rgba(99, 102, 241, 0.08)']
                                : ['rgba(99, 102, 241, 0.08)', 'rgba(99, 102, 241, 0.03)']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                            styles.tipCard,
                            { borderColor: darkMode ? 'rgba(99, 102, 241, 0.3)' : `${colors.primary}30` },
                        ]}
                    >
                        <View style={[styles.tipIconContainer, { backgroundColor: `${colors.primary}20` }]}>
                            <Ionicons name="bulb" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={[styles.tipTitle, { color: colors.primary }]}>Pro Tip</Text>
                            <Text style={[styles.tipText, { color: colors.text }]}>
                                Run a full mapping cycle in an empty room for the most accurate navigation data.
                            </Text>
                        </View>
                    </LinearGradient>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*                               Styles                                    */
/* ──────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    content: {
        paddingHorizontal: 20,
        paddingTop: 12,
        gap: 20,
    },

    /* Map Container */
    mapGradientContainer: {
        borderRadius: 24,
        padding: 2,
    },
    mapBox: {
        width: '100%',
        height: 320,
        borderRadius: 22,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#6366F1',
        shadowOpacity: 0.15,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
        position: 'relative',
    },
    gridOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        zIndex: 1,
    },
    gridColumn: {
        flex: 1,
    },
    gridCell: {
        flex: 1,
        borderWidth: 0.5,
    },
    zone: {
        position: 'absolute',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
    },
    zoneName: {
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
    },
    cleanedArea: {
        position: 'absolute',
        borderRadius: 6,
        borderWidth: 1,
        borderStyle: 'dashed',
        zIndex: 2,
    },
    robotPosition: {
        position: 'absolute',
        zIndex: 4,
        marginLeft: -20,
        marginTop: -20,
    },
    robotIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    robotPulse: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        top: -10,
        left: -10,
        opacity: 0.4,
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
        zIndex: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    updateBadge: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        zIndex: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    updateText: {
        fontSize: 11,
        fontWeight: '600',
    },

    /* Zone Info Card */
    zoneInfoCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
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
        gap: 10,
    },
    zoneActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 10,
    },
    zoneActionText: {
        fontSize: 14,
        fontWeight: '600',
    },

    /* Stats Grid */
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    statIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.5,
    },

    /* Zone List */
    zoneListCard: {
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    zoneListHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    addZoneButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    zoneList: {
        gap: 0,
    },
    zoneListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 10,
    },
    zoneListColor: {
        width: 20,
        height: 20,
        borderRadius: 6,
    },
    zoneListName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },

    /* Info Box */
    infoBox: {
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    infoIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoTitle: {
        fontWeight: '800',
        fontSize: 17,
        letterSpacing: 0.3,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 21,
        fontWeight: '500',
        letterSpacing: 0.2,
        marginBottom: 16,
    },
    featureList: {
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureBullet: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    featureText: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.2,
    },

    /* Actions Card */
    actionsCard: {
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    actionsHeader: {
        marginBottom: 18,
    },
    actionsTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    flashIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionsTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    actionIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
        textAlign: 'center',
    },

    /* Navigation Card */
    navCard: {
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    navTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
        letterSpacing: 0.3,
    },
    navButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    navButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    navButtonText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },

    /* Tip Card */
    tipCard: {
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 14,
        alignItems: 'flex-start',
        shadowColor: '#6366F1',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    tipIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tipContent: {
        flex: 1,
        gap: 6,
    },
    tipTitle: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    tipText: {
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '500',
        letterSpacing: 0.2,
        opacity: 0.9,
    },
});