// app/settings/connection.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/src/context/ThemeContext';
import AppText from '@/src/components/AppText';
import { supabase } from '@/src/services/supabase';

interface Robot {
  id: string;
  name: string;
  serial_number: string;
  connection_type: string;
  status: string;
  battery: number;
  mode: string;
  is_online: boolean;
  last_seen: string;
}

interface RobotStatus {
  id: string;
  robot_id: string;
  status: string;
  battery: number;
  left_sensor: number;
  right_sensor: number;
  movement: string;
  mode: string;
  last_updated: string;
}

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

export default function ConnectionScreen() {
  const { colors, darkMode } = useThemeContext();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  // State
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [robotStatus, setRobotStatus] = useState<RobotStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [realtimeSubscription, setRealtimeSubscription] = useState<any>(null);
  
  // Form states
  const [showAddRobot, setShowAddRobot] = useState(false);
  const [newRobotName, setNewRobotName] = useState('');
  const [newRobotSerial, setNewRobotSerial] = useState('');
  const [addingRobot, setAddingRobot] = useState(false);

  // Theme colors
  const cardBg = darkMode ? '#1e1e2e' : '#ffffff';
  const cardBorder = darkMode ? '#2a2a3e' : '#e0e0e0';
  const textPrimary = darkMode ? '#ffffff' : '#1a1a2e';
  const textSec = darkMode ? '#a0a0b0' : '#666666';
  const inputBg = darkMode ? '#2a2a3e' : '#f5f5f5';
  const successColor = '#4caf50';
  const errorColor = '#ff4757';
  const infoColor = '#2196f3';

  // Show toast at bottom
  const showToast = useCallback((text: string, type: ToastMessage['type']) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 6000);
  }, []);

  // Load user's robots from database
  const loadRobots = useCallback(async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('robots')
        .select('*')
        .eq('owner_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRobots(data || []);
      
      // Check if any robot is already connected
      const connectedRobot = data?.find(r => r.is_online === true);
      if (connectedRobot) {
        setSelectedRobot(connectedRobot);
        setIsConnected(true);
        await fetchRobotStatus(connectedRobot.id);
        await subscribeToRobotStatus(connectedRobot.id);
      }
    } catch (error: any) {
      console.error('Load robots error:', error);
      showToast(error.message || 'Failed to load robots', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch robot status from database
  const fetchRobotStatus = async (robotId: string) => {
    try {
      const { data, error } = await supabase
        .from('robot_status')
        .select('*')
        .eq('robot_id', robotId)
        .order('last_updated', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setRobotStatus(data[0]);
      }
    } catch (error: any) {
      console.error('Fetch status error:', error);
    }
  };

  // Subscribe to real-time robot status updates
  const subscribeToRobotStatus = async (robotId: string) => {
    // Clean up existing subscription
    if (realtimeSubscription) {
      realtimeSubscription.unsubscribe();
    }

    const subscription = supabase
      .channel(`robot-status-${robotId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'robot_status',
          filter: `robot_id=eq.${robotId}`,
        },
        (payload) => {
          console.log('Real-time status update:', payload.new);
          setRobotStatus(payload.new as RobotStatus);
        }
      )
      .subscribe();

    setRealtimeSubscription(subscription);
  };

  // Connect to robot
  const connectToRobot = async (robot: Robot) => {
    setIsConnecting(true);
    showToast(`Connecting to ${robot.name}...`, 'info');

    try {
      // Update robot online status in database
      const { error: updateError } = await supabase
        .from('robots')
        .update({
          is_online: true,
          last_seen: new Date().toISOString(),
          status: 'online',
        })
        .eq('id', robot.id);

      if (updateError) throw updateError;

      setSelectedRobot(robot);
      setIsConnected(true);
      
      // Fetch latest status
      await fetchRobotStatus(robot.id);
      
      // Subscribe to real-time updates
      await subscribeToRobotStatus(robot.id);
      
      showToast(`✓ Connected to ${robot.name}`, 'success');
    } catch (error: any) {
      console.error('Connect error:', error);
      showToast(error.message || 'Connection failed', 'error');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from robot
  const disconnect = async () => {
    if (!selectedRobot) return;

    try {
      const { error } = await supabase
        .from('robots')
        .update({
          is_online: false,
          status: 'offline',
        })
        .eq('id', selectedRobot.id);

      if (error) throw error;

      if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
      }

      setSelectedRobot(null);
      setRobotStatus(null);
      setIsConnected(false);
      showToast('Disconnected from robot', 'info');
    } catch (error: any) {
      console.error('Disconnect error:', error);
      showToast(error.message || 'Failed to disconnect', 'error');
    }
  };

  // Send command to robot
  const sendCommand = async (command: string) => {
    if (!selectedRobot) {
      showToast('No robot selected', 'error');
      return;
    }

    try {
      // Insert command into command_queue
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('command_queue')
        .insert({
          robot_id: selectedRobot.id,
          command: command,
          status: 'pending',
          user_id: userData.user?.id,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Also log to robot_logs
      await supabase.from('robot_logs').insert({
        robot_id: selectedRobot.id,
        event_type: 'command',
        message: command,
        created_at: new Date().toISOString(),
      });

      showToast(`✓ Command "${command}" sent`, 'success');
    } catch (error: any) {
      console.error('Send command error:', error);
      showToast(error.message || `Failed to send ${command}`, 'error');
    }
  };

  // Add new robot
  const addNewRobot = async () => {
    if (!newRobotName.trim()) {
      showToast('Please enter robot name', 'error');
      return;
    }
    if (!newRobotSerial.trim()) {
      showToast('Please enter serial number', 'error');
      return;
    }

    setAddingRobot(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not logged in');

      const { data, error } = await supabase
        .from('robots')
        .insert({
          owner_id: userData.user.id,
          name: newRobotName.trim(),
          serial_number: newRobotSerial.trim(),
          connection_type: 'cloud',
          status: 'offline',
          battery: 100,
          mode: 'MANUAL',
          is_online: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setRobots(prev => [data, ...prev]);
      setNewRobotName('');
      setNewRobotSerial('');
      setShowAddRobot(false);
      showToast('✓ Robot added successfully', 'success');
    } catch (error: any) {
      console.error('Add robot error:', error);
      showToast(error.message || 'Failed to add robot', 'error');
    } finally {
      setAddingRobot(false);
    }
  };

  // Delete robot
  const deleteRobot = async (robot: Robot) => {
    Alert.alert(
      'Delete Robot',
      `Are you sure you want to delete ${robot.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('robots')
                .delete()
                .eq('id', robot.id);

              if (error) throw error;

              setRobots(prev => prev.filter(r => r.id !== robot.id));
              if (selectedRobot?.id === robot.id) {
                await disconnect();
              }
              showToast(`✓ ${robot.name} deleted`, 'success');
            } catch (error: any) {
              showToast(error.message || 'Failed to delete robot', 'error');
            }
          },
        },
      ]
    );
  };

  // Test connection
  const testConnection = async () => {
    if (!selectedRobot) {
      showToast('No robot selected', 'error');
      return;
    }

    showToast('Testing connection...', 'info');
    
    if (robotStatus && robotStatus.last_updated) {
      const lastUpdate = new Date(robotStatus.last_updated);
      const now = new Date();
      const diffSeconds = (now.getTime() - lastUpdate.getTime()) / 1000;
      
      if (diffSeconds < 30) {
        showToast(`✓ Robot responding! Battery: ${robotStatus.battery}% | Mode: ${robotStatus.mode}`, 'success');
      } else {
        showToast('⚠ Robot not responding. Last update was ' + Math.floor(diffSeconds) + ' seconds ago', 'error');
      }
    } else {
      showToast('No status data available', 'error');
    }
  };

  // Load robots on mount
  useEffect(() => {
    loadRobots();
    return () => {
      if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
      }
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
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.scrollContentTablet,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="hardware-chip-outline" size={48} color={colors.primary} />
            <AppText style={[styles.title, { color: textPrimary }]}>Smart Cleaner Pro</AppText>
            <AppText style={[styles.subtitle, { color: textSec }]}>
              {isConnected ? 'Connected to robot' : 'Select a robot to connect'}
            </AppText>
          </View>

          {/* Add Robot Button */}
          {!showAddRobot && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setShowAddRobot(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <AppText style={styles.addBtnText}>Add New Robot</AppText>
            </TouchableOpacity>
          )}

          {/* Add Robot Form */}
          {showAddRobot && (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="add-circle" size={24} color={colors.primary} />
                <AppText style={[styles.cardTitle, { color: textPrimary }]}>Register New Robot</AppText>
              </View>

              <AppText style={[styles.label, { color: textSec }]}>Robot Name</AppText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: cardBorder, color: textPrimary }]}
                placeholder="e.g., Living Room Bot"
                placeholderTextColor={textSec}
                value={newRobotName}
                onChangeText={setNewRobotName}
              />

              <AppText style={[styles.label, { color: textSec }]}>Serial Number</AppText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: cardBorder, color: textPrimary }]}
                placeholder="Enter robot serial number"
                placeholderTextColor={textSec}
                value={newRobotSerial}
                onChangeText={setNewRobotSerial}
                autoCapitalize="characters"
              />

              <View style={styles.addRobotActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: cardBorder }]}
                  onPress={() => {
                    setShowAddRobot(false);
                    setNewRobotName('');
                    setNewRobotSerial('');
                  }}
                >
                  <AppText style={[styles.cancelBtnText, { color: textSec }]}>Cancel</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={addNewRobot}
                  disabled={addingRobot}
                >
                  {addingRobot ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <AppText style={styles.saveBtnText}>Register</AppText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Robots List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText style={[styles.loadingText, { color: textSec }]}>Loading robots...</AppText>
            </View>
          ) : robots.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: inputBg }]}>
              <Ionicons name="hardware-chip-outline" size={48} color={textSec} />
              <AppText style={[styles.emptyText, { color: textSec }]}>No robots found</AppText>
              <AppText style={[styles.emptySubtext, { color: textSec }]}>
                Tap "Add New Robot" to register your robot
              </AppText>
            </View>
          ) : (
            <View style={styles.robotsList}>
              <AppText style={[styles.sectionTitle, { color: textPrimary }]}>Your Robots</AppText>
              
              {robots.map((robot) => (
                <View key={robot.id} style={[styles.robotCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <View style={styles.robotInfo}>
                    <View style={styles.robotIcon}>
                      <Ionicons name="hardware-chip" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.robotDetails}>
                      <View style={styles.robotNameRow}>
                        <AppText style={[styles.robotName, { color: textPrimary }]}>{robot.name}</AppText>
                        <View style={[styles.statusBadge, { backgroundColor: robot.is_online ? `${successColor}20` : `${errorColor}20` }]}>
                          <View style={[styles.statusIndicator, { backgroundColor: robot.is_online ? successColor : errorColor }]} />
                          <AppText style={[styles.statusBadgeText, { color: robot.is_online ? successColor : errorColor }]}>
                            {robot.is_online ? 'Online' : 'Offline'}
                          </AppText>
                        </View>
                      </View>
                      <AppText style={[styles.robotSerial, { color: textSec }]}>SN: {robot.serial_number}</AppText>
                      {robot.battery > 0 && (
                        <View style={styles.batteryRow}>
                          <Ionicons name="battery-half" size={14} color={textSec} />
                          <AppText style={[styles.robotBattery, { color: textSec }]}>{robot.battery}%</AppText>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.robotActions}>
                    {selectedRobot?.id === robot.id && isConnected ? (
                      <>
                        <TouchableOpacity
                          style={[styles.controlBtn, { backgroundColor: `${infoColor}15` }]}
                          onPress={testConnection}
                        >
                          <Ionicons name="pulse" size={18} color={infoColor} />
                          <AppText style={[styles.controlBtnText, { color: infoColor }]}>Test</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.controlBtn, { backgroundColor: `${errorColor}15` }]}
                          onPress={disconnect}
                        >
                          <Ionicons name="power" size={18} color={errorColor} />
                          <AppText style={[styles.controlBtnText, { color: errorColor }]}>Disconnect</AppText>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.controlBtn, { backgroundColor: `${colors.primary}15` }]}
                          onPress={() => connectToRobot(robot)}
                          disabled={isConnecting}
                        >
                          <Ionicons name="link" size={18} color={colors.primary} />
                          <AppText style={[styles.controlBtnText, { color: colors.primary }]}>Connect</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.controlBtn, { backgroundColor: `${errorColor}15` }]}
                          onPress={() => deleteRobot(robot)}
                        >
                          <Ionicons name="trash" size={18} color={errorColor} />
                          <AppText style={[styles.controlBtnText, { color: errorColor }]}>Delete</AppText>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Robot Status Panel - Shows REAL database data */}
          {isConnected && selectedRobot && robotStatus && (
            <View style={[styles.statusCard, { backgroundColor: cardBg, borderColor: `${successColor}40` }]}>
              <View style={styles.statusHeader}>
                <View style={styles.statusHeaderLeft}>
                  <View style={[styles.statusDot, { backgroundColor: successColor }]} />
                  <AppText style={[styles.cardTitle, { color: textPrimary }]}>
                    {selectedRobot.name} - Live Status
                  </AppText>
                </View>
                <View style={[styles.badge, { backgroundColor: `${successColor}20` }]}>
                  <AppText style={[styles.badgeText, { color: successColor }]}>LIVE</AppText>
                </View>
              </View>

              <View style={styles.statusGrid}>
                <View style={styles.statusItem}>
                  <Ionicons name="battery-full" size={22} color={robotStatus.battery > 20 ? successColor : errorColor} />
                  <AppText style={[styles.statusLabel, { color: textSec }]}>Battery</AppText>
                  <AppText style={[styles.statusValue, { color: textPrimary }]}>{robotStatus.battery}%</AppText>
                </View>
                
                <View style={styles.statusItem}>
                  <Ionicons name="analytics" size={22} color={infoColor} />
                  <AppText style={[styles.statusLabel, { color: textSec }]}>Status</AppText>
                  <AppText style={[styles.statusValue, { color: textPrimary }]}>{robotStatus.status}</AppText>
                </View>
                
                <View style={styles.statusItem}>
                  <Ionicons name="options" size={22} color={colors.primary} />
                  <AppText style={[styles.statusLabel, { color: textSec }]}>Mode</AppText>
                  <AppText style={[styles.statusValue, { color: textPrimary }]}>{robotStatus.mode}</AppText>
                </View>
              </View>

              {/* Sensor Data - REAL data from database */}
              {(robotStatus.left_sensor > 0 || robotStatus.right_sensor > 0) && (
                <View style={styles.sensorContainer}>
                  <AppText style={[styles.sensorTitle, { color: textSec }]}>Sensor Readings</AppText>
                  <View style={styles.sensorRow}>
                    <View style={styles.sensorItem}>
                      <AppText style={[styles.sensorLabel, { color: textSec }]}>Left</AppText>
                      <AppText style={[styles.sensorValue, { color: textPrimary }]}>{robotStatus.left_sensor} cm</AppText>
                    </View>
                    <View style={styles.sensorDivider} />
                    <View style={styles.sensorItem}>
                      <AppText style={[styles.sensorLabel, { color: textSec }]}>Right</AppText>
                      <AppText style={[styles.sensorValue, { color: textPrimary }]}>{robotStatus.right_sensor} cm</AppText>
                    </View>
                  </View>
                </View>
              )}

              {/* Last Updated */}
              <AppText style={[styles.lastUpdated, { color: textSec }]}>
                Last update: {new Date(robotStatus.last_updated).toLocaleTimeString()}
              </AppText>

              {/* Quick Commands */}
              <View style={styles.commandsGrid}>
                <TouchableOpacity
                  style={[styles.commandBtn, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}
                  onPress={() => sendCommand('FORWARD')}
                >
                  <Ionicons name="arrow-up" size={28} color={colors.primary} />
                  <AppText style={[styles.commandText, { color: colors.primary }]}>Forward</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.commandBtn, { backgroundColor: `${errorColor}10`, borderColor: errorColor }]}
                  onPress={() => sendCommand('STOP')}
                >
                  <Ionicons name="stop" size={28} color={errorColor} />
                  <AppText style={[styles.commandText, { color: errorColor }]}>Stop</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.commandBtn, { backgroundColor: `${successColor}10`, borderColor: successColor }]}
                  onPress={() => sendCommand('AUTO_MODE')}
                >
                  <Ionicons name="scan" size={28} color={successColor} />
                  <AppText style={[styles.commandText, { color: successColor }]}>Auto</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.commandBtn, { backgroundColor: `${infoColor}10`, borderColor: infoColor }]}
                  onPress={() => sendCommand('RETURN_CHARGE')}
                >
                  <Ionicons name="home" size={28} color={infoColor} />
                  <AppText style={[styles.commandText, { color: infoColor }]}>Charge</AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  
  // Add Button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  // Cards
  card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  statusCard: { borderRadius: 20, borderWidth: 2, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  
  // Form
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, opacity: 0.7 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, marginBottom: 16 },
  
  // Add Robot Actions
  addRobotActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  // Loading & Empty States
  loadingContainer: { alignItems: 'center', padding: 40, gap: 12 },
  loadingText: { fontSize: 14 },
  emptyContainer: { alignItems: 'center', padding: 40, borderRadius: 20, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 13, textAlign: 'center', opacity: 0.7 },
  
  // Robots List
  robotsList: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  robotCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  robotInfo: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  robotIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  robotDetails: { flex: 1 },
  robotNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  robotName: { fontSize: 16, fontWeight: '700' },
  robotSerial: { fontSize: 12, opacity: 0.7, marginBottom: 4 },
  batteryRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  robotBattery: { fontSize: 12 },
  
  // Status Badge
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusIndicator: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },
  
  // Robot Actions
  robotActions: { flexDirection: 'row', gap: 12 },
  controlBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10 },
  controlBtnText: { fontSize: 13, fontWeight: '600' },
  
  // Status Display
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  statusHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  statusGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  statusItem: { alignItems: 'center', gap: 8 },
  statusLabel: { fontSize: 12, opacity: 0.7 },
  statusValue: { fontSize: 18, fontWeight: '700' },
  
  // Sensors
  sensorContainer: { marginBottom: 16 },
  sensorTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, opacity: 0.7 },
  sensorRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  sensorItem: { alignItems: 'center', gap: 4 },
  sensorDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  sensorLabel: { fontSize: 11, opacity: 0.7 },
  
  // Last Updated
  lastUpdated: { fontSize: 10, textAlign: 'center', marginBottom: 16, opacity: 0.5 },
  
  // Commands
  commandsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  commandBtn: { flex: 1, minWidth: '45%', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  commandText: { fontSize: 12, fontWeight: '600' },
  
  // Toast
  toast: { position: 'absolute', flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, gap: 12, zIndex: 9999, elevation: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  toastText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },
});