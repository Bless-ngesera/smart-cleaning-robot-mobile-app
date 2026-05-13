// src/services/ProductionRobotService.ts
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RobotStatus {
  id: string;
  robot_id: string;
  status: string;
  battery: number;
  left_sensor: number;
  right_sensor: number;
  front_left_sensor?: number;
  front_right_sensor?: number;
  movement: string;
  mode: string;
  last_updated: string;
  cleaning_area?: number;
}

export interface Command {
  id: string;
  robot_id: string;
  command: string;
  status: 'pending' | 'sent' | 'executed' | 'failed' | 'expired';
  created_at: string;
}

export class ProductionRobotService {
  private statusChannel: RealtimeChannel | null = null;
  private commandChannel: RealtimeChannel | null = null;
  private currentRobotId: string | null = null;
  private statusCallbacks: ((status: RobotStatus) => void)[] = [];
  private isSubscribed = false;
  
  // Generate a valid UUID from robot ID
  private generateUUID(robotId: string): string {
    // If it's already a UUID format, return as is
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(robotId)) {
      return robotId;
    }
    
    // Convert string to UUID (deterministic)
    let hash = 0;
    for (let i = 0; i < robotId.length; i++) {
      hash = ((hash << 5) - hash) + robotId.charCodeAt(i);
      hash |= 0;
    }
    
    const hexHash = Math.abs(hash).toString(16).padStart(32, '0');
    return `${hexHash.slice(0,8)}-${hexHash.slice(8,12)}-4${hexHash.slice(13,16)}-${hexHash.slice(16,20)}-${hexHash.slice(20,32)}`;
  }
  
  // Initialize and subscribe to real-time updates
  async initialize(robotId: string): Promise<boolean> {
    this.currentRobotId = robotId;
    
    try {
      // First, ensure robot exists in database
      await this.ensureRobotExists(robotId);
      
      // Subscribe to robot status changes
      if (this.statusChannel) {
        await this.statusChannel.unsubscribe();
      }
      
      this.statusChannel = supabase
        .channel(`robot-status-${robotId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'robot_status',
            filter: `robot_id=eq.${this.generateUUID(robotId)}`
          },
          (payload) => {
            console.log('📡 New robot status:', payload.new);
            if (payload.new) {
              this.statusCallbacks.forEach(cb => cb(payload.new as RobotStatus));
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Subscription status:', status);
          this.isSubscribed = status === 'SUBSCRIBED';
        });
      
      // Subscribe to command responses
      if (this.commandChannel) {
        await this.commandChannel.unsubscribe();
      }
      
      this.commandChannel = supabase
        .channel(`commands-${robotId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'command_queue',
            filter: `robot_id=eq.${this.generateUUID(robotId)}`
          },
          (payload) => {
            const command = payload.new as Command;
            if (command.status === 'executed') {
              console.log('✅ Command executed:', command.command);
            } else if (command.status === 'failed') {
              console.log('❌ Command failed:', command.command);
            }
          }
        )
        .subscribe();
      
      // Wait a bit for subscription to establish
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Initial status fetch
      const status = await this.fetchCurrentStatus();
      return status !== null;
      
    } catch (error) {
      console.error('Initialize error:', error);
      return false;
    }
  }
  
  // Ensure robot exists in database
  private async ensureRobotExists(robotId: string): Promise<void> {
    const uuid = this.generateUUID(robotId);
    
    // Check if robot exists
    const { data: existing } = await supabase
      .from('robots')
      .select('id')
      .eq('id', uuid)
      .single();
    
    if (!existing) {
      // Create robot entry
      const { error } = await supabase
        .from('robots')
        .insert({
          id: uuid,
          owner_id: (await supabase.auth.getUser()).data.user?.id,
          name: `Robot ${robotId}`,
          serial_number: robotId,
          connection_type: 'cloud',
          status: 'offline',
          battery: 100,
          mode: 'MANUAL',
          created_at: new Date().toISOString()
        });
      
      if (error && error.code !== '23505') { // Ignore duplicate key error
        console.error('Error creating robot:', error);
      }
    }
  }
  
  // Fetch current robot status with timeout
  async fetchCurrentStatus(): Promise<RobotStatus | null> {
    if (!this.currentRobotId) return null;
    
    const uuid = this.generateUUID(this.currentRobotId);
    
    try {
      const { data, error } = await supabase
        .from('robot_status')
        .select('*')
        .eq('robot_id', uuid)
        .order('last_updated', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error fetching status:', error.message);
        return null;
      }
      
      if (data && data.length > 0) {
        return data[0] as RobotStatus;
      }
      
      // If no status exists, return default
      return {
        id: uuid,
        robot_id: uuid,
        status: 'offline',
        battery: 100,
        left_sensor: 0,
        right_sensor: 0,
        movement: 'STOP',
        mode: 'MANUAL',
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Fetch error:', error);
      return null;
    }
  }
  
  // Send command to robot
  async sendCommand(command: string): Promise<boolean> {
    if (!this.currentRobotId) {
      console.error('No robot connected');
      return false;
    }
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uuid = this.generateUUID(this.currentRobotId);
      
      const { error } = await supabase
        .from('command_queue')
        .insert({
          robot_id: uuid,
          command: command,
          priority: 2,
          status: 'pending',
          user_id: userData.user?.id,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error sending command:', error.message);
        return false;
      }
      
      console.log('📤 Command sent:', command);
      
      // Also log to robot_logs
      await supabase
        .from('robot_logs')
        .insert({
          robot_id: uuid,
          event_type: 'command',
          message: command,
          created_at: new Date().toISOString()
        });
      
      return true;
    } catch (error) {
      console.error('Send command error:', error);
      return false;
    }
  }
  
  // Update robot status (for ESP32 to call)
  async updateStatus(statusData: Partial<RobotStatus>): Promise<boolean> {
    if (!this.currentRobotId) return false;
    
    const uuid = this.generateUUID(this.currentRobotId);
    
    const { error } = await supabase
      .from('robot_status')
      .insert({
        robot_id: uuid,
        ...statusData,
        last_updated: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error updating status:', error.message);
      return false;
    }
    
    return true;
  }
  
  // Subscribe to status changes
  onStatusChange(callback: (status: RobotStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }
  
  // Get robot info
  async getRobotInfo() {
    if (!this.currentRobotId) return null;
    
    const uuid = this.generateUUID(this.currentRobotId);
    
    const { data, error } = await supabase
      .from('robots')
      .select('*')
      .eq('id', uuid)
      .single();
    
    if (error) {
      console.error('Error fetching robot info:', error.message);
      return null;
    }
    
    return data;
  }
  
  // Get cleaning history
  async getCleaningHistory(limit: number = 10) {
    if (!this.currentRobotId) return [];
    
    const uuid = this.generateUUID(this.currentRobotId);
    
    const { data, error } = await supabase
      .from('cleaning_sessions')
      .select('*')
      .eq('robot_id', uuid)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching history:', error.message);
      return [];
    }
    
    return data;
  }
  
  // Disconnect
  async disconnect(): Promise<void> {
    if (this.statusChannel) {
      await this.statusChannel.unsubscribe();
      this.statusChannel = null;
    }
    
    if (this.commandChannel) {
      await this.commandChannel.unsubscribe();
      this.commandChannel = null;
    }
    
    this.currentRobotId = null;
    this.statusCallbacks = [];
    this.isSubscribed = false;
  }
  
  // Check if connected
  isConnected(): boolean {
    return this.currentRobotId !== null && this.isSubscribed;
  }
  
  // Get current robot ID
  getCurrentRobotId(): string | null {
    return this.currentRobotId;
  }
}

// Singleton instance
export const robotService = new ProductionRobotService();