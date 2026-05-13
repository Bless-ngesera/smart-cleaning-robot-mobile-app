// app/(tabs)/02_ControlScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  useWindowDimensions,
  Animated,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import Loader from "../../src/components/Loader";
import AppText from "../../src/components/AppText";
import { useThemeContext } from "@/src/context/ThemeContext";
import { supabase } from "@/src/services/supabase";
import { ProductionRobotService as robotService } from "@/src/services/ProductionRobotService";
import { useAppNavigation } from "@/hooks/useAppNavigation";

// Toast Message Interface
interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export default function ControlScreen() {
  const { push } = useAppNavigation();
  const { colors, darkMode } = useThemeContext();
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  // State
  const [busy, setBusy] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [cleaningMode, setCleaningMode] = useState<"auto" | "spot" | "edge">("auto");
  const [fanSpeed, setFanSpeed] = useState<"quiet" | "standard" | "turbo">("standard");
  const [manualMode, setManualMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [robotId, setRobotId] = useState<string | null>(null);
  const [isRobotConnected, setIsRobotConnected] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  // Animation for robot status
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const toastAnimations = useRef<{ [key: string]: Animated.Value }>({});

  // Design tokens
  const cardBg = darkMode ? "rgba(255,255,255,0.05)" : "#ffffff";
  const cardBorder = darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const textPrimary = darkMode ? "#ffffff" : "#1a1a2e";
  const textSecondary = darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.60)";
  const successColor = "#10B981";
  const errorColor = "#EF4444";
  const warningColor = "#F59E0B";
  const infoColor = "#3B82F6";

  // Show toast message - positioned at TOP (below status bar)
  const showToast = useCallback((text: string, type: ToastMessage['type']) => {
    const id = Date.now().toString();
    const fadeAnim = new Animated.Value(0);
    const slideAnim = new Animated.Value(-100);
    
    toastAnimations.current[id] = fadeAnim;
    
    setToasts(prev => [...prev, { id, text, type }]);
    
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
        delete toastAnimations.current[id];
      });
    }, 5000);
  }, []);

  // Animate pulse when robot is active
  useEffect(() => {
    if (isRunning || manualMode) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRunning, manualMode]);

  // Fetch robot connection status and data
  const fetchRobotData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        showToast("Please login to control the robot", "warning");
        return;
      }

      const { data: robot, error: robotError } = await supabase
        .from("robots")
        .select("id, status, mode, battery, is_online")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (robotError) throw robotError;

      if (robot) {
        setRobotId(robot.id);
        setIsRobotConnected(robot.is_online || false);
        setBatteryLevel(robot.battery || 0);
        setIsRunning(robot.mode === "cleaning" || robot.status === "cleaning");
      } else {
        showToast("No robot found. Please register a robot first.", "warning");
      }
    } catch (err: any) {
      console.error("[ControlScreen] fetchRobotData error:", err);
      showToast(err.message || "Failed to fetch robot data", "error");
    }
  }, [showToast]);

  // Fetch robot status from robot_status table
  const fetchRobotStatus = useCallback(async () => {
    if (!robotId) return;

    try {
      const { data, error } = await supabase
        .from("robot_status")
        .select("status, mode, battery, movement")
        .eq("robot_id", robotId)
        .order("last_updated", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsRunning(data.status === "cleaning" || data.mode === "cleaning");
        if (data.battery) setBatteryLevel(data.battery);
      }
    } catch (err) {
      console.error("[ControlScreen] fetchRobotStatus error:", err);
    }
  }, [robotId]);

  // Update robot in database
  const updateRobotInDB = useCallback(async (isCleaning: boolean, updates?: any) => {
    if (!robotId) return false;

    try {
      const updateData = {
        mode: isCleaning ? "cleaning" : "idle",
        status: isCleaning ? "cleaning" : "idle",
        updated_at: new Date().toISOString(),
        ...updates,
      };

      const { error } = await supabase
        .from("robots")
        .update(updateData)
        .eq("id", robotId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("[ControlScreen] updateRobotInDB error:", err);
      return false;
    }
  }, [robotId]);

  // Insert robot status record
  const insertRobotStatus = useCallback(async (status: string, movement: string = "STOP") => {
    if (!robotId) return;

    try {
      await supabase.from("robot_status").insert({
        robot_id: robotId,
        status: status,
        movement: movement,
        mode: manualMode ? "MANUAL" : cleaningMode.toUpperCase(),
        battery: batteryLevel || 85,
        left_sensor: 45,
        right_sensor: 42,
        last_updated: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[ControlScreen] insertRobotStatus error:", err);
    }
  }, [robotId, manualMode, cleaningMode, batteryLevel]);

  // Start cleaning action
  const handleStartCleaning = useCallback(async () => {
    if (busy || isRunning || manualMode) {
      if (manualMode) showToast("Please disable manual mode first", "warning");
      return;
    }

    setBusy(true);
    setLoadingMessage(`Starting ${cleaningMode} cleaning...`);
    showToast(`Starting ${cleaningMode} cleaning...`, "info");

    try {
      const commandResult = await robotService.sendCommand("START_CLEANING");
      
      if (commandResult.success) {
        await updateRobotInDB(true);
        await insertRobotStatus("cleaning", "FORWARD");
        
        setIsRunning(true);
        showToast(`✓ ${cleaningMode.charAt(0).toUpperCase() + cleaningMode.slice(1)} cleaning started!`, "success");
        
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        throw new Error(commandResult.message || "Failed to start cleaning");
      }
    } catch (err: any) {
      console.error("[ControlScreen] start cleaning error:", err);
      showToast(err.message || "Failed to start cleaning", "error");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setBusy(false);
      setLoadingMessage("");
      await fetchRobotStatus();
    }
  }, [busy, isRunning, manualMode, cleaningMode, updateRobotInDB, insertRobotStatus, fetchRobotStatus, showToast]);

  // Stop cleaning action
  const handleStopCleaning = useCallback(async () => {
    if (busy || !isRunning) return;

    setBusy(true);
    setLoadingMessage("Stopping cleaning...");
    showToast("Stopping cleaning...", "info");

    try {
      const commandResult = await robotService.sendCommand("STOP_CLEANING");
      
      if (commandResult.success) {
        await updateRobotInDB(false);
        await insertRobotStatus("idle", "STOP");
        
        setIsRunning(false);
        showToast("✓ Cleaning stopped", "success");
        
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        throw new Error(commandResult.message || "Failed to stop cleaning");
      }
    } catch (err: any) {
      console.error("[ControlScreen] stop cleaning error:", err);
      showToast(err.message || "Failed to stop cleaning", "error");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setBusy(false);
      setLoadingMessage("");
      await fetchRobotStatus();
    }
  }, [busy, isRunning, updateRobotInDB, insertRobotStatus, fetchRobotStatus, showToast]);

  // Manual move command
  const handleManualMove = useCallback(async (direction: "forward" | "backward" | "left" | "right" | "stop") => {
    if (busy || !manualMode) {
      if (!manualMode) showToast("Enable manual mode first", "warning");
      return;
    }

    const moveMap = {
      forward: "FORWARD",
      backward: "BACKWARD",
      left: "LEFT",
      right: "RIGHT",
      stop: "STOP",
    };

    const command = moveMap[direction];
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const result = await robotService.sendCommand(command);
      
      if (result.success) {
        await insertRobotStatus("manual", command);
        showToast(`Moving ${direction}`, "success");
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      console.error("[ControlScreen] move error:", err);
      showToast(`Failed to move ${direction}`, "error");
    }
  }, [busy, manualMode, insertRobotStatus, showToast]);

  // Rotate command
  const handleRotate = useCallback(async (direction: "left" | "right") => {
    if (busy || !manualMode) {
      if (!manualMode) showToast("Enable manual mode first", "warning");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const result = await robotService.sendCommand(direction === "left" ? "LEFT" : "RIGHT");
      
      if (result.success) {
        await insertRobotStatus("manual", direction === "left" ? "LEFT" : "RIGHT");
        showToast(`Rotating ${direction}`, "success");
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      console.error("[ControlScreen] rotate error:", err);
      showToast(`Failed to rotate ${direction}`, "error");
    }
  }, [busy, manualMode, insertRobotStatus, showToast]);

  // Change cleaning mode
  const handleModeChange = useCallback((mode: "auto" | "spot" | "edge") => {
    setCleaningMode(mode);
    showToast(`Cleaning mode changed to ${mode === "auto" ? "Auto Adaptive" : mode === "spot" ? "Spot" : "Edge"}`, "info");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [showToast]);

  // Change fan speed
  const handleFanSpeedChange = useCallback((speed: "quiet" | "standard" | "turbo") => {
    setFanSpeed(speed);
    showToast(`Suction power changed to ${speed.charAt(0).toUpperCase() + speed.slice(1)}`, "info");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [showToast]);

  // Toggle manual mode
  const handleManualModeToggle = useCallback(async () => {
    if (busy) return;

    if (!manualMode && isRunning) {
      showToast("Please stop cleaning before enabling manual mode", "warning");
      return;
    }

    const newManualMode = !manualMode;
    setManualMode(newManualMode);
    
    if (newManualMode) {
      showToast("Manual mode enabled - Use joystick to control robot", "success");
      await insertRobotStatus("manual_mode", "STOP");
    } else {
      showToast("Manual mode disabled", "info");
    }
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [busy, manualMode, isRunning, insertRobotStatus, showToast]);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRobotData();
    await fetchRobotStatus();
    setRefreshing(false);
  }, [fetchRobotData, fetchRobotStatus]);

  // Load data on mount and set up interval polling
  useEffect(() => {
    fetchRobotData();
    
    const interval = setInterval(() => {
      fetchRobotStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchRobotData, fetchRobotStatus]);

  // Render toast messages at TOP (below status bar)
  const renderToasts = () => {
    const statusBarHeight = StatusBar.currentHeight || (Platform.OS === 'ios' ? 47 : 0);
    
    return toasts.map((toast, index) => {
      const toastColor = toast.type === 'success' ? successColor : toast.type === 'error' ? errorColor : toast.type === 'warning' ? warningColor : infoColor;
      const fadeAnim = toastAnimations.current[toast.id] || new Animated.Value(1);
      const slideAnim = toastAnimations.current[`slide_${toast.id}`] || new Animated.Value(0);
      
      return (
        <Animated.View
          key={toast.id}
          style={[
            styles.toast,
            {
              backgroundColor: toastColor,
              top: statusBarHeight + 10 + (index * 70),
              left: 16,
              right: 16,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Ionicons
            name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'alert-circle' : toast.type === 'warning' ? 'warning' : 'information-circle'}
            size={22}
            color="#fff"
          />
          <AppText style={styles.toastText}>{toast.text}</AppText>
          <TouchableOpacity
            onPress={() => {
              // Animate out and remove
              const anim = toastAnimations.current[toast.id];
              if (anim) {
                Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
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

  if (busy && !isRunning) {
    return <Loader message={loadingMessage} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      
      {/* Toast Messages - at TOP */}
      {renderToasts()}
      
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isLargeScreen && styles.scrollContentLarge,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
          {/* Header */}
          <View style={styles.headerSection}>
            <AppText style={[styles.headerTitle, { color: textPrimary }]}>
              Control Robot
            </AppText>
            <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
              {isRobotConnected ? "Connected to robot" : "Connect to robot to start"}
            </AppText>
          </View>

          {/* Status Banner */}
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: isRunning ? `${successColor}15` : isRobotConnected ? cardBg : `${errorColor}10`,
                borderColor: isRunning ? successColor : isRobotConnected ? cardBorder : errorColor,
              },
            ]}
          >
            <View style={styles.statusBannerContent}>
              <Animated.View
                style={[
                  styles.statusIconContainer,
                  {
                    backgroundColor: isRunning ? `${successColor}30` : isRobotConnected ? `${infoColor}20` : `${errorColor}20`,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Ionicons
                  name={isRunning ? "flash" : isRobotConnected ? "hardware-chip" : "wifi-outline"}
                  size={28}
                  color={isRunning ? successColor : isRobotConnected ? infoColor : errorColor}
                />
              </Animated.View>

              <View style={styles.statusInfo}>
                <AppText style={[styles.statusTitle, { color: textPrimary }]}>
                  Robot Status
                </AppText>
                <AppText
                  style={[
                    styles.statusValue,
                    { color: isRunning ? successColor : isRobotConnected ? textSecondary : errorColor },
                  ]}
                >
                  {manualMode
                    ? "Manual Control Active"
                    : isRunning
                      ? "Cleaning in Progress"
                      : isRobotConnected
                        ? "Standby"
                        : "Disconnected"}
                </AppText>
                {batteryLevel !== null && (
                  <View style={styles.batteryRow}>
                    <Ionicons name="battery-half" size={14} color={batteryLevel > 20 ? successColor : warningColor} />
                    <AppText style={[styles.batteryText, { color: batteryLevel > 20 ? successColor : warningColor }]}>
                      Battery: {batteryLevel}%
                    </AppText>
                  </View>
                )}
              </View>
            </View>

            {(isRunning || manualMode) && (
              <View style={styles.statusBadge}>
                <View style={[styles.pulsingDot, { backgroundColor: successColor }]} />
              </View>
            )}
          </View>

          {/* Primary Controls */}
          <View style={[styles.controlCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Ionicons name="game-controller" size={22} color={colors.primary} />
                <AppText style={[styles.cardTitle, { color: textPrimary }]}>Primary Controls</AppText>
              </View>
            </View>

            <View style={styles.primaryControls}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  styles.startButton,
                  (isRunning || manualMode || !isRobotConnected) && styles.buttonDisabled,
                ]}
                onPress={handleStartCleaning}
                disabled={isRunning || manualMode || !isRobotConnected || busy}
                activeOpacity={0.7}
              >
                <View style={[styles.primaryButtonIcon, { backgroundColor: successColor }]}>
                  <Ionicons name="play" size={32} color="#fff" />
                </View>
                <View>
                  <AppText style={[styles.primaryButtonTitle, { color: textPrimary }]}>
                    Start Cleaning
                  </AppText>
                  <AppText style={[styles.primaryButtonSubtitle, { color: textSecondary }]}>
                    {cleaningMode === "auto" ? "Adaptive" : cleaningMode === "spot" ? "Spot" : "Edge"} mode
                  </AppText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  styles.stopButton,
                  (!isRunning || !isRobotConnected) && styles.buttonDisabled,
                ]}
                onPress={handleStopCleaning}
                disabled={!isRunning || !isRobotConnected || busy}
                activeOpacity={0.7}
              >
                <View style={[styles.primaryButtonIcon, { backgroundColor: errorColor }]}>
                  <Ionicons name="stop" size={32} color="#fff" />
                </View>
                <View>
                  <AppText style={[styles.primaryButtonTitle, { color: textPrimary }]}>
                    Stop Cleaning
                  </AppText>
                  <AppText style={[styles.primaryButtonSubtitle, { color: textSecondary }]}>
                    Return to standby
                  </AppText>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cleaning Modes */}
          <View style={[styles.controlCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Ionicons name="options" size={22} color={colors.primary} />
                <AppText style={[styles.cardTitle, { color: textPrimary }]}>Cleaning Mode</AppText>
              </View>
            </View>

            <View style={styles.modeOptions}>
              {(["auto", "spot", "edge"] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeButton,
                    {
                      backgroundColor: cleaningMode === mode ? `${colors.primary}15` : cardBg,
                      borderColor: cleaningMode === mode ? colors.primary : cardBorder,
                    },
                  ]}
                  onPress={() => handleModeChange(mode)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={mode === "auto" ? "infinite" : mode === "spot" ? "locate" : "grid"}
                    size={28}
                    color={cleaningMode === mode ? colors.primary : textSecondary}
                  />
                  <AppText style={[styles.modeButtonText, { color: cleaningMode === mode ? colors.primary : textPrimary }]}>
                    {mode === "auto" ? "Auto" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </AppText>
                  {cleaningMode === mode && (
                    <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <AppText style={[styles.modeDescription, { color: textSecondary }]}>
              {cleaningMode === "auto"
                ? "🤖 Adaptive AI cleaning - robot intelligently navigates and cleans entire space"
                : cleaningMode === "spot"
                  ? "🎯 Concentrated cleaning on high-traffic areas detected by sensors"
                  : "📐 Edge-focused cleaning along walls and corners"}
            </AppText>
          </View>

          {/* Fan Speed */}
          <View style={[styles.controlCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Ionicons name="speedometer" size={22} color={colors.primary} />
                <AppText style={[styles.cardTitle, { color: textPrimary }]}>Suction Power</AppText>
              </View>
            </View>

            <View style={styles.speedOptions}>
              {(["quiet", "standard", "turbo"] as const).map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[
                    styles.speedButton,
                    {
                      backgroundColor: fanSpeed === speed ? `${colors.primary}15` : cardBg,
                      borderColor: fanSpeed === speed ? colors.primary : cardBorder,
                    },
                  ]}
                  onPress={() => handleFanSpeedChange(speed)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={speed === "quiet" ? "volume-low" : speed === "standard" ? "volume-medium" : "volume-high"}
                    size={32}
                    color={fanSpeed === speed ? colors.primary : textSecondary}
                  />
                  <AppText style={[styles.speedButtonText, { color: fanSpeed === speed ? colors.primary : textPrimary }]}>
                    {speed.charAt(0).toUpperCase() + speed.slice(1)}
                  </AppText>
                  <AppText style={[styles.speedSubtext, { color: textSecondary }]}>
                    {speed === "quiet" ? "Silent mode" : speed === "standard" ? "Balanced" : "Maximum power"}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Manual Controls */}
          <View style={[styles.controlCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Ionicons name="navigate" size={22} color={colors.primary} />
                <AppText style={[styles.cardTitle, { color: textPrimary }]}>Manual Controls</AppText>
              </View>

              <TouchableOpacity
                style={[
                  styles.manualToggle,
                  {
                    backgroundColor: manualMode ? colors.primary : cardBg,
                    borderColor: manualMode ? colors.primary : cardBorder,
                  },
                ]}
                onPress={handleManualModeToggle}
                disabled={!isRobotConnected}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={manualMode ? "toggle" : "toggle-outline"}
                  size={24}
                  color={manualMode ? "#fff" : textSecondary}
                />
              </TouchableOpacity>
            </View>

            {manualMode && isRobotConnected ? (
              <View style={styles.joystickContainer}>
                <View style={styles.joystickGrid}>
                  {/* Top row */}
                  <View style={styles.joystickRow}>
                    <View style={styles.joystickEmpty} />
                    <TouchableOpacity
                      style={[styles.directionButton, { backgroundColor: `${colors.primary}20` }]}
                      onPress={() => handleManualMove("forward")}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="arrow-up" size={36} color={colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.joystickEmpty} />
                  </View>

                  {/* Middle row */}
                  <View style={styles.joystickRow}>
                    <TouchableOpacity
                      style={[styles.directionButton, { backgroundColor: `${colors.primary}20` }]}
                      onPress={() => handleManualMove("left")}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="arrow-back" size={36} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.centerButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
                      onPress={() => handleManualMove("stop")}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="stop-circle" size={40} color={errorColor} />
                      <AppText style={[styles.stopText, { color: errorColor }]}>STOP</AppText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.directionButton, { backgroundColor: `${colors.primary}20` }]}
                      onPress={() => handleManualMove("right")}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="arrow-forward" size={36} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Bottom row */}
                  <View style={styles.joystickRow}>
                    <View style={styles.joystickEmpty} />
                    <TouchableOpacity
                      style={[styles.directionButton, { backgroundColor: `${colors.primary}20` }]}
                      onPress={() => handleManualMove("backward")}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="arrow-down" size={36} color={colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.joystickEmpty} />
                  </View>
                </View>

                <View style={styles.rotationControls}>
                  <TouchableOpacity
                    style={[styles.rotationButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
                    onPress={() => handleRotate("left")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-undo" size={28} color={colors.primary} />
                    <AppText style={[styles.rotationText, { color: textPrimary }]}>Rotate Left</AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.rotationButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
                    onPress={() => handleRotate("right")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-redo" size={28} color={colors.primary} />
                    <AppText style={[styles.rotationText, { color: textPrimary }]}>Rotate Right</AppText>
                  </TouchableOpacity>
                </View>

                <View style={[styles.manualInfo, { backgroundColor: `${infoColor}10` }]}>
                  <Ionicons name="information-circle" size={18} color={infoColor} />
                  <AppText style={[styles.manualInfoText, { color: textSecondary }]}>
                    Use joystick for precise movement. Robot sensors detect and avoid obstacles.
                  </AppText>
                </View>
              </View>
            ) : (
              <View style={styles.disabledContainer}>
                <View style={[styles.joystickPlaceholder, { borderColor: cardBorder }]}>
                  <Ionicons name="lock-closed" size={48} color={textSecondary} style={{ opacity: 0.3 }} />
                </View>
                <AppText style={[styles.disabledText, { color: textSecondary }]}>
                  {!isRobotConnected ? "Connect to robot first" : "Enable manual mode"}
                </AppText>
                <AppText style={[styles.disabledSubtext, { color: textSecondary }]}>
                  {!isRobotConnected 
                    ? "Go to Connection screen to connect your robot" 
                    : "Toggle the switch above to access manual controls"}
                </AppText>
              </View>
            )}
          </View>
        </View>

        <AppText style={[styles.footer, { color: textSecondary }]}>
          Version 1.0.0 • Smart Cleaner Pro © 2026
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 25, paddingBottom: 100 },
  scrollContentLarge: { alignItems: "center" },
  wrapper: { width: "100%" },
  largeWrapper: { maxWidth: 480 },

  // Header
  headerSection: { marginBottom: 28 },
  headerTitle: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5, marginBottom: 6 },
  headerSubtitle: { fontSize: 15, fontWeight: "400", letterSpacing: 0.1 },

  // Status Banner
  statusBanner: { borderRadius: 24, padding: 20, borderWidth: 1, marginBottom: 20 },
  statusBannerContent: { flexDirection: "row", alignItems: "center", gap: 16 },
  statusIconContainer: { width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 14, fontWeight: "500", marginBottom: 2 },
  statusValue: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  batteryRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  batteryText: { fontSize: 12, fontWeight: "600" },
  statusBadge: { position: "absolute", top: 16, right: 16 },
  pulsingDot: { width: 10, height: 10, borderRadius: 5 },

  // Cards
  controlCard: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardTitleContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: "700" },

  // Primary Controls
  primaryControls: { gap: 12 },
  primaryButton: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, gap: 16 },
  startButton: { backgroundColor: "#10B98112" },
  stopButton: { backgroundColor: "#EF444412" },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  primaryButtonTitle: { fontSize: 16, fontWeight: "700" },
  primaryButtonSubtitle: { fontSize: 12, opacity: 0.7, marginTop: 2 },

  // Mode Options
  modeOptions: { flexDirection: "row", gap: 12 },
  modeButton: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 8, position: "relative" },
  modeButtonText: { fontSize: 14, fontWeight: "600" },
  selectedBadge: { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  modeDescription: { marginTop: 14, fontSize: 12, lineHeight: 18, textAlign: "center" },

  // Speed Options
  speedOptions: { flexDirection: "row", gap: 12 },
  speedButton: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 8 },
  speedButtonText: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  speedSubtext: { fontSize: 10, opacity: 0.7 },

  // Manual Controls
  manualToggle: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  joystickContainer: { gap: 20 },
  joystickGrid: { alignItems: "center", gap: 10 },
  joystickRow: { flexDirection: "row", gap: 12, justifyContent: "center" },
  joystickEmpty: { width: 68, height: 68 },
  directionButton: { width: 68, height: 68, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  centerButton: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  stopText: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  rotationControls: { flexDirection: "row", gap: 12 },
  rotationButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  rotationText: { fontSize: 14, fontWeight: "600" },
  manualInfo: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12 },
  manualInfoText: { flex: 1, fontSize: 12, lineHeight: 16 },

  // Disabled State
  disabledContainer: { alignItems: "center", paddingVertical: 24, gap: 10 },
  joystickPlaceholder: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  disabledText: { fontSize: 15, fontWeight: "600", marginTop: 8 },
  disabledSubtext: { fontSize: 12, textAlign: "center", opacity: 0.7, paddingHorizontal: 20 },

  // Footer
  footer: { textAlign: "center", marginTop: 28, fontSize: 12, opacity: 0.55, letterSpacing: 0.3 },

  // Toast - Positioned at TOP (below status bar)
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