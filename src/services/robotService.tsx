// src/services/robotService.tsx
//
// ============================================================
// ROBOT SERVICE — WiFi / BLE HARDWARE BRIDGE
// ============================================================
// This service handles direct communication with the physical robot.
// Screens use Supabase for persistence; this service talks to the
// robot hardware in real time.
//
// C++ INTEGRATION POINTS:
//   - WiFi: HTTP REST calls to the robot's onboard web server
//     (ESP32 / Raspberry Pi running a REST API)
//   - BLE: GATT characteristic reads/writes via react-native-ble-plx
//     Replace YOUR_SERVICE_UUID / YOUR_*_CHAR_UUID with your robot's
//     actual GATT profile UUIDs (from your robot firmware / BLE spec)
//   - Native C++ bridge (JNI/Obj-C++):
//     import { NativeModules } from 'react-native';
//     const { RobotBridge } = NativeModules;
//     // Then use RobotBridge.startCleaning(), .stopCleaning(), etc.
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// === C++ INTEGRATION POINT ===
// BleManager is lazy-loaded to avoid crashing in Expo Go
// (react-native-ble-plx is a native module, not available in Expo Go)
let bleManagerInstance: any = null;
const getBleManager = () => {
    if (bleManagerInstance) return bleManagerInstance;
    try {
        const { BleManager } = require('react-native-ble-plx');
        bleManagerInstance = new BleManager();
        return bleManagerInstance;
    } catch {
        console.warn('[RobotService] react-native-ble-plx not available (Expo Go)');
        return null;
    }
};

// Connection types
export type ConnectionType = 'wifi' | 'ble' | 'none';

export type RobotStatus = {
    batteryLevel: number;
    isCleaning: boolean;
    lastCleaned: string;
    errors: string[];
    status: 'Online' | 'Offline' | 'Charging' | 'Error';
    connectionType?: ConnectionType;
};

export type ScheduleEntry = {
    day: string;
    time: string;
};

// Global connection state
let currentConnection: ConnectionType = 'none';
let wifiBaseUrl: string = '';
let bleDevice: any = null;

// Load saved connection on module init
const init = async () => {
    try {
        const saved = await AsyncStorage.getItem('robotConnection');
        if (!saved) return;

        const { type, ip, bleId } = JSON.parse(saved);
        currentConnection = type;

        if (type === 'wifi' && ip) {
            wifiBaseUrl = ip.startsWith('http') ? ip : `http://${ip}`;
        }

        if (type === 'ble' && bleId) {
            const manager = getBleManager();
            if (!manager) return;
            try {
                bleDevice = await manager.connectToDevice(bleId);
                await bleDevice.discoverAllServicesAndCharacteristics();
                console.log('[RobotService] Reconnected to BLE device:', bleId);
            } catch (err) {
                console.warn('[RobotService] BLE reconnect failed:', err);
                currentConnection = 'none';
            }
        }
    } catch (err) {
        console.warn('[RobotService] Failed to load saved connection:', err);
    }
};
init();

// Save connection preference
const saveConnection = async (type: ConnectionType, ip?: string, bleId?: string) => {
    await AsyncStorage.setItem('robotConnection', JSON.stringify({ type, ip, bleId }));
    currentConnection = type;
};

// === GET ROBOT STATUS ===
export const getRobotStatus = async (): Promise<RobotStatus> => {
    if (currentConnection === 'wifi' && wifiBaseUrl) {
        try {
            const res = await axios.get(`${wifiBaseUrl}/status`, { timeout: 6000 });
            return { ...res.data, status: 'Online', connectionType: 'wifi' };
        } catch (err) {
            console.warn('[RobotService] Wi-Fi status fetch failed:', err);
        }
    }

    if (currentConnection === 'ble' && bleDevice) {
        try {
            // === C++ INTEGRATION POINT ===
            // Replace YOUR_SERVICE_UUID and YOUR_STATUS_CHAR_UUID with
            // the actual GATT UUIDs from your robot's BLE firmware spec.
            // Example (battery service): '0000180f-0000-1000-8000-00805f9b34fb'
            const statusChar = await bleDevice.readCharacteristicForService(
                'YOUR_SERVICE_UUID',
                'YOUR_STATUS_CHAR_UUID'
            );
            const parsed = JSON.parse(atob(statusChar.value));
            return { ...parsed, status: 'Online', connectionType: 'ble' };
        } catch (err) {
            console.warn('[RobotService] BLE status read failed:', err);
        }
    }

    // No connection — return offline status (not fake data)
    return {
        batteryLevel: 0,
        isCleaning: false,
        lastCleaned: 'Never',
        errors: ['No robot connection active'],
        status: 'Offline',
        connectionType: 'none',
    };
};

// === START CLEANING ===
export const startCleaning = async (): Promise<void> => {
    if (currentConnection === 'wifi') {
        await axios.post(`${wifiBaseUrl}/command`, { command: 'start' });
    } else if (currentConnection === 'ble' && bleDevice) {
        // === C++ INTEGRATION POINT: Write BLE command characteristic ===
        // Replace with your real UUIDs
        await bleDevice.writeCharacteristicWithResponseForService(
            'YOUR_SERVICE_UUID',
            'YOUR_COMMAND_CHAR_UUID',
            btoa(JSON.stringify({ command: 'start' })) // base64 encode
        );
    } else {
        throw new Error('No robot connection active');
    }
};

// === STOP CLEANING ===
export const stopCleaning = async (): Promise<void> => {
    if (currentConnection === 'wifi') {
        await axios.post(`${wifiBaseUrl}/command`, { command: 'stop' });
    } else if (currentConnection === 'ble' && bleDevice) {
        // === C++ INTEGRATION POINT: Write BLE command characteristic ===
        await bleDevice.writeCharacteristicWithResponseForService(
            'YOUR_SERVICE_UUID',
            'YOUR_COMMAND_CHAR_UUID',
            btoa(JSON.stringify({ command: 'stop' }))
        );
    } else {
        throw new Error('No robot connection active');
    }
};

// === DOCK ROBOT ===
export const dockRobot = async (): Promise<void> => {
    if (currentConnection === 'wifi') {
        await axios.post(`${wifiBaseUrl}/command`, { command: 'dock' });
    } else if (currentConnection === 'ble' && bleDevice) {
        // === C++ INTEGRATION POINT: Write BLE command characteristic ===
        await bleDevice.writeCharacteristicWithResponseForService(
            'YOUR_SERVICE_UUID',
            'YOUR_COMMAND_CHAR_UUID',
            btoa(JSON.stringify({ command: 'dock' }))
        );
    } else {
        throw new Error('No robot connection active');
    }
};

// === GET SCHEDULE ===
export const getSchedule = async (): Promise<ScheduleEntry[]> => {
    if (currentConnection === 'wifi' && wifiBaseUrl) {
        const res = await axios.get(`${wifiBaseUrl}/schedule`, { timeout: 6000 });
        return res.data;
    }

    if (currentConnection === 'ble' && bleDevice) {
        // === C++ INTEGRATION POINT ===
        // Replace YOUR_SCHEDULE_CHAR_UUID with your robot's GATT schedule characteristic UUID
        const char = await bleDevice.readCharacteristicForService(
            'YOUR_SERVICE_UUID',
            'YOUR_SCHEDULE_CHAR_UUID'
        );
        return JSON.parse(atob(char.value));
    }

    // No connection — return empty (real schedules are managed via Supabase in ScheduleScreen)
    return [];
};

// === SET SCHEDULE ===
export const setSchedule = async (entry: ScheduleEntry): Promise<void> => {
    if (currentConnection === 'wifi') {
        await axios.post(`${wifiBaseUrl}/schedule`, entry);
    } else if (currentConnection === 'ble' && bleDevice) {
        // === C++ INTEGRATION POINT: Write BLE schedule characteristic ===
        await bleDevice.writeCharacteristicWithResponseForService(
            'YOUR_SERVICE_UUID',
            'YOUR_SCHEDULE_CHAR_UUID',
            btoa(JSON.stringify(entry))
        );
    } else {
        // No active connection — schedule is managed via Supabase in ScheduleScreen
        console.warn('[RobotService] setSchedule called with no robot connection. Entry:', entry);
    }
};

// === GET MAP DATA ===
// === C++ INTEGRATION POINT ===
// The robot's SLAM system streams occupancy grid + detected room polygons.
// When your robot firmware is ready:
//   WiFi: GET /map returns { zones, obstacles, robotPosition, coverage, cleanedPolygons }
//   BLE: Read YOUR_MAP_CHAR_UUID characteristic (may need chunked reads for large maps)
//   Native C++: const mapData = await RobotBridge.getMapSnapshot();
export const getMap = async (): Promise<any> => {
    if (currentConnection === 'wifi' && wifiBaseUrl) {
        const res = await axios.get(`${wifiBaseUrl}/map`, { timeout: 10000 });
        return res.data;
    }

    if (currentConnection === 'ble' && bleDevice) {
        // === C++ INTEGRATION POINT ===
        // Replace YOUR_MAP_CHAR_UUID with your GATT map characteristic UUID
        const char = await bleDevice.readCharacteristicForService(
            'YOUR_SERVICE_UUID',
            'YOUR_MAP_CHAR_UUID'
        );
        return JSON.parse(atob(char.value));
    }

    // No connection — MapScreen falls back to Supabase robot_status table
    return null;
};

// === MANUAL CONNECT FUNCTIONS (call from settings or onboarding) ===

export const connectWifi = async (ip: string): Promise<RobotStatus> => {
    wifiBaseUrl = ip.startsWith('http') ? ip : `http://${ip}`;
    await saveConnection('wifi', wifiBaseUrl);
    return await getRobotStatus();
};

export const connectBle = async (deviceId: string): Promise<RobotStatus> => {
    const manager = getBleManager();
    if (!manager) throw new Error('BLE not available in this environment');
    bleDevice = await manager.connectToDevice(deviceId);
    await bleDevice.discoverAllServicesAndCharacteristics();
    await saveConnection('ble', undefined, deviceId);
    return await getRobotStatus();
};

// Get current connection status
export const getConnectionStatus = () => ({
    type: currentConnection,
    isConnected: currentConnection !== 'none',
});

// === SEND GENERIC COMMAND ===
// Used for manual move, rotate, and any custom command not covered by the helpers above.
export const sendCommand = async (command: string, params?: Record<string, any>): Promise<void> => {
    if (currentConnection === 'wifi' && wifiBaseUrl) {
        await axios.post(`${wifiBaseUrl}/command`, { command, ...params }, { timeout: 6000 });
        return;
    }

    if (currentConnection === 'ble' && bleDevice) {
        // === C++ INTEGRATION POINT: Write BLE command characteristic ===
        await bleDevice.writeCharacteristicWithResponseForService(
            'YOUR_SERVICE_UUID',
            'YOUR_COMMAND_CHAR_UUID',
            btoa(JSON.stringify({ command, ...params }))
        );
        return;
    }

    // No active connection — log only
    console.log('[RobotService] sendCommand: no connection active. Command dropped:', command, params);
};

// === DISCONNECT ROBOT ===
// Closes the active connection, clears persisted state, and resets module globals.
export const disconnectRobot = async (): Promise<void> => {
    if (currentConnection === 'ble' && bleDevice) {
        try {
            await bleDevice.cancelConnection();
        } catch {
            // Ignore disconnect errors
        }
        bleDevice = null;
    }

    currentConnection = 'none';
    wifiBaseUrl = '';
    await AsyncStorage.removeItem('robotConnection');
};