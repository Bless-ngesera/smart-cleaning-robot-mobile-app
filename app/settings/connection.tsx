// app/settings/connection.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
  StatusBar,
  Animated,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/src/context/ThemeContext';
import AppText from '@/src/components/AppText';
import { ProductionRobotService, Robot, RobotStatus } from '@/src/services/ProductionRobotService';

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

export default function ConnectionScreen() {
  const { colors, darkMode } = useThemeContext();
  const { width, height } = useWindowDimensions();
  const isTablet = width > 768;

  // State
  const [robots, setRobots] = useState<Robot[]>([]);
  const [currentRobot, setCurrentRobot] = useState<Robot | null>(null);
  const [robotStatus, setRobotStatus] = useState<RobotStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimSerial, setClaimSerial] = useState('');
  const [claiming, setClaiming] = useState(false);

  // Theme colors
  const cardBg = darkMode ? '#1e1e2e' : '#ffffff';
  const cardBorder = darkMode ? '#2a2a3e' : '#e0e0e0';
  const textPrimary = darkMode ? '#ffffff' : '#1a1a2e';
  const textSec = darkMode ? '#a0a0b0' : '#666666';
  const inputBg = darkMode ? '#2a2a3e' : '#f5f5f5';
  const successColor = '#4caf50';
  const errorColor = '#ff4757';
  const infoColor = '#2196f3';

  // Toast helper
  const showToast = useCallback((text: string, type: ToastMessage['type']) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  }, []);

  // Load user's robots
  const loadRobots = useCallback(async () => {
    try {
      setLoading(true);
      const userRobots = await ProductionRobotService.getUserRobots();
      setRobots(userRobots);
      
      // Check if already connected
      if (ProductionRobotService.isConnected()) {
        const robot = ProductionRobotService.getCurrentRobot();
        if (robot) {
          setCurrentRobot(robot);
          const status = await ProductionRobotService.fetchLatestStatus();
          if (status) setRobotStatus(status);
        }
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to load robots', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect to robot
  const connectToRobot = async (robot: Robot) => {
    setIsConnecting(true);
    showToast(`Connecting to ${robot.name}...`, 'info');

    try {
      const result = await ProductionRobotService.connectToRobot(robot.serial_number);
      
      if (result.success && result.robot) {
        setCurrentRobot(result.robot);
        
        // Subscribe to status updates
        const unsubscribe = ProductionRobotService.onStatusChange((status) => {
          setRobotStatus(status);
        });
        
        const status = await ProductionRobotService.fetchLatestStatus();
        if (status) setRobotStatus(status);
        
        showToast(`✓ Connected to ${robot.name}`, 'success');
        
        // Cleanup on unmount
        return () => unsubscribe();
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (error: any) {
      showToast(error.message || 'Connection failed', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect
  const disconnect = async () => {
    await ProductionRobotService.disconnect();
    setCurrentRobot(null);
    setRobotStatus(null);
    showToast('Disconnected from robot', 'info');
  };

  // Send command
  const sendCommand = async (command: string) => {
    if (!ProductionRobotService.isConnected()) {
      showToast('No robot connected', 'error');
      return;
    }

    const result = await ProductionRobotService.sendCommand(command);
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
  };

  // Claim new robot
  const claimRobot = async () => {
    if (!claimSerial.trim()) {
      showToast('Please enter serial number', 'error');
      return;
    }

    setClaiming(true);
    try {
      const result = await ProductionRobotService.claimRobot(claimSerial.trim().toUpperCase());
      
      if (result.success && result.robot) {
        setRobots(prev => [result.robot!, ...prev]);
        setShowClaimModal(false);
        setClaimSerial('');
        showToast(`✓ Robot "${result.robot.name}" added to your account`, 'success');
      } else {
        throw new Error(result.error || 'Failed to claim robot');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to claim robot', 'error');
    } finally {
      setClaiming(false);
    }
  };

  // Delete robot
  const deleteRobot = (robot: Robot) => {
    Alert.alert(
      'Delete Robot',
      `Are you sure you want to delete ${robot.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (currentRobot?.id === robot.id) {
              await disconnect();
            }
            
            const success = await ProductionRobotService.deleteRobot(robot.id);
            if (success) {
              setRobots(prev => prev.filter(r => r.id !== robot.id));
              showToast(`✓ ${robot.name} deleted`, 'success');
            } else {
              showToast('Failed to delete robot', 'error');
            }
          },
        },
      ]
    );
  };

  // Refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadRobots();
    setRefreshing(false);
  };

  // Initial load
  useEffect(() => {
    loadRobots();
    return () => {
      ProductionRobotService.disconnect();
    };
  }, []);

  // Render toast messages
  const renderToasts = () => {
    return toasts.map((toast, index) => {
      const toastColor = toast.type === 'success' ? successColor : toast.type === 'error' ? errorColor : infoColor;
      
      return (
        <Animated.View
          key={toast.id}
          style={[
            styles.toast,
            {
              backgroundColor: toastColor,
              bottom: 80 + (index * 70),
              left: 16,
              right: 16,
            },
          ]}
        >
          <Ionicons
            name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'alert-circle' : 'information-circle'}
            size={20}
            color="#fff"
          />
          <AppText style={styles.toastText}>{toast.text}</AppText>
          <TouchableOpacity
            onPress={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </Animated.View>
      );
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      
      {renderToasts()}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="hardware-chip-outline" size={48} color={colors.primary} />
            <AppText style={[styles.title, { color: textPrimary }]}>Smart Cleaner Pro</AppText>
            <AppText style={[styles.subtitle, { color: textSec }]}>
              {currentRobot ? `Connected to ${currentRobot.name}` : 'Connect to your robot'}
            </AppText>
          </View>

          {/* Claim Robot Button */}
          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowClaimModal(true)}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <AppText style={styles.claimBtnText}>Add New Robot</AppText>
          </TouchableOpacity>

          {/* Robots List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText style={[styles.loadingText, { color: textSec }]}>Loading robots...</AppText>
            </View>
          ) : robots.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: inputBg }]}>
              <Ionicons name="hardware-chip-outline" size={48} color={textSec} />
              <AppText style={[styles.emptyText, { color: textPrimary }]}>No Robots Found</AppText>
              <AppText style={[styles.emptySubtext, { color: textSec }]}>
                Tap "Add New Robot" to register your robot using its serial number
              </AppText>
            </View>
          ) : (
            <View style={styles.robotsList}>
              <AppText style={[styles.sectionTitle, { color: textPrimary }]}>Your Robots</AppText>
              
              {robots.map((robot) => (
                <View key={robot.id} style={[styles.robotCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  {/* Robot Info */}
                  <View style={styles.robotInfo}>
                    <View style={[styles.robotIcon, { backgroundColor: `${colors.primary}15` }]}>
                      <Ionicons name="hardware-chip" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.robotDetails}>
                      <View style={styles.robotHeader}>
                        <AppText style={[styles.robotName, { color: textPrimary }]}>{robot.name}</AppText>
                        <View style={[styles.statusBadge, { backgroundColor: robot.is_online ? `${successColor}20` : `${errorColor}20` }]}>
                          <View style={[styles.statusDot, { backgroundColor: robot.is_online ? successColor : errorColor }]} />
                          <AppText style={[styles.statusText, { color: robot.is_online ? successColor : errorColor }]}>
                            {robot.is_online ? 'Online' : 'Offline'}
                          </AppText>
                        </View>
                      </View>
                      <AppText style={[styles.robotSerial, { color: textSec }]}>SN: {robot.serial_number}</AppText>
                      <View style={styles.robotStats}>
                        <View style={styles.statItem}>
                          <Ionicons name="battery-half" size={14} color={textSec} />
                          <AppText style={[styles.statText, { color: textSec }]}>{robot.battery}%</AppText>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                          <Ionicons name="options" size={14} color={textSec} />
                          <AppText style={[styles.statText, { color: textSec }]}>{robot.mode}</AppText>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.robotActions}>
                    {currentRobot?.id === robot.id ? (
                      <>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: `${infoColor}15`, borderColor: infoColor }]}
                          onPress={async () => {
                            const status = await ProductionRobotService.fetchLatestStatus();
                            if (status) {
                              showToast(`Battery: ${status.battery}% | Mode: ${status.mode}`, 'info');
                            } else {
                              showToast('Robot responding', 'success');
                            }
                          }}
                        >
                          <Ionicons name="pulse" size={16} color={infoColor} />
                          <AppText style={[styles.actionBtnText, { color: infoColor }]}>Test</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: `${errorColor}15`, borderColor: errorColor }]}
                          onPress={disconnect}
                        >
                          <Ionicons name="power" size={16} color={errorColor} />
                          <AppText style={[styles.actionBtnText, { color: errorColor }]}>Disconnect</AppText>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}
                          onPress={() => connectToRobot(robot)}
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <>
                              <Ionicons name="link" size={16} color={colors.primary} />
                              <AppText style={[styles.actionBtnText, { color: colors.primary }]}>Connect</AppText>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: `${errorColor}15`, borderColor: errorColor }]}
                          onPress={() => deleteRobot(robot)}
                        >
                          <Ionicons name="trash" size={16} color={errorColor} />
                          <AppText style={[styles.actionBtnText, { color: errorColor }]}>Delete</AppText>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Connected Robot Status */}
          {currentRobot && robotStatus && (
            <View style={[styles.statusCard, { backgroundColor: cardBg, borderColor: `${successColor}40` }]}>
              <View style={styles.statusHeader}>
                <View style={styles.statusHeaderLeft}>
                  <View style={[styles.statusDot, { backgroundColor: successColor }]} />
                  <AppText style={[styles.cardTitle, { color: textPrimary }]}>Live Status</AppText>
                </View>
                <View style={[styles.liveBadge, { backgroundColor: `${successColor}20` }]}>
                  <View style={[styles.liveDot, { backgroundColor: successColor }]} />
                  <AppText style={[styles.liveText, { color: successColor }]}>LIVE</AppText>
                </View>
              </View>

              <View style={styles.statusGrid}>
                <View style={styles.statusItem}>
                  <Ionicons name="battery-full" size={24} color={robotStatus.battery > 20 ? successColor : errorColor} />
                  <AppText style={[styles.statusLabel, { color: textSec }]}>Battery</AppText>
                  <AppText style={[styles.statusValue, { color: textPrimary }]}>{robotStatus.battery}%</AppText>
                </View>
                
                <View style={styles.statusItem}>
                  <Ionicons name="analytics" size={24} color={infoColor} />
                  <AppText style={[styles.statusLabel, { color: textSec }]}>Status</AppText>
                  <AppText style={[styles.statusValue, { color: textPrimary }]}>{robotStatus.status}</AppText>
                </View>
                
                <View style={styles.statusItem}>
                  <Ionicons name="move" size={24} color="#ff9800" />
                  <AppText style={[styles.statusLabel, { color: textSec }]}>Movement</AppText>
                  <AppText style={[styles.statusValue, { color: textPrimary }]}>{robotStatus.movement}</AppText>
                </View>
                
                <View style={styles.statusItem}>
                  <Ionicons name="options" size={24} color={colors.primary} />
                  <AppText style={[styles.statusLabel, { color: textSec }]}>Mode</AppText>
                  <AppText style={[styles.statusValue, { color: textPrimary }]}>{robotStatus.mode}</AppText>
                </View>
              </View>

              {/* Sensors */}
              {(robotStatus.left_sensor > 0 || robotStatus.right_sensor > 0) && (
                <View style={styles.sensorContainer}>
                  <AppText style={[styles.sensorTitle, { color: textSec }]}>Sensors (cm)</AppText>
                  <View style={styles.sensorRow}>
                    <View style={styles.sensorItem}>
                      <AppText style={[styles.sensorLabel, { color: textSec }]}>Left</AppText>
                      <AppText style={[styles.sensorValue, { color: textPrimary }]}>{robotStatus.left_sensor}</AppText>
                    </View>
                    <View style={styles.sensorDivider} />
                    <View style={styles.sensorItem}>
                      <AppText style={[styles.sensorLabel, { color: textSec }]}>Right</AppText>
                      <AppText style={[styles.sensorValue, { color: textPrimary }]}>{robotStatus.right_sensor}</AppText>
                    </View>
                  </View>
                </View>
              )}

              {/* Quick Commands */}
              <View style={styles.commandsGrid}>
                <TouchableOpacity
                  style={[styles.commandBtn, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}
                  onPress={() => sendCommand('FORWARD')}
                >
                  <Ionicons name="arrow-up" size={24} color={colors.primary} />
                  <AppText style={[styles.commandText, { color: colors.primary }]}>FWD</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.commandBtn, { backgroundColor: `${errorColor}15`, borderColor: errorColor }]}
                  onPress={() => sendCommand('STOP')}
                >
                  <Ionicons name="stop" size={24} color={errorColor} />
                  <AppText style={[styles.commandText, { color: errorColor }]}>STOP</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.commandBtn, { backgroundColor: `${successColor}15`, borderColor: successColor }]}
                  onPress={() => sendCommand('AUTO_MODE')}
                >
                  <Ionicons name="scan" size={24} color={successColor} />
                  <AppText style={[styles.commandText, { color: successColor }]}>AUTO</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.commandBtn, { backgroundColor: `${infoColor}15`, borderColor: infoColor }]}
                  onPress={() => sendCommand('RETURN_CHARGE')}
                >
                  <Ionicons name="home" size={24} color={infoColor} />
                  <AppText style={[styles.commandText, { color: infoColor }]}>CHARGE</AppText>
                </TouchableOpacity>
              </View>

              <AppText style={[styles.lastUpdated, { color: textSec }]}>
                Last update: {new Date(robotStatus.last_updated).toLocaleTimeString()}
              </AppText>
            </View>
          )}

          {/* Info Box */}
          <View style={[styles.infoBox, { backgroundColor: `${infoColor}10`, borderColor: `${infoColor}30` }]}>
            <Ionicons name="information-circle" size={20} color={infoColor} />
            <AppText style={[styles.infoText, { color: textSec }]}>
              To connect a robot, make sure it's registered and you have its serial number. 
              Contact your robot supplier for the serial number.
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Claim Robot Modal */}
      <Modal visible={showClaimModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <AppText style={[styles.modalTitle, { color: textPrimary }]}>Add New Robot</AppText>
              <TouchableOpacity onPress={() => setShowClaimModal(false)}>
                <Ionicons name="close" size={24} color={textSec} />
              </TouchableOpacity>
            </View>

            <AppText style={[styles.modalLabel, { color: textSec }]}>Robot Serial Number</AppText>
            <TextInput
              style={[styles.modalInput, { backgroundColor: inputBg, borderColor: cardBorder, color: textPrimary }]}
              placeholder="Enter serial number (e.g., ROBOT_001)"
              placeholderTextColor={textSec}
              value={claimSerial}
              onChangeText={setClaimSerial}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: cardBorder }]}
                onPress={() => {
                  setShowClaimModal(false);
                  setClaimSerial('');
                }}
              >
                <AppText style={[styles.modalCancelText, { color: textSec }]}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={claimRobot}
                disabled={claiming}
              >
                {claiming ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <AppText style={styles.modalConfirmText}>Add Robot</AppText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  scrollContentTablet: { maxWidth: 600, alignSelf: 'center', width: '100%' },

  // Header
  header: { alignItems: 'center', marginBottom: 24, marginTop: Platform.OS === 'ios' ? 20 : 10 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 12, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', opacity: 0.7 },

  // Claim Button
  claimBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, marginBottom: 20 },
  claimBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Loading & Empty
  loadingContainer: { alignItems: 'center', padding: 40, gap: 12 },
  loadingText: { fontSize: 14 },
  emptyContainer: { alignItems: 'center', padding: 40, borderRadius: 20, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 13, textAlign: 'center', opacity: 0.7, marginTop: 4 },

  // Robots List
  robotsList: { gap: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  robotCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  robotInfo: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  robotIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  robotDetails: { flex: 1 },
  robotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  robotName: { fontSize: 16, fontWeight: '700' },
  robotSerial: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  robotStats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12 },
  statDivider: { width: 1, height: 12, backgroundColor: 'rgba(0,0,0,0.1)' },

  // Status Badge
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '600' },

  // Actions
  robotActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },

  // Status Card
  statusCard: { borderRadius: 20, borderWidth: 2, padding: 20, marginBottom: 16 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  statusHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 11, fontWeight: '700' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginBottom: 20 },
  statusItem: { alignItems: 'center', gap: 6, minWidth: '22%' },
  statusLabel: { fontSize: 11, opacity: 0.7 },
  statusValue: { fontSize: 16, fontWeight: '700' },

  // Sensors
  sensorContainer: { marginBottom: 20 },
  sensorTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, opacity: 0.7 },
  sensorRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  sensorItem: { alignItems: 'center', gap: 4, flex: 1 },
  sensorDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  sensorLabel: { fontSize: 11, opacity: 0.7 },
  sensorValue: { fontSize: 18, fontWeight: '600' },

  // Commands
  commandsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  commandBtn: { flex: 1, minWidth: '22%', alignItems: 'center', gap: 6, padding: 12, borderRadius: 12, borderWidth: 1 },
  commandText: { fontSize: 11, fontWeight: '600' },
  lastUpdated: { fontSize: 10, textAlign: 'center', opacity: 0.5 },

  // Info Box
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Toast
  toast: { position: 'absolute', flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, gap: 12, zIndex: 9999, elevation: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  toastText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, opacity: 0.7 },
  modalInput: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});