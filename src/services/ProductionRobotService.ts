// src/services/ProductionRobotService.ts
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { EmailService } from './EmailService';

export interface Robot {
  id: string;
  name: string;
  serial_number: string;
  connection_type: string;
  status: string;
  mode: string;
  is_online: boolean;
  last_seen: string;
  owner_id: string;
  battery_level?: number;
  firmware_version?: string;
}

export interface RobotStatus {
  id: string;
  robot_id: string;
  status: string;
  left_sensor: number;
  right_sensor: number;
  movement: string;
  mode: string;
  last_updated: string;
  camera_status?: string;
  camera_fps?: number;
  frames_captured?: number;
  dirt_detected?: boolean;
  dirt_confidence?: number;
  camera_brightness?: number;
  battery_level?: number;
}

export interface CommandResult {
  success: boolean;
  message: string;
}

class ProductionRobotServiceClass {
  private currentRobot: Robot | null = null;
  private activeSessionId: string | null = null;
  private cleaningStartedAt: Date | null = null;

  private statusChannel: RealtimeChannel | null = null;
  private robotChannel: RealtimeChannel | null = null;

  private statusCallbacks: ((status: RobotStatus) => void)[] = [];
  private robotChangeCallbacks: ((robot: Robot) => void)[] = [];

  private pollInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  // ============================================
  // ROBOT MANAGEMENT
  // ============================================

  async getUserRobots(): Promise<Robot[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('robots')
        .select('*')
        .eq('owner_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Get user robots error:', error);
      return [];
    }
  }

  async registerRobot(
    serialNumber: string,
    name: string,
    ownerId?: string
  ): Promise<{ success: boolean; robot?: Robot; error?: string }> {
    try {
      const { data: existing } = await supabase
        .from('robots')
        .select('id')
        .eq('serial_number', serialNumber)
        .maybeSingle();

      if (existing) return { success: false, error: 'Robot already registered' };

      const { data: user } = await supabase.auth.getUser();
      const finalOwnerId = ownerId || user.user?.id;
      if (!finalOwnerId) return { success: false, error: 'No user ID provided' };

      const { data, error } = await supabase
        .from('robots')
        .insert({
          serial_number: serialNumber,
          name,
          owner_id: finalOwnerId,
          connection_type: 'cloud',
          status: 'offline',
          mode: 'MANUAL',
          is_online: false,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, robot: data };
    } catch (error: any) {
      console.error('Register robot error:', error);
      return { success: false, error: error.message };
    }
  }

  async claimRobot(serialNumber: string): Promise<{ success: boolean; robot?: Robot; error?: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return { success: false, error: 'Not logged in' };

      const { data: robot, error: findError } = await supabase
        .from('robots')
        .select('*')
        .eq('serial_number', serialNumber)
        .maybeSingle();

      if (findError) throw findError;
      if (!robot) return { success: false, error: 'Robot not found. Check serial number.' };
      if (robot.owner_id) return { success: false, error: 'Robot already claimed by another user' };

      const { data: updated, error: updateError } = await supabase
        .from('robots')
        .update({ owner_id: user.user.id, name: robot.name || `Robot ${serialNumber}` })
        .eq('id', robot.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return { success: true, robot: updated };
    } catch (error: any) {
      console.error('Claim robot error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateRobotName(robotId: string, newName: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('robots').update({ name: newName }).eq('id', robotId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update robot name error:', error);
      return false;
    }
  }

  async deleteRobot(robotId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('robots').delete().eq('id', robotId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete robot error:', error);
      return false;
    }
  }

  async getLatestRobotData(robotId: string): Promise<Robot | null> {
    try {
      const { data, error } = await supabase
        .from('robots')
        .select('*')
        .eq('id', robotId)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get latest robot data error:', error);
      return null;
    }
  }

  // ============================================
  // CONNECTION & REAL-TIME
  // ============================================

  async connectToRobot(serialNumber: string): Promise<{ success: boolean; robot?: Robot; error?: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return { success: false, error: 'Not logged in' };

      const { data: robot, error: findError } = await supabase
        .from('robots')
        .select('*')
        .eq('serial_number', serialNumber)
        .eq('owner_id', user.user.id)
        .maybeSingle();

      if (findError) throw findError;
      if (!robot) return { success: false, error: 'Robot not found. Check serial number.' };

      const { data: updatedRobot, error: updateError } = await supabase
        .from('robots')
        .update({
          is_online: true,
          status: 'online',
          last_seen: new Date().toISOString(),
        })
        .eq('id', robot.id)
        .select()
        .single();

      if (updateError) throw updateError;

      this.currentRobot = updatedRobot || robot;

      await this.startRealtimeSubscription(robot.id);
      this.startHeartbeat();
      this.startPolling();

      return { success: true, robot: this.currentRobot };
    } catch (error: any) {
      console.error('Connect to robot error:', error);
      return { success: false, error: error.message };
    }
  }

  // Soft-connect: restore service state for a robot that's already online in DB,
  // without marking it online again. Called when the app resumes mid-session.
  async softConnect(robotId: string): Promise<boolean> {
    try {
      const robot = await this.getLatestRobotData(robotId);
      if (!robot) return false;

      this.currentRobot = robot;
      await this.startRealtimeSubscription(robot.id);
      this.startHeartbeat();
      this.startPolling();
      return true;
    } catch (error) {
      console.error('Soft-connect error:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.currentRobot) {
      await supabase
        .from('robots')
        .update({ is_online: false, status: 'offline' })
        .eq('id', this.currentRobot.id);
    }

    this.stopPolling();
    this.stopHeartbeat();
    this.stopRealtimeSubscription();
    this.currentRobot = null;
    this.activeSessionId = null;
    this.cleaningStartedAt = null;
    this.statusCallbacks = [];
    this.robotChangeCallbacks = [];
  }

  // Robot_status: listen for both INSERT and UPDATE so ESP32-style row-updates work too
  private async startRealtimeSubscription(robotId: string): Promise<void> {
    this.stopRealtimeSubscription();

    this.statusChannel = supabase
      .channel(`robot-status-${robotId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'robot_status', filter: `robot_id=eq.${robotId}` },
        (payload) => {
          const status = payload.new as RobotStatus;
          this.statusCallbacks.forEach(cb => cb(status));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'robot_status', filter: `robot_id=eq.${robotId}` },
        (payload) => {
          const status = payload.new as RobotStatus;
          this.statusCallbacks.forEach(cb => cb(status));
        }
      )
      .subscribe();

    // Also watch the robots row itself for is_online / status / mode changes
    this.robotChannel = supabase
      .channel(`robot-record-${robotId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'robots', filter: `id=eq.${robotId}` },
        (payload) => {
          const updated = payload.new as Robot;
          if (this.currentRobot) {
            this.currentRobot = { ...this.currentRobot, ...updated };
          }
          this.robotChangeCallbacks.forEach(cb => cb(updated));
        }
      )
      .subscribe();
  }

  private stopRealtimeSubscription(): void {
    if (this.statusChannel) {
      this.statusChannel.unsubscribe();
      this.statusChannel = null;
    }
    if (this.robotChannel) {
      this.robotChannel.unsubscribe();
      this.robotChannel = null;
    }
  }

  // Heartbeat: keep last_seen current every 30 s while app is connected
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(async () => {
      if (this.currentRobot) {
        await supabase
          .from('robots')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', this.currentRobot.id);
      }
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Polling at 5 s: fallback for environments where realtime isn't reliable
  private startPolling(): void {
    this.stopPolling();
    this.isPolling = true;

    this.pollInterval = setInterval(async () => {
      if (!this.currentRobot || !this.isPolling) return;

      const [status, robot] = await Promise.all([
        this.fetchLatestStatus(),
        this.getLatestRobotData(this.currentRobot.id),
      ]);

      if (status) this.statusCallbacks.forEach(cb => cb(status));
      if (robot) {
        this.currentRobot = robot;
        this.robotChangeCallbacks.forEach(cb => cb(robot));
      }
    }, 5_000);
  }

  private stopPolling(): void {
    this.isPolling = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async fetchLatestStatus(): Promise<RobotStatus | null> {
    if (!this.currentRobot) return null;
    try {
      const { data, error } = await supabase
        .from('robot_status')
        .select('*')
        .eq('robot_id', this.currentRobot.id)
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fetch latest status error:', error);
      return null;
    }
  }

  // ============================================
  // COMMANDS
  // ============================================

  async sendCommand(command: string): Promise<CommandResult> {
    if (!this.currentRobot) {
      return { success: false, message: 'No robot connected' };
    }

    try {
      const { data: user } = await supabase.auth.getUser();

      const { error: queueError } = await supabase.from('command_queue').insert({
        robot_id: this.currentRobot.id,
        command: command.toUpperCase(),
        status: 'pending',
        user_id: user.user?.id,
      });

      if (queueError) throw queueError;

      await supabase.from('robot_logs').insert({
        robot_id: this.currentRobot.id,
        event_type: 'command',
        message: command,
      });

      return { success: true, message: `Command "${command}" sent successfully` };
    } catch (error: any) {
      console.error('Send command error:', error);
      return { success: false, message: error.message || 'Failed to send command' };
    }
  }

  async getCommandHistory(limit: number = 50): Promise<any[]> {
    if (!this.currentRobot) return [];
    try {
      const { data, error } = await supabase
        .from('command_queue')
        .select('*')
        .eq('robot_id', this.currentRobot.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get command history error:', error);
      return [];
    }
  }

  // ============================================
  // CLEANING SESSIONS
  // ============================================

  async startCleaningSession(mode: string): Promise<string | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const now = new Date();
      this.cleaningStartedAt = now;

      const { data, error } = await supabase
        .from('cleaning_sessions')
        .insert({
          user_id: user.user.id,
          status: 'active',
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })
        .select('id')
        .single();

      if (error) throw error;
      this.activeSessionId = data.id;
      return data.id;
    } catch (error: any) {
      console.error('Start cleaning session error:', error);
      return null;
    }
  }

  async endCleaningSession(
    status: 'completed' | 'failed' | 'cancelled',
    areaSqm?: number
  ): Promise<boolean> {
    const sessionId = this.activeSessionId;
    if (!sessionId) return false;

    try {
      const updates: Record<string, any> = { status };

      if (this.cleaningStartedAt) {
        const durationMs = Date.now() - this.cleaningStartedAt.getTime();
        const totalMins = Math.round(durationMs / 60_000);
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        updates.duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
      }

      if (areaSqm != null) {
        updates.area = `${areaSqm.toFixed(1)} m²`;
      }

      const { error } = await supabase
        .from('cleaning_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;

      this.activeSessionId = null;
      this.cleaningStartedAt = null;
      return true;
    } catch (error: any) {
      console.error('End cleaning session error:', error);
      return false;
    }
  }

  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  onStatusChange(callback: (status: RobotStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  onRobotChange(callback: (robot: Robot) => void): () => void {
    this.robotChangeCallbacks.push(callback);
    return () => {
      this.robotChangeCallbacks = this.robotChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  getCurrentRobot(): Robot | null {
    return this.currentRobot;
  }

  isConnected(): boolean {
    return this.currentRobot !== null;
  }

  async notifyError(errorMessage: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email || !this.currentRobot) return;

      const prefs = await import('@react-native-async-storage/async-storage')
        .then(m => m.default.getItem('notificationPreferences'))
        .then(raw => (raw ? JSON.parse(raw) : {}));

      if (!prefs.errorAlerts) return;
      await EmailService.sendErrorAlert(user.email, this.currentRobot.name, errorMessage);
    } catch { /* non-blocking */ }
  }

  getStatusSummary(): string {
    if (!this.currentRobot) return 'Disconnected';
    return `${this.currentRobot.name} — ${this.currentRobot.is_online ? 'Online' : 'Offline'}`;
  }
}

export const ProductionRobotService = new ProductionRobotServiceClass();
