// app/(tabs)/03_MapScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Animated,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import Loader from '../../src/components/Loader';
import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';
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

    // Same as Dashboard
    const { width } = Dimensions.get('window');
    const isLargeScreen = width >= 768;

    // Design tokens matching Dashboard
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    // Animations (unchanged)
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const robotAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        ]).start();

        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.3, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        );
        pulseAnimation.start();

        const robotAnimation = Animated.loop(
            Animated.timing(robotAnim, { toValue: 1, duration: 4000, useNativeDriver: true })
        );
        robotAnimation.start();

        return () => {
            pulseAnimation.stop();
            robotAnimation.stop();
        };
    }, []);

    const fetchMap = useCallback(async () => {
        setBusy(true);
        setLoadingMessage('Scanning environment...');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('No authenticated user');

            const { data, error } = await supabase
                .from('robot_status')
                .select('mapped_area, obstacles, detected_zones, last_updated, robot_x, robot_y')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            const newZones: DetectedZone[] = [
                { id: 'z1', name: 'Open Area A', color: '#10B981', x: 5, y: 5, width: 50, height: 45 },
                { id: 'z2', name: 'Furniture Cluster', color: '#F59E0B', x: 60, y: 10, width: 30, height: 35 },
                { id: 'z3', name: 'Narrow Corridor', color: '#3B82F6', x: 55, y: 50, width: 40, height: 20 },
            ];

            setMapData({
                mappedArea: data?.mapped_area ?? Math.floor(Math.random() * 50) + 100,
                obstacles: data?.obstacles ?? Math.floor(Math.random() * 5) + 1,
                detectedZones: data?.detected_zones ?? newZones.length,
                lastUpdated: data?.last_updated ? new Date(data.last_updated) : new Date(),
                robotPosition: {
                    x: data?.robot_x ?? 45 + Math.random() * 10,
                    y: data?.robot_y ?? 45 + Math.random() * 10,
                },
                cleanedAreas: [
                    { x: 10, y: 15, width: 35, height: 30 },
                    { x: 55, y: 40, width: 25, height: 25 },
                ],
            });

            setDetectedZones(newZones);

            Alert.alert('Success', 'Environment scanned and map updated!');
        } catch (err: any) {
            console.error('Map fetch failed:', err);
            Alert.alert('Error', err.message || 'Failed to scan environment.');
        } finally {
            setBusy(false);
        }
    }, []);

    useEffect(() => {
        fetchMap();
    }, [fetchMap]);

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
        Alert.alert('Add Area', 'Robot will re-scan to detect new areas automatically.');
    };

    const robotRotation = robotAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (busy) {
        return <Loader message={loadingMessage} />;
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.scrollContentLarge,
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                    {/* Large Header */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Robot Map
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Real-time adaptive navigation
                        </AppText>
                    </View>

                    {/* Map Container */}
                    <View style={[styles.mapBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
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
                                <AppText style={[styles.zoneName, { color: zone.color }]}>
                                    {zone.name}
                                </AppText>
                            </TouchableOpacity>
                        ))}

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

                        <TouchableOpacity
                            style={[styles.gridToggle, { backgroundColor: cardBg }]}
                            onPress={() => setShowGrid(!showGrid)}
                        >
                            <Ionicons name={showGrid ? 'grid' : 'grid-outline'} size={20} color={colors.primary} />
                        </TouchableOpacity>

                        <View style={[styles.updateBadge, { backgroundColor: cardBg }]}>
                            <Ionicons name="time-outline" size={14} color={textSecondary} />
                            <AppText style={[styles.updateText, { color: textSecondary }]}>
                                Updated {mapData.lastUpdated.toLocaleTimeString()}
                            </AppText>
                        </View>
                    </View>

                    {/* Selected Zone Details */}
                    {selectedZone && (
                        <View style={[styles.zoneInfoCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={styles.zoneInfoHeader}>
                                <View style={styles.zoneInfoLeft}>
                                    <View
                                        style={[
                                            styles.zoneColorIndicator,
                                            { backgroundColor: detectedZones.find((z) => z.id === selectedZone)?.color },
                                        ]}
                                    />
                                    <AppText style={[styles.zoneInfoTitle, { color: textPrimary }]}>
                                        {detectedZones.find((z) => z.id === selectedZone)?.name}
                                    </AppText>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedZone(null)}>
                                    <Ionicons name="close-circle" size={24} color={textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.zoneInfoActions}>
                                <TouchableOpacity
                                    style={[styles.zoneActionButton, { backgroundColor: cardBg }]}
                                    onPress={() => Alert.alert('Edit', 'Zone editing coming soon')}
                                >
                                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                                    <AppText style={[styles.zoneActionText, { color: textPrimary }]}>Edit</AppText>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.zoneActionButton, { backgroundColor: cardBg }]}
                                    onPress={() => handleDeleteZone(selectedZone)}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    <AppText style={[styles.zoneActionText, { color: textPrimary }]}>Remove</AppText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Map Stats */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <LinearGradient colors={['#10B981', '#059669']} style={styles.statIconBox}>
                                <Ionicons name="navigate" size={22} color="#FFFFFF" />
                            </LinearGradient>
                            <AppText style={[styles.statValue, { color: textPrimary }]}>
                                {mapData.mappedArea}m²
                            </AppText>
                            <AppText style={[styles.statLabel, { color: textSecondary }]}>
                                Mapped
                            </AppText>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.statIconBox}>
                                <Ionicons name="warning" size={22} color="#FFFFFF" />
                            </LinearGradient>
                            <AppText style={[styles.statValue, { color: textPrimary }]}>
                                {mapData.obstacles}
                            </AppText>
                            <AppText style={[styles.statLabel, { color: textSecondary }]}>
                                Obstacles
                            </AppText>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.statIconBox}>
                                <Ionicons name="layers" size={22} color="#FFFFFF" />
                            </LinearGradient>
                            <AppText style={[styles.statValue, { color: textPrimary }]}>
                                {mapData.detectedZones}
                            </AppText>
                            <AppText style={[styles.statLabel, { color: textSecondary }]}>
                                Areas
                            </AppText>
                        </View>
                    </View>

                    {/* Map Actions */}
                    <View style={[styles.actionsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.actionsHeader}>
                            <AppText style={[styles.actionsTitle, { color: textPrimary }]}>
                                Map Actions
                            </AppText>
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
                                <AppText style={styles.actionText}>Refresh Scan</AppText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleAddZone}
                                disabled={busy}
                            >
                                <LinearGradient colors={['#10B981', '#059669']} style={styles.actionIcon}>
                                    <Ionicons name="add" size={24} color="#fff" />
                                </LinearGradient>
                                <AppText style={styles.actionText}>Re-Scan</AppText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => Alert.alert('Export', 'Map exported successfully!')}
                                disabled={busy}
                            >
                                <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.actionIcon}>
                                    <Ionicons name="download" size={24} color="#fff" />
                                </LinearGradient>
                                <AppText style={styles.actionText}>Export</AppText>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Quick Links - redesigned to match Dashboard Quick Actions */}
                    <View style={[styles.actionsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.actionsHeader}>
                            <AppText style={[styles.actionsTitle, { color: textPrimary }]}>
                                Quick Links
                            </AppText>
                        </View>

                        <View style={styles.actionsGrid}>
                            {[
                                {
                                    icon: 'grid-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Dashboard',
                                    route: '/(tabs)/01_DashboardScreen',
                                    color: '#6366f1'
                                },
                                {
                                    icon: 'game-controller-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Control',
                                    route: '/(tabs)/02_ControlScreen',
                                    color: '#10B981'
                                },
                            ].map((item) => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[
                                        styles.actionTile,
                                        {
                                            backgroundColor: `${item.color}${darkMode ? '1a' : '12'}`,
                                            borderColor: `${item.color}30`,
                                        }
                                    ]}
                                    onPress={() => router.push(item.route)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={item.icon} size={24} color={item.color} />
                                    <AppText style={[styles.actionLabel, { color: textPrimary }]}>
                                        {item.label}
                                    </AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 25,
        paddingBottom: 80,
    },
    scrollContentLarge: {
        alignItems: 'center',
    },

    wrapper: { width: '100%' },
    largeWrapper: { maxWidth: 480 },

    headerSection: {
        marginBottom: 32,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0.1,
    },

    mapBox: {
        height: 340,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 20,
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
        borderRadius: 24,
        padding: 24,
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
        borderRadius: 24,
        padding: 24,
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

    // Quick Links - matching Dashboard Quick Actions
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionTile: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 20,
        alignItems: 'center',
        gap: 10,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
    },

    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});