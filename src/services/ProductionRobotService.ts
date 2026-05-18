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
}

export interface CommandResult {
  success: boolean;
  message: string;
}

class ProductionRobotServiceClass {
  private currentRobot: Robot | null = null;
  private statusChannel: RealtimeChannel | null = null;
  private statusCallbacks: ((status: RobotStatus) => void)[] = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  // ============================================
  // ROBOT MANAGEMENT
  // ============================================

  // Get all robots for current user
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

  // Register a new robot (Admin/ESP32 use)
  async registerRobot(
    serialNumber: string,
    name: string,
    ownerId?: string
  ): Promise<{ success: boolean; robot?: Robot; error?: string }> {
    try {
      // Check if robot already exists
      const { data: existing } = await supabase
        .from('robots')
        .select('id')
        .eq('serial_number', serialNumber)
        .maybeSingle();

      if (existing) {
        return { success: false, error: 'Robot already registered' };
      }

      const { data: user } = await supabase.auth.getUser();
      const finalOwnerId = ownerId || user.user?.id;

      if (!finalOwnerId) {
        return { success: false, error: 'No user ID provided' };
      }

      const { data, error } = await supabase
        .from('robots')
        .insert({
          serial_number: serialNumber,
          name: name,
          owner_id: finalOwnerId,
          connection_type: 'cloud',
          status: 'offline',
          mode: 'MANUAL',
          is_online: false,
          created_at: new Date().toISOString(),
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

  // Add existing robot to user account (claim by serial number)
  async claimRobot(serialNumber: string): Promise<{ success: boolean; robot?: Robot; error?: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { success: false, error: 'Not logged in' };
      }

      // Find robot by serial number
      const { data: robot, error: findError } = await supabase
        .from('robots')
        .select('*')
        .eq('serial_number', serialNumber)
        .maybeSingle();

      if (findError) throw findError;

      if (!robot) {
        return { success: false, error: 'Robot not found. Check serial number.' };
      }

      if (robot.owner_id) {
        return { success: false, error: 'Robot already claimed by another user' };
      }

      // Claim the robot
      const { data: updated, error: updateError } = await supabase
        .from('robots')
        .update({
          owner_id: user.user.id,
          name: robot.name || `Robot ${serialNumber}`,
        })
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

  // Update robot name
  async updateRobotName(robotId: string, newName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('robots')
        .update({ name: newName })
        .eq('id', robotId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update robot name error:', error);
      return false;
    }
  }

  // Delete robot
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

  // ============================================
  // CONNECTION & REAL-TIME
  // ============================================

  // Connect to a robot by serial number
  async connectToRobot(serialNumber: string): Promise<{ success: boolean; robot?: Robot; error?: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { success: false, error: 'Not logged in' };
      }

      // Find the robot
      const { data: robot, error: findError } = await supabase
        .from('robots')
        .select('*')
        .eq('serial_number', serialNumber)
        .eq('owner_id', user.user.id)
        .maybeSingle();

      if (findError) throw findError;

      if (!robot) {
        return { success: false, error: 'Robot not found. Check serial number.' };
      }

      // Update online status
      await supabase
        .from('robots')
        .update({
          is_online: true,
          status: 'online',
          last_seen: new Date().toISOString(),
        })
        .eq('id', robot.id);

      this.currentRobot = robot;

      // Start real-time subscription
      await this.startRealtimeSubscription(robot.id);

      // Start polling for status
      this.startPolling();

      return { success: true, robot };
    } catch (error: any) {
      console.error('Connect to robot error:', error);
      return { success: false, error: error.message };
    }
  }

  // Disconnect from current robot
  async disconnect(): Promise<void> {
    if (this.currentRobot) {
      await supabase
        .from('robots')
        .update({
          is_online: false,
          status: 'offline',
        })
        .eq('id', this.currentRobot.id);
    }

    this.stopPolling();
    this.stopRealtimeSubscription();
    this.currentRobot = null;
    this.statusCallbacks = [];
  }

  // Start real-time subscription for status updates
  private async startRealtimeSubscription(robotId: string): Promise<void> {
    this.stopRealtimeSubscription();

    this.statusChannel = supabase
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
          const status = payload.new as RobotStatus;
          this.statusCallbacks.forEach(cb => cb(status));
        }
      )
      .subscribe();
  }

  private stopRealtimeSubscription(): void {
    if (this.statusChannel) {
      this.statusChannel.unsubscribe();
      this.statusChannel = null;
    }
  }

  // Poll for latest status (fallback for real-time)
  private startPolling(): void {
    this.stopPolling();
    this.isPolling = true;
    
    this.pollInterval = setInterval(async () => {
      if (this.currentRobot && this.isPolling) {
        const status = await this.fetchLatestStatus();
        if (status) {
          this.statusCallbacks.forEach(cb => cb(status));
        }
      }
    }, 3000);
  }

  private stopPolling(): void {
    this.isPolling = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Fetch latest robot status from database
  async fetchLatestStatus(): Promise<RobotStatus | null> {
    if (!this.currentRobot) return null;

    try {
      const { data, error } = await supabase
        .from('robot_status')
        .select('*')
        .eq('robot_id', this.currentRobot.id)
        .order('last_updated', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Fetch latest status error:', error);
      return null;
    }
  }

  // Send command to robot
  async sendCommand(command: string): Promise<CommandResult> {
    if (!this.currentRobot) {
      return { success: false, message: 'No robot connected' };
    }

    try {
      const { data: user } = await supabase.auth.getUser();

      // Insert command into queue
      const { error: queueError } = await supabase.from('command_queue').insert({
        robot_id: this.currentRobot.id,
        command: command.toUpperCase(),
        status: 'pending',
        user_id: user.user?.id,
        created_at: new Date().toISOString(),
      });

      if (queueError) throw queueError;

      // Log the command
      await supabase.from('robot_logs').insert({
        robot_id: this.currentRobot.id,
        event_type: 'command',
        message: command,
        created_at: new Date().toISOString(),
      });

      return { success: true, message: `Command "${command}" sent successfully` };
    } catch (error: any) {
      console.error('Send command error:', error);
      return { success: false, message: error.message || 'Failed to send command' };
    }
  }

  // Get command history for robot
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
  // UTILITY METHODS
  // ============================================

  // Subscribe to status changes
  onStatusChange(callback: (status: RobotStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  // Get current connected robot
  getCurrentRobot(): Robot | null {
    return this.currentRobot;
  }

  // Check if connected
  isConnected(): boolean {
    return this.currentRobot !== null;
  }

  // Send an error-alert email to the signed-in user (non-blocking)
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

  // Get robot status summary
  getStatusSummary(): string {
    if (!this.currentRobot) return 'Disconnected';
    return `${this.currentRobot.name} - ${this.currentRobot.is_online ? 'Online' : 'Offline'}`;
  }
}

// Singleton export
export const ProductionRobotService = new ProductionRobotServiceClass();