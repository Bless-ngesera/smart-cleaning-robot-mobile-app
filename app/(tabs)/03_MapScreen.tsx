// app/(tabs)/03_MapScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeContext } from "@/src/context/ThemeContext";
import { ProductionRobotService as robotService } from "@/src/services/ProductionRobotService";
import { supabase } from "@/src/services/supabase";
import AppText from "../../src/components/AppText";
import Loader from "../../src/components/Loader";

// Types
type RobotRow = {
  id: string;
  name: string;
  status: string;
  mode: string;
  is_online: boolean;
  last_seen: string;
  updated_at: string;
};

type RobotStatusRow = {
  id: string;
  robot_id: string;
  status: string;
  left_sensor: number;
  right_sensor: number;
  movement: string;
  mode: string;
  last_updated: string;
};

type CleaningZone = {
  id: string;
  robot_id: string;
  zone_name: string;
  coordinates: any;
  cleaned_at: string | null;
  cleaning_duration: number | null;
  area_cleaned: number | null;
  status: string;
  created_at: string;
};

interface ToastMessage {
  id: string;
  text: string;
  type: "success" | "error" | "info" | "warning";
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function sensorLabel(value: number): string {
  if (value <= 0) return "N/A";
  if (value < 20) return "Very close";
  if (value < 50) return "Near";
  return "Clear";
}

function sensorColor(value: number): string {
  if (value <= 0) return "#94a3b8";
  if (value < 20) return "#EF4444";
  if (value < 50) return "#F59E0B";
  return "#10B981";
}

function PulsingDot({
  active,
  color = "#22c55e",
}: {
  active: boolean;
  color?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: active ? color : "#94a3b8",
        transform: [{ scale }],
      }}
    />
  );
}

const movementAngle: Record<string, number> = {
  FORWARD: 0,
  BACKWARD: 180,
  LEFT: -90,
  RIGHT: 90,
  STOP: 0,
};

export default function MapScreen() {
  const { colors, darkMode } = useThemeContext();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [robot, setRobot] = useState<RobotRow | null>(null);
  const [robotStatus, setRobotStatus] = useState<RobotStatusRow | null>(null);
  const [logCount, setLogCount] = useState(0);
  const [cleaningZones, setCleaningZones] = useState<CleaningZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const cardBg = darkMode ? "rgba(255,255,255,0.05)" : "#ffffff";
  const cardBorder = darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const textPrimary = darkMode ? "#ffffff" : "#1a1a2e";
  const textSecondary = darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.60)";
  const dividerColor = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  const successColor = "#10B981";
  const errorColor = "#EF4444";
  const warningColor = "#F59E0B";
  const infoColor = "#3B82F6";

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const robotPulse = useRef(new Animated.Value(1)).current;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const toastAnimations = useRef<{ [key: string]: Animated.Value }>({});

  // Show toast message
  const showToast = useCallback((text: string, type: ToastMessage["type"]) => {
    const id = Date.now().toString();
    const fadeAnim = new Animated.Value(0);
    const slideAnim = new Animated.Value(-100);

    toastAnimations.current[id] = fadeAnim;

    setToasts((prev) => [...prev, { id, text, type }]);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
        delete toastAnimations.current[id];
      });
    }, 5000);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const moving = robotStatus?.movement && robotStatus.movement !== "STOP";
    if (!moving) {
      robotPulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(robotPulse, {
          toValue: 1.18,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(robotPulse, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [robotStatus?.movement]);

  // Fetch cleaning zones from database
  const fetchCleaningZones = useCallback(async (robotId: string) => {
    try {
      const { data, error } = await supabase
        .from("cleaning_zones")
        .select("*")
        .eq("robot_id", robotId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setCleaningZones(data);
      }
    } catch (err) {
      console.error("[MapScreen] fetchCleaningZones error:", err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated");

      const { data: robotData, error: robotError } = await supabase
        .from("robots")
        .select(
          "id, name, status, mode, is_online, last_seen, updated_at",
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (robotError && robotError.code !== "PGRST116") throw robotError;
      setRobot(robotData ?? null);

      if (robotData?.id) {
        const { data: statusData } = await supabase
          .from("robot_status")
          .select("*")
          .eq("robot_id", robotData.id)
          .order("last_updated", { ascending: false })
          .limit(1)
          .maybeSingle();

        setRobotStatus(statusData ?? null);

        const { count } = await supabase
          .from("robot_logs")
          .select("id", { count: "exact", head: true })
          .eq("robot_id", robotData.id)
          .eq("event_type", "command");

        setLogCount(count ?? 0);

        await fetchCleaningZones(robotData.id);
      }

      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      console.error("[MapScreen] fetch failed:", err);
      showToast(err.message || "Failed to load map data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchCleaningZones, showToast]);

  const subscribeToRobotStatus = useCallback(
    (robotId: string) => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      channelRef.current = supabase
        .channel(`map-robot-status-${robotId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "robot_status",
            filter: `robot_id=eq.${robotId}`,
          },
          (payload) => {
            setRobotStatus(payload.new as RobotStatusRow);
            setLastUpdated(new Date().toISOString());
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "robots",
            filter: `id=eq.${robotId}`,
          },
          (payload) => {
            setRobot((prev) =>
              prev ? { ...prev, ...(payload.new as Partial<RobotRow>) } : null,
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cleaning_zones",
            filter: `robot_id=eq.${robotId}`,
          },
          () => {
            fetchCleaningZones(robotId);
          },
        )
        .subscribe();
    },
    [fetchCleaningZones],
  );

  useEffect(() => {
    fetchData();
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (robot?.id) {
      subscribeToRobotStatus(robot.id);
    }
  }, [robot?.id]);

  const onRefresh = useCallback(() => {
    if (Platform.OS === "ios")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleStartZoneCleaning = useCallback(
    async (zoneId: string, zoneName: string) => {
      if (!robot?.id) {
        showToast("No robot connected", "error");
        return;
      }

      try {
        const result = await robotService.sendCommand(`CLEAN_ZONE_${zoneId}`);

        if (result.success) {
          showToast(`Starting cleaning in ${zoneName}`, "success");

          await supabase
            .from("cleaning_zones")
            .update({ status: "cleaning" })
            .eq("id", zoneId);
        } else {
          throw new Error(result.message);
        }
      } catch (err: any) {
        showToast(err.message || "Failed to start cleaning", "error");
      }
    },
    [robot?.id, showToast],
  );

  const handleRemoveZone = useCallback(
    async (zoneId: string) => {
      Alert.alert("Remove Zone", "Remove this cleaning zone from the map?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("cleaning_zones")
                .delete()
                .eq("id", zoneId);

              if (error) throw error;

              setCleaningZones((prev) => prev.filter((z) => z.id !== zoneId));
              setSelectedZone(null);
              showToast("Zone removed successfully", "success");
            } catch (err: any) {
              showToast(err.message || "Failed to remove zone", "error");
            }
          },
        },
      ]);
    },
    [showToast],
  );

  const handleRescan = useCallback(async () => {
    if (!robot?.id) {
      showToast("No robot connected", "error");
      return;
    }

    showToast("Starting environment scan...", "info");

    try {
      const result = await robotService.sendCommand("SCAN_ENVIRONMENT");

      if (result.success) {
        showToast("Scan completed! New zones detected.", "success");
        await fetchCleaningZones(robot.id);
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to scan environment", "error");
    }
  }, [robot?.id, fetchCleaningZones, showToast]);

  const handleResetMap = useCallback(async () => {
    if (!robot?.id) {
      showToast("No robot connected", "error");
      return;
    }

    Alert.alert(
      "Reset Map",
      "Clear all cleaning zones from the map? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("cleaning_zones")
                .delete()
                .eq("robot_id", robot.id);

              if (error) throw error;

              setCleaningZones([]);
              setSelectedZone(null);
              showToast("Map reset successfully", "success");
            } catch (err: any) {
              showToast(err.message || "Failed to reset map", "error");
            }
          },
        },
      ],
    );
  }, [robot?.id, showToast]);

  // Render toast messages
  const renderToasts = () => {
    const statusBarHeight =
      StatusBar.currentHeight || (Platform.OS === "ios" ? 47 : 0);

    return toasts.map((toast, index) => {
      const toastColor =
        toast.type === "success"
          ? successColor
          : toast.type === "error"
            ? errorColor
            : toast.type === "warning"
              ? warningColor
              : infoColor;
      const fadeAnim =
        toastAnimations.current[toast.id] || new Animated.Value(1);

      return (
        <Animated.View
          key={toast.id}
          style={[
            styles.toast,
            {
              backgroundColor: toastColor,
              top: statusBarHeight + 10 + index * 70,
              left: 16,
              right: 16,
              opacity: fadeAnim,
            },
          ]}
        >
          <Ionicons
            name={
              toast.type === "success"
                ? "checkmark-circle"
                : toast.type === "error"
                  ? "alert-circle"
                  : toast.type === "warning"
                    ? "warning"
                    : "information-circle"
            }
            size={22}
            color="#fff"
          />
          <AppText style={styles.toastText}>{toast.text}</AppText>
          <TouchableOpacity
            onPress={() => {
              const anim = toastAnimations.current[toast.id];
              if (anim) {
                Animated.timing(anim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start(() => {
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                  delete toastAnimations.current[toast.id];
                });
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </Animated.View>
      );
    });
  };

  const movement = robotStatus?.movement ?? "STOP";
  const robotRotation = movementAngle[movement] ?? 0;
  const isOnline = robot?.is_online ?? false;
  const leftSensor = robotStatus?.left_sensor ?? 0;
  const rightSensor = robotStatus?.right_sensor ?? 0;
  const currentMode = robotStatus?.mode ?? robot?.mode ?? "IDLE";

  // Convert cleaning zones to visual zones with random but consistent colors
  const getZoneColor = (index: number): string => {
    const colors = [
      "#6366f1",
      "#ec4899",
      "#14b8a6",
      "#f59e0b",
      "#8b5cf6",
      "#06b6d4",
    ];
    return colors[index % colors.length];
  };

  if (loading && !robot) {
    return <Loader message="Loading map..." />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      {renderToasts()}

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
        <Animated.View
          style={[
            styles.wrapper,
            isLargeScreen && styles.largeWrapper,
            { opacity: fadeAnim },
          ]}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <AppText style={[styles.headerTitle, { color: textPrimary }]}>
              Robot Map
            </AppText>
            <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
              Real-time navigation & sensor data
            </AppText>
          </View>

          {/* Robot Status Banner */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isOnline ? `${colors.primary}12` : cardBg,
                borderColor: isOnline ? colors.primary : cardBorder,
              },
            ]}
          >
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusIcon,
                  {
                    backgroundColor: isOnline
                      ? `${colors.primary}25`
                      : cardBorder,
                  },
                ]}
              >
                <Ionicons
                  name="hardware-chip"
                  size={22}
                  color={isOnline ? colors.primary : textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={[styles.statusName, { color: textPrimary }]}>
                  {robot?.name ?? "No robot connected"}
                </AppText>
                <View style={styles.statusMeta}>
                  <PulsingDot active={isOnline} color={colors.primary} />
                  <AppText style={[styles.statusSub, { color: textSecondary }]}>
                    {isOnline ? `Online · ${currentMode}` : "Offline"}
                  </AppText>
                </View>
              </View>
            </View>
          </View>

          {/* Live Stats Row */}
          <View style={styles.statsRow}>
            {[
              {
                icon: "arrow-back-circle" as const,
                color: sensorColor(leftSensor),
                value: leftSensor > 0 ? `${leftSensor}cm` : "N/A",
                label: "Left Sensor",
              },
              {
                icon: "arrow-forward-circle" as const,
                color: sensorColor(rightSensor),
                value: rightSensor > 0 ? `${rightSensor}cm` : "N/A",
                label: "Right Sensor",
              },
              {
                icon: "list-circle" as const,
                color: "#8B5CF6",
                value: logCount,
                label: "Commands",
              },
            ].map((stat) => (
              <View
                key={stat.label}
                style={[
                  styles.statCard,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
              >
                <Ionicons name={stat.icon} size={22} color={stat.color} />
                <AppText style={[styles.statValue, { color: textPrimary }]}>
                  {stat.value}
                </AppText>
                <AppText style={[styles.statLabel, { color: textSecondary }]}>
                  {stat.label}
                </AppText>
              </View>
            ))}
          </View>

          {/* Map Visualization Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            <View style={styles.mapHeader}>
              <View style={styles.mapHeaderLeft}>
                <View
                  style={[
                    styles.mapAvatar,
                    {
                      backgroundColor: darkMode
                        ? "rgba(59,130,246,0.16)"
                        : "rgba(59,130,246,0.12)",
                    },
                  ]}
                >
                  <Ionicons name="map" size={22} color={colors.primary} />
                </View>
                <View>
                  <AppText style={[styles.mapTitle, { color: textPrimary }]}>
                    Floor Plan
                  </AppText>
                  <View style={styles.mapStatusRow}>
                    <PulsingDot
                      active={movement !== "STOP" && isOnline}
                      color={successColor}
                    />
                    <AppText
                      style={[styles.mapStatus, { color: textSecondary }]}
                    >
                      {movement !== "STOP" && isOnline
                        ? `Moving ${movement.toLowerCase()}`
                        : "Stationary"}
                    </AppText>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.gridToggle}
                onPress={() => {
                  if (Platform.OS === "ios")
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowGrid((v) => !v);
                }}
              >
                <Ionicons
                  name={showGrid ? "grid" : "grid-outline"}
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            {/* Map Canvas */}
            <View
              style={[
                styles.mapContainer,
                {
                  backgroundColor: darkMode
                    ? "rgba(0,0,0,0.3)"
                    : "rgba(0,0,0,0.03)",
                },
              ]}
            >
              {!robot && (
                <View style={styles.emptyMap}>
                  <Ionicons
                    name="scan-outline"
                    size={40}
                    color={textSecondary}
                    style={{ opacity: 0.4 }}
                  />
                  <AppText
                    style={[styles.emptyMapText, { color: textSecondary }]}
                  >
                    No robot connected — start a scan
                  </AppText>
                </View>
              )}

              {showGrid && (
                <View style={styles.gridOverlay}>
                  {[...Array(10)].map((_, i) => (
                    <View key={`col-${i}`} style={styles.gridColumn}>
                      {[...Array(10)].map((_, j) => (
                        <View
                          key={`cell-${j}`}
                          style={[
                            styles.gridCell,
                            {
                              borderColor: darkMode
                                ? "rgba(255,255,255,0.04)"
                                : "rgba(0,0,0,0.04)",
                            },
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              )}

              {/* Obstacle indicators from sensors */}
              {leftSensor > 0 && leftSensor < 50 && (
                <View
                  style={[
                    styles.obstacleIndicator,
                    {
                      left: "8%",
                      top: "45%",
                      backgroundColor: `${sensorColor(leftSensor)}25`,
                      borderColor: sensorColor(leftSensor),
                    },
                  ]}
                >
                  <Ionicons
                    name="warning"
                    size={12}
                    color={sensorColor(leftSensor)}
                  />
                </View>
              )}
              {rightSensor > 0 && rightSensor < 50 && (
                <View
                  style={[
                    styles.obstacleIndicator,
                    {
                      right: "8%",
                      top: "45%",
                      backgroundColor: `${sensorColor(rightSensor)}25`,
                      borderColor: sensorColor(rightSensor),
                    },
                  ]}
                >
                  <Ionicons
                    name="warning"
                    size={12}
                    color={sensorColor(rightSensor)}
                  />
                </View>
              )}

              {/* Cleaning Zones from Database */}
              {cleaningZones.map((zone, index) => {
                // Generate pseudo-random but consistent position based on zone ID hash
                const hash = zone.id
                  .split("")
                  .reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const x = 15 + (hash % 70);
                const y = 15 + ((hash >> 8) % 70);
                const width = 25 + (hash % 20);
                const height = 20 + ((hash >> 4) % 15);
                const zoneColor = getZoneColor(index);

                return (
                  <TouchableOpacity
                    key={zone.id}
                    style={[
                      styles.zone,
                      {
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                        backgroundColor: `${zoneColor}${selectedZone === zone.id ? "25" : "15"}`,
                        borderColor:
                          selectedZone === zone.id
                            ? zoneColor
                            : `${zoneColor}40`,
                        borderWidth: selectedZone === zone.id ? 2 : 1.5,
                      },
                    ]}
                    onPress={() => {
                      if (Platform.OS === "ios")
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedZone(
                        selectedZone === zone.id ? null : zone.id,
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={zone.status === "cleaning" ? "refresh" : "home"}
                      size={14}
                      color={zoneColor}
                    />
                    <AppText style={[styles.zoneName, { color: zoneColor }]}>
                      {zone.zone_name}
                    </AppText>
                    {zone.area_cleaned && (
                      <AppText style={[styles.zoneArea, { color: zoneColor }]}>
                        {zone.area_cleaned}m²
                      </AppText>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Robot position */}
              {robot && (
                <Animated.View
                  style={[
                    styles.robotPosition,
                    {
                      transform: [
                        { translateX: -20 },
                        { translateY: -20 },
                        { scale: robotPulse },
                        { rotate: `${robotRotation}deg` },
                      ],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.robotIcon,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Ionicons name="navigate" size={22} color="#fff" />
                  </View>
                </Animated.View>
              )}

              {/* Last updated badge */}
              {lastUpdated && (
                <View
                  style={[
                    styles.updateBadge,
                    { backgroundColor: cardBg, borderColor: cardBorder },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={11}
                    color={textSecondary}
                  />
                  <AppText
                    style={[styles.updateText, { color: textSecondary }]}
                  >
                    {formatTimeAgo(lastUpdated)}
                  </AppText>
                </View>
              )}
            </View>

            {/* Zone count indicator */}
            {cleaningZones.length > 0 && (
              <View
                style={[
                  styles.zoneCountBadge,
                  { backgroundColor: `${colors.primary}15` },
                ]}
              >
                <Ionicons name="layers" size={14} color={colors.primary} />
                <AppText
                  style={[styles.zoneCountText, { color: colors.primary }]}
                >
                  {cleaningZones.length} Zone
                  {cleaningZones.length !== 1 ? "s" : ""} Detected
                </AppText>
              </View>
            )}
          </View>

          {/* Live Sensor Detail Card */}
          {robot && (
            <View
              style={[
                styles.card,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="pulse" size={18} color={colors.primary} />
                <AppText style={[styles.cardTitle, { color: textPrimary }]}>
                  Live Sensor Data
                </AppText>
                <View style={{ flex: 1 }} />
                <PulsingDot active={isOnline} color={colors.primary} />
              </View>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: dividerColor, marginVertical: 16 },
                ]}
              />

              <View style={styles.sensorGrid}>
                {[
                  {
                    label: "Movement",
                    value: movement,
                    icon: "navigate-circle" as const,
                    color: colors.primary,
                  },
                  {
                    label: "Mode",
                    value: currentMode,
                    icon: "settings" as const,
                    color: "#8B5CF6",
                  },
                  {
                    label: "Left Sensor",
                    value: `${leftSensor > 0 ? leftSensor + "cm" : "N/A"} · ${sensorLabel(leftSensor)}`,
                    icon: "arrow-back-circle" as const,
                    color: sensorColor(leftSensor),
                  },
                  {
                    label: "Right Sensor",
                    value: `${rightSensor > 0 ? rightSensor + "cm" : "N/A"} · ${sensorLabel(rightSensor)}`,
                    icon: "arrow-forward-circle" as const,
                    color: sensorColor(rightSensor),
                  },
                  {
                    label: "Last Seen",
                    value: robot.last_seen
                      ? formatTimeAgo(robot.last_seen)
                      : "Unknown",
                    icon: "time" as const,
                    color: warningColor,
                  },
                ].map((row) => (
                  <View
                    key={row.label}
                    style={[
                      styles.sensorRow,
                      { borderBottomColor: dividerColor },
                    ]}
                  >
                    <View
                      style={[
                        styles.sensorIconBox,
                        { backgroundColor: `${row.color}18` },
                      ]}
                    >
                      <Ionicons name={row.icon} size={16} color={row.color} />
                    </View>
                    <AppText
                      style={[styles.sensorLabel, { color: textSecondary }]}
                    >
                      {row.label}
                    </AppText>
                    <AppText
                      style={[styles.sensorValue, { color: textPrimary }]}
                    >
                      {row.value}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Selected Zone Details */}
          {selectedZone && (
            <View
              style={[
                styles.card,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              {(() => {
                const zone = cleaningZones.find((z) => z.id === selectedZone);
                if (!zone) return null;
                const zoneColor = getZoneColor(
                  cleaningZones.findIndex((z) => z.id === zone.id),
                );

                return (
                  <>
                    <View style={styles.zoneDetailsHeader}>
                      <View style={styles.zoneDetailsLeft}>
                        <View
                          style={[
                            styles.zoneDot,
                            { backgroundColor: zoneColor },
                          ]}
                        />
                        <View>
                          <AppText
                            style={[
                              styles.zoneDetailsName,
                              { color: textPrimary },
                            ]}
                          >
                            {zone.zone_name}
                          </AppText>
                          <AppText
                            style={[
                              styles.zoneDetailsType,
                              { color: textSecondary },
                            ]}
                          >
                            {zone.status === "cleaning"
                              ? "Cleaning in progress"
                              : zone.status === "completed"
                                ? "Cleaned"
                                : "Pending"}
                          </AppText>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSelectedZone(null)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name="close"
                          size={20}
                          color={textSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: dividerColor, marginVertical: 16 },
                      ]}
                    />

                    <View style={styles.zoneDetailsGrid}>
                      {zone.area_cleaned && (
                        <View style={styles.zoneDetailItem}>
                          <AppText
                            style={[
                              styles.zoneDetailLabel,
                              { color: textSecondary },
                            ]}
                          >
                            Area
                          </AppText>
                          <AppText
                            style={[
                              styles.zoneDetailValue,
                              { color: textPrimary },
                            ]}
                          >
                            {zone.area_cleaned} m²
                          </AppText>
                        </View>
                      )}
                      {zone.cleaning_duration && (
                        <View style={styles.zoneDetailItem}>
                          <AppText
                            style={[
                              styles.zoneDetailLabel,
                              { color: textSecondary },
                            ]}
                          >
                            Duration
                          </AppText>
                          <AppText
                            style={[
                              styles.zoneDetailValue,
                              { color: textPrimary },
                            ]}
                          >
                            {zone.cleaning_duration} min
                          </AppText>
                        </View>
                      )}
                      {zone.cleaned_at && (
                        <View style={styles.zoneDetailItem}>
                          <AppText
                            style={[
                              styles.zoneDetailLabel,
                              { color: textSecondary },
                            ]}
                          >
                            Last Cleaned
                          </AppText>
                          <AppText
                            style={[
                              styles.zoneDetailValue,
                              { color: textPrimary },
                            ]}
                          >
                            {formatTimeAgo(zone.cleaned_at)}
                          </AppText>
                        </View>
                      )}
                      <View style={styles.zoneDetailItem}>
                        <AppText
                          style={[
                            styles.zoneDetailLabel,
                            { color: textSecondary },
                          ]}
                        >
                          Created
                        </AppText>
                        <AppText
                          style={[
                            styles.zoneDetailValue,
                            { color: textPrimary },
                          ]}
                        >
                          {formatTimeAgo(zone.created_at)}
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.zoneActions}>
                      <TouchableOpacity
                        style={[
                          styles.zoneAction,
                          {
                            backgroundColor: `${colors.primary}15`,
                            borderColor: colors.primary,
                          },
                        ]}
                        onPress={() =>
                          handleStartZoneCleaning(zone.id, zone.zone_name)
                        }
                      >
                        <Ionicons
                          name="play"
                          size={18}
                          color={colors.primary}
                        />
                        <AppText
                          style={[
                            styles.zoneActionText,
                            { color: colors.primary },
                          ]}
                        >
                          Clean Now
                        </AppText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.zoneAction,
                          {
                            backgroundColor: `${errorColor}15`,
                            borderColor: errorColor,
                          },
                        ]}
                        onPress={() => handleRemoveZone(zone.id)}
                      >
                        <Ionicons name="trash" size={18} color={errorColor} />
                        <AppText
                          style={[styles.zoneActionText, { color: errorColor }]}
                        >
                          Remove
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()}
            </View>
          )}

          {/* Map Actions Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="flash-outline" size={18} color={colors.primary} />
              <AppText style={[styles.cardTitle, { color: textPrimary }]}>
                Map Actions
              </AppText>
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: dividerColor, marginVertical: 16 },
              ]}
            />

            <View style={styles.actionsGrid}>
              {[
                {
                  icon: "scan-outline" as const,
                  label: "Rescan",
                  action: handleRescan,
                  color: "#6366f1",
                },
                {
                  icon: "download-outline" as const,
                  label: "Export",
                  action: () =>
                    Alert.alert("Export Map", "Map data exported successfully"),
                  color: "#ec4899",
                },
                {
                  icon: "refresh-outline" as const,
                  label: "Reset",
                  action: handleResetMap,
                  color: "#14b8a6",
                },
              ].map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: `${action.color}${darkMode ? "1a" : "12"}`,
                      borderColor: `${action.color}30`,
                    },
                  ]}
                  onPress={() => {
                    if (Platform.OS === "ios")
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        </Animated.View>

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
    paddingBottom: 100,
  },
  scrollContentLarge: { alignItems: "center" },
  wrapper: { width: "100%" },
  largeWrapper: { maxWidth: 480 },

  headerSection: { marginBottom: 28 },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  headerSubtitle: { fontSize: 15, fontWeight: "400", letterSpacing: 0.1 },

  card: { borderRadius: 24, padding: 20, borderWidth: 1, marginBottom: 16 },
  divider: { height: 1 },

  statusRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  statusIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  statusName: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  statusMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusSub: { fontSize: 13, fontWeight: "500" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    gap: 6,
  },
  statValue: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  mapHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  mapAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mapTitle: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  mapStatusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  mapStatus: { fontSize: 13, fontWeight: "500" },
  gridToggle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  mapContainer: {
    height: 320,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  emptyMap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyMapText: { fontSize: 13, opacity: 0.6 },
  gridOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: "row" },
  gridColumn: { flex: 1 },
  gridCell: { flex: 1, borderWidth: 0.5 },
  obstacleIndicator: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  zone: {
    position: "absolute",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    gap: 2,
  },
  zoneName: { fontSize: 10, fontWeight: "700" },
  zoneArea: { fontSize: 9, opacity: 0.8 },
  zoneCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center",
    marginTop: 12,
  },
  zoneCountText: { fontSize: 11, fontWeight: "600" },
  robotPosition: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 40,
    height: 40,
    zIndex: 20,
  },
  robotIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  updateBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 30,
  },
  updateText: { fontSize: 11, fontWeight: "700" },

  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  sensorGrid: { gap: 0 },
  sensorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  sensorIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sensorLabel: { flex: 1, fontSize: 13, fontWeight: "500" },
  sensorValue: { fontSize: 13, fontWeight: "700" },

  zoneDetailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  zoneDetailsLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  zoneDot: { width: 12, height: 12, borderRadius: 6 },
  zoneDetailsName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  zoneDetailsType: { fontSize: 13, fontWeight: "500" },
  zoneDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  zoneDetailItem: {
    flex: 1,
    minWidth: "45%",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  zoneDetailLabel: { fontSize: 11, opacity: 0.7, marginBottom: 2 },
  zoneDetailValue: { fontSize: 14, fontWeight: "600" },
  zoneActions: { flexDirection: "row", gap: 12 },
  zoneAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  zoneActionText: { fontSize: 14, fontWeight: "600" },

  actionsGrid: { flexDirection: "row", gap: 12 },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
    gap: 10,
  },
  actionLabel: { fontSize: 13, fontWeight: "600" },

  footer: {
    textAlign: "center",
    marginTop: 28,
    fontSize: 12,
    opacity: 0.55,
    letterSpacing: 0.3,
  },

  toast: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
    zIndex: 9999,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  toastText: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
});
