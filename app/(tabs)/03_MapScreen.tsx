// app/(tabs)/03_MapScreen.tsx
//
// ============================================================
// PREMIUM MAP SCREEN - DASHBOARD DESIGN LANGUAGE
// ------------------------------------------------------------
// Matches DashboardScreen styling with consistent card design,
// typography, spacing, and visual hierarchy
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Animated,
    RefreshControl,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import Loader from '../../src/components/Loader';
import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';

// ============================================================
// C++ INTEGRATION OVERVIEW
// ------------------------------------------------------------
// When integrating real hardware via native C++ bridge:
//
//   1. Replace Supabase polling with RobotBridge.subscribeToMap()
//      for live SLAM (Simultaneous Localization And Mapping) data
//   2. Replace setInterval robot position polling with:
//      RobotBridge.subscribeToPosition((x, y) => setRobotPos(...))
//   3. Zone data (rooms, obstacles) flows from robot's vision system
//      via RobotBridge.getDetectedZones()
//   4. All C++ integration points are clearly marked below
// ============================================================

// Types
type MapData = {
    mappedArea: number;
    obstacles: number;
    detectedZones: number;
    lastUpdated: Date;
    robotPosition: { x: number; y: number };
    coverage: number;
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
    type: 'room' | 'obstacle';
};

// Helpers
function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

// Sub-components
function PulsingDot({ active }: { active: boolean }) {
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!active) {
            scale.setValue(1);
            return;
        }

        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(scale, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [active]);

    return (
        <Animated.View
            style={[
                pulseStyles.dot,
                {
                    backgroundColor: active ? '#22c55e' : '#94a3b8',
                    transform: [{ scale }],
                },
            ]}
        />
    );
}

const pulseStyles = StyleSheet.create({
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});

// Main Screen
export default function MapScreen() {
    const { colors, darkMode } = useThemeContext();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    // State
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mapData, setMapData] = useState<MapData | null>(null);
    const [detectedZones, setDetectedZones] = useState<DetectedZone[]>([]);
    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    const [showGrid, setShowGrid] = useState(true);

    // Design tokens - matching Dashboard exactly
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const robotPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        // Robot pulse animation when cleaning
        if (mapData?.coverage && mapData.coverage > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(robotPulse, { toValue: 1.2, duration: 1500, useNativeDriver: true }),
                    Animated.timing(robotPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
                ])
            ).start();
        }
    }, [mapData?.coverage]);

    // Fetch map data from Supabase
    const fetchMapData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Not authenticated');

            // === C++ INTEGRATION POINT ===
            // Replace Supabase fetch with live SLAM data stream:
            // const mapSnapshot = await RobotBridge.getMapSnapshot();
            // const liveZones = await RobotBridge.getDetectedZones();

            // Fetch robot status from robots table (filtered by owner)
            const { data: statusData, error: statusError } = await supabase
                .from('robots')
                .select('*')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (statusError && statusError.code !== 'PGRST116') {
                throw statusError;
            }

            // map_zones table not yet available — show empty map until robot scans
            // === C++ INTEGRATION POINT ===
            // Replace with: const liveZones = await RobotBridge.getDetectedZones();
            const zones: DetectedZone[] = [];

            setMapData({
                mappedArea: 0,
                obstacles: 0,
                detectedZones: 0,
                lastUpdated: statusData?.updated_at ? new Date(statusData.updated_at) : new Date(),
                robotPosition: {
                    // === C++ INTEGRATION POINT ===
                    // Replace with: const pos = await RobotBridge.getRobotPosition();
                    x: 50,
                    y: 50,
                },
                coverage: 0,
                cleanedAreas: [],
                // === C++ INTEGRATION POINT ===
                // Replace cleanedAreas with: const cleaned = await RobotBridge.getCleanedAreaPolygons();
            });

            setDetectedZones(zones);

            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (err: any) {
            console.error('[MapScreen] fetch failed:', err);
            Alert.alert('Error', 'Failed to load map data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchMapData();

        // === C++ INTEGRATION POINT ===
        // Subscribe to real-time robot position updates from hardware SLAM:
        // const positionSub = RobotBridge.subscribeToPosition((x, y) => {
        //   setMapData(prev => prev ? { ...prev, robotPosition: { x, y } } : null);
        // });
        // Subscribe to map updates (new rooms/obstacles detected):
        // const mapSub = RobotBridge.subscribeToMap((snapshot) => {
        //   setMapData(prev => prev ? { ...prev, ...snapshot } : null);
        // });
        // return () => {
        //   positionSub.unsubscribe();
        //   mapSub.unsubscribe();
        // };
    }, []);

    const onRefresh = useCallback(() => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setRefreshing(true);
        fetchMapData();
    }, []);

    const handleZonePress = useCallback((zoneId: string) => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setSelectedZone(selectedZone === zoneId ? null : zoneId);
    }, [selectedZone]);

    const handleRescan = useCallback(() => {
        Alert.alert(
            'Rescan Environment',
            'Robot will perform a new scan of the area.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start Scan',
                    onPress: () => {
                        if (Platform.OS === 'ios') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                        fetchMapData();
                    }
                }
            ]
        );
    }, []);

    if (loading && !mapData) {
        return <Loader message="Loading map..." />;
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.scrollContentLarge,
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                    {/* Header - matching Dashboard exactly */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Robot Map
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            Real-time navigation & mapping
                        </AppText>
                    </View>

                    {/* Map Container Card - matching Dashboard card styling */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        {/* Map Header */}
                        <View style={styles.mapHeader}>
                            <View style={styles.mapHeaderLeft}>
                                <View style={[styles.mapAvatar, { backgroundColor: darkMode ? 'rgba(59,130,246,0.16)' : 'rgba(59,130,246,0.12)' }]}>
                                    <Ionicons name="map" size={24} color={colors.primary} />
                                </View>
                                <View>
                                    <AppText style={[styles.mapTitle, { color: textPrimary }]}>
                                        Floor Plan
                                    </AppText>
                                    <View style={styles.mapStatusRow}>
                                        <PulsingDot active={mapData?.coverage ? mapData.coverage > 50 : false} />
                                        <AppText style={[styles.mapStatus, { color: textSecondary }]}>
                                            {mapData?.coverage}% mapped
                                        </AppText>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.gridToggle}
                                onPress={() => {
                                    if (Platform.OS === 'ios') {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }
                                    setShowGrid(!showGrid);
                                }}
                            >
                                <Ionicons
                                    name={showGrid ? 'grid' : 'grid-outline'}
                                    size={20}
                                    color={colors.primary}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                        {/* Map Visualization */}
                        <View style={styles.mapContainer}>
                            {/* Not-yet-scanned placeholder */}
                            {mapData?.coverage === 0 && detectedZones.length === 0 && (
                                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
                                    <Ionicons name="scan-outline" size={40} color={textSecondary} style={{ opacity: 0.4 }} />
                                    <AppText style={{ color: textSecondary, fontSize: 14, opacity: 0.6 }}>
                                        No map data yet — start a scan
                                    </AppText>
                                </View>
                            )}
                            {/* Grid Overlay */}
                            {showGrid && (
                                <View style={styles.gridOverlay}>
                                    {[...Array(12)].map((_, i) => (
                                        <View key={`col-${i}`} style={styles.gridColumn}>
                                            {[...Array(12)].map((_, j) => (
                                                <View
                                                    key={`cell-${j}`}
                                                    style={[
                                                        styles.gridCell,
                                                        { borderColor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }
                                                    ]}
                                                />
                                            ))}
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Zones */}
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
                                            backgroundColor: `${zone.color}${selectedZone === zone.id ? '20' : '10'}`,
                                            borderColor: selectedZone === zone.id ? zone.color : `${zone.color}30`,
                                            borderWidth: selectedZone === zone.id ? 2 : 1,
                                        }
                                    ]}
                                    onPress={() => handleZonePress(zone.id)}
                                    activeOpacity={0.8}
                                >
                                    <AppText style={[styles.zoneName, { color: zone.color }]}>
                                        {zone.name}
                                    </AppText>
                                </TouchableOpacity>
                            ))}

                            {/* Robot Position */}
                            {mapData && (
                                <Animated.View
                                    style={[
                                        styles.robotPosition,
                                        {
                                            left: `${mapData.robotPosition.x}%`,
                                            top: `${mapData.robotPosition.y}%`,
                                            transform: [
                                                { translateX: -16 },
                                                { translateY: -16 },
                                                { scale: robotPulse }
                                            ],
                                        },
                                    ]}
                                >
                                    <View style={[styles.robotIcon, { backgroundColor: colors.primary }]}>
                                        <Ionicons name="navigate" size={20} color="#FFFFFF" />
                                    </View>
                                </Animated.View>
                            )}

                            {/* Last Updated Badge */}
                            {mapData && (
                                <View style={[styles.updateBadge, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                    <Ionicons name="time-outline" size={12} color={textSecondary} />
                                    <AppText style={[styles.updateText, { color: textSecondary }]}>
                                        Updated {formatTimeAgo(mapData.lastUpdated)}
                                    </AppText>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Quick Stats Row - matching Dashboard exactly */}
                    <View style={styles.statsRow}>
                        {[
                            {
                                icon: 'map-outline' as keyof typeof Ionicons.glyphMap,
                                color: '#10B981',
                                value: `${mapData?.mappedArea ?? 0}m²`,
                                label: 'Mapped'
                            },
                            {
                                icon: 'warning-outline' as keyof typeof Ionicons.glyphMap,
                                color: '#F59E0B',
                                value: mapData?.obstacles ?? 0,
                                label: 'Obstacles'
                            },
                            {
                                icon: 'layers-outline' as keyof typeof Ionicons.glyphMap,
                                color: '#8B5CF6',
                                value: mapData?.detectedZones ?? 0,
                                label: 'Zones'
                            },
                        ].map((stat) => (
                            <View
                                key={stat.label}
                                style={[
                                    styles.statCard,
                                    { backgroundColor: cardBg, borderColor: cardBorder }
                                ]}
                            >
                                <Ionicons name={stat.icon} size={24} color={stat.color} />
                                <AppText style={[styles.statValue, { color: textPrimary }]}>
                                    {stat.value}
                                </AppText>
                                <AppText style={[styles.statLabel, { color: textSecondary }]}>
                                    {stat.label}
                                </AppText>
                            </View>
                        ))}
                    </View>

                    {/* Selected Zone Details - appears when zone is selected */}
                    {selectedZone && (
                        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            {(() => {
                                const zone = detectedZones.find(z => z.id === selectedZone);
                                if (!zone) return null;

                                return (
                                    <>
                                        <View style={styles.zoneDetailsHeader}>
                                            <View style={styles.zoneDetailsLeft}>
                                                <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
                                                <View>
                                                    <AppText style={[styles.zoneDetailsName, { color: textPrimary }]}>
                                                        {zone.name}
                                                    </AppText>
                                                    <AppText style={[styles.zoneDetailsType, { color: textSecondary }]}>
                                                        {zone.type === 'room' ? 'Living Area' : 'Obstacle'} • {Math.round(zone.width * zone.height)} m²
                                                    </AppText>
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => setSelectedZone(null)}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <Ionicons name="close" size={20} color={textSecondary} />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: 16 }]} />

                                        <View style={styles.zoneActions}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.zoneAction,
                                                    {
                                                        backgroundColor: darkMode ? 'rgba(59,130,246,0.16)' : 'rgba(59,130,246,0.12)',
                                                    }
                                                ]}
                                                onPress={() => {
                                                    Alert.alert('Clean Zone', `Start cleaning ${zone.name}?`);
                                                }}
                                            >
                                                <Ionicons name="play" size={18} color={colors.primary} />
                                                <AppText style={[styles.zoneActionText, { color: colors.primary }]}>
                                                    Clean Now
                                                </AppText>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.zoneAction,
                                                    {
                                                        backgroundColor: darkMode ? 'rgba(239,68,68,0.16)' : 'rgba(239,68,68,0.12)',
                                                    }
                                                ]}
                                                onPress={() => {
                                                    Alert.alert(
                                                        'Remove Zone',
                                                        'Remove this zone from the map?',
                                                        [
                                                            { text: 'Cancel', style: 'cancel' },
                                                            {
                                                                text: 'Remove',
                                                                style: 'destructive',
                                                                onPress: () => {
                                                                    setDetectedZones(prev => prev.filter(z => z.id !== zone.id));
                                                                    setSelectedZone(null);
                                                                    setMapData(prev => prev ? {
                                                                        ...prev,
                                                                        detectedZones: prev.detectedZones - 1
                                                                    } : null);
                                                                }
                                                            }
                                                        ]
                                                    );
                                                }}
                                            >
                                                <Ionicons name="trash" size={18} color="#EF4444" />
                                                <AppText style={[styles.zoneActionText, { color: '#EF4444' }]}>
                                                    Remove
                                                </AppText>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                );
                            })()}
                        </View>
                    )}

                    {/* Map Actions Card - matching Dashboard Quick Actions */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons
                                name="flash-outline"
                                size={18}
                                color={colors.primary}
                                style={{ marginRight: 8 }}
                            />
                            <AppText style={[styles.cardTitle, { color: textSecondary }]}>
                                Map Actions
                            </AppText>
                        </View>

                        <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: 16 }]} />

                        <View style={styles.actionsGrid}>
                            {[
                                {
                                    icon: 'scan-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Rescan',
                                    action: handleRescan,
                                    color: '#6366f1'
                                },
                                {
                                    icon: 'download-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Export',
                                    // === C++ INTEGRATION POINT ===
                                // Export the occupancy grid / floor plan to PDF or image:
                                // const mapImage = await RobotBridge.exportMapAsImage();
                                // Share via expo-sharing or save to gallery via expo-media-library
                                action: () => Alert.alert('Export Map', 'Connect your robot to export the floor plan.\n\n(C++ bridge: RobotBridge.exportMapAsImage())'),
                                    color: '#ec4899'
                                },
                                {
                                    icon: 'refresh-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Reset',
                                    action: () => {
                                        Alert.alert(
                                            'Reset Map',
                                            'Clear all mapping data?',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Reset',
                                                    style: 'destructive',
                                                    onPress: () => {
                                                        setMapData(prev => prev ? {
                                                            ...prev,
                                                            mappedArea: 0,
                                                            coverage: 0,
                                                            cleanedAreas: []
                                                        } : null);
                                                        setDetectedZones([]);
                                                    }
                                                }
                                            ]
                                        );
                                    },
                                    color: '#14b8a6'
                                },
                            ].map((action) => (
                                <TouchableOpacity
                                    key={action.label}
                                    style={[
                                        styles.actionButton,
                                        {
                                            backgroundColor: `${action.color}${darkMode ? '1a' : '12'}`,
                                            borderColor: `${action.color}30`,
                                        }
                                    ]}
                                    onPress={() => {
                                        if (Platform.OS === 'ios') {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }
                                        action.action();
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={action.icon} size={24} color={action.color} />
                                    <AppText style={[styles.actionLabel, { color: textPrimary }]}>
                                        {action.label}
                                    </AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Quick Links Card - matching Dashboard */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons
                                name="apps-outline"
                                size={18}
                                color={colors.primary}
                                style={{ marginRight: 8 }}
                            />
                            <AppText style={[styles.cardTitle, { color: textSecondary }]}>
                                Quick Navigation
                            </AppText>
                        </View>

                        <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: 16 }]} />

                        <View style={styles.actionsGrid}>
                            {[
                                {
                                    icon: 'speedometer-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Dashboard',
                                    route: '/(tabs)/01_DashboardScreen',
                                    color: '#10B981'
                                },
                                {
                                    icon: 'game-controller-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Control',
                                    route: '/(tabs)/02_ControlScreen',
                                    color: '#6366f1'
                                },
                                {
                                    icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
                                    label: 'Schedule',
                                    route: '/(tabs)/04_ScheduleScreen',
                                    color: '#8B5CF6'
                                },
                            ].map((item) => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[
                                        styles.actionButton,
                                        {
                                            backgroundColor: `${item.color}${darkMode ? '1a' : '12'}`,
                                            borderColor: `${item.color}30`,
                                        }
                                    ]}
                                    onPress={() => {
                                        if (Platform.OS === 'ios') {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }
                                        router.push(item.route as any);
                                    }}
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

                {/* Footer - matching Dashboard */}
                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>
        </SafeAreaView>
    );
}

// Styles - matching DashboardScreen exactly
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

    // Header - matching Dashboard
    headerSection: {
        marginBottom: 32,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        fontFamily: 'SF-Pro-Display-Bold',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0.1,
    },

    // Cards - matching Dashboard
    card: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
    },

    divider: {
        height: 1,
        marginVertical: 20,
    },

    // Map Header
    mapHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    mapHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    mapAvatar: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    mapStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    mapStatus: {
        fontSize: 13,
        fontWeight: '500',
    },
    gridToggle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Map Container
    mapContainer: {
        height: 320,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
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
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    zoneName: {
        fontSize: 10,
        fontWeight: '700',
    },
    robotPosition: {
        position: 'absolute',
        width: 32,
        height: 32,
        zIndex: 20,
    },
    robotIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
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
        borderWidth: 1,
        zIndex: 30,
    },
    updateText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // Zone Details
    zoneDetailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    zoneDetailsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    zoneDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    zoneDetailsName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    zoneDetailsType: {
        fontSize: 13,
        fontWeight: '500',
    },
    zoneActions: {
        flexDirection: 'row',
        gap: 12,
    },
    zoneAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
    },
    zoneActionText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Stats Row - matching Dashboard
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        borderRadius: 18,
        paddingVertical: 20,
        paddingHorizontal: 8,
        alignItems: 'center',
        borderWidth: 1,
        gap: 8,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },

    // Card Header - matching Dashboard
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Actions Grid - matching Dashboard
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 18,
        alignItems: 'center',
        gap: 10,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Footer - matching Dashboard
    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});