// src/services/robotService.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BleManager } from 'react-native-ble-plx'; // install: npm install react-native-ble-plx
import axios from 'axios'; // install: npm install axios

const bleManager = new BleManager();

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
let wifiBaseUrl: string = 'http://192.168.1.150'; // default – will be overridden by saved value
let bleDevice: any = null; // current connected BLE device

// Load saved connection on module init
const init = async () => {
    try {
        const saved = await AsyncStorage.getItem('robotConnection');
        if (saved) {
            const { type, ip, bleId } = JSON.parse(saved);
            currentConnection = type;
            if (type === 'wifi' && ip) wifiBaseUrl = ip;
            if (type === 'ble' && bleId) {
                // Try to reconnect to saved BLE device
                try {
                    bleDevice = await bleManager.connectToDevice(bleId);
                    await bleDevice.discoverAllServicesAndCharacteristics();
                    console.log('Reconnected to BLE device:', bleId);
                } catch (err) {
                    console.warn('BLE reconnect failed:', err);
                    currentConnection = 'none';
                }
            }
        }
    } catch (err) {
        console.warn('Failed to load saved connection:', err);
    }
};
init(); // run on import

// Save connection preference
const saveConnection = async (type: ConnectionType, ip?: string, bleId?: string) => {
    await AsyncStorage.setItem('robotConnection', JSON.stringify({ type, ip, bleId }));
    currentConnection = type;
};

// === GET ROBOT STATUS ===
export const getRobotStatus = async (): Promise<RobotStatus> => {
    // Try saved method first
    if (currentConnection === 'wifi') {
        try {
            const res = await axios.get(`${wifiBaseUrl}/status`, { timeout: 6000 });
            return {
                ...res.data,
                status: 'Online',
                connectionType: 'wifi',
            };
        } catch (err) {
            console.warn('Wi-Fi status fetch failed:', err);
        }
    }

    if (currentConnection === 'ble' && bleDevice) {
        try {
            // === C++ INTEGRATION POINT: Read BLE status characteristic ===
            // Replace with your real characteristic UUIDs
            const statusChar = await bleDevice.readCharacteristicForService(
                'YOUR_SERVICE_UUID',      // e.g. '0000180f-0000-1000-8000-00805f9b34fb' (battery service example)
                'YOUR_STATUS_CHAR_UUID'   // e.g. '00002a19-0000-1000-8000-00805f9b34fb' (battery level)
            );

            const data = atob(statusChar.value); // base64 decode
            const parsed = JSON.parse(data); // assuming robot sends JSON

            return {
                ...parsed,
                status: 'Online',
                connectionType: 'ble',
            };
        } catch (err) {
            console.warn('BLE status read failed:', err);
        }
    }

    // Fallback mock if both fail
    console.warn('No active connection - returning mock status');
    return {
        batteryLevel: 85,
        isCleaning: false,
        lastCleaned: new Date().toISOString(),
        errors: [],
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
    if (currentConnection === 'wifi') {
        const res = await axios.get(`${wifiBaseUrl}/schedule`);
        return res.data;
    } else if (currentConnection === 'ble' && bleDevice) {
        // === C++ INTEGRATION POINT: Read BLE schedule characteristic ===
        const char = await bleDevice.readCharacteristicForService(
            'YOUR_SERVICE_UUID',
            'YOUR_SCHEDULE_CHAR_UUID'
        );
        return JSON.parse(atob(char.value));
    }
    // Mock fallback
    return [
        { day: "Monday", time: "10:00 AM" },
        { day: "Wednesday", time: "2:00 PM" },
    ];
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
        console.log("Set schedule (mock)", entry);
    }
};

// === GET MAP DATA ===
export const getMap = async (): Promise<any> => {
    if (currentConnection === 'wifi') {
        const res = await axios.get(`${wifiBaseUrl}/map`);
        return res.data;
    } else if (currentConnection === 'ble' && bleDevice) {
        // === C++ INTEGRATION POINT: Read BLE map characteristic ===
        const char = await bleDevice.readCharacteristicForService(
            'YOUR_SERVICE_UUID',
            'YOUR_MAP_CHAR_UUID'
        );
        return JSON.parse(atob(char.value));
    }
    // Mock fallback
    return {
        zones: ["Living Room", "Kitchen"],
        obstacles: ["Chair", "Table"],
        path: ["Start", "Living Room", "Kitchen", "Dock"],
    };
};

// === MANUAL CONNECT FUNCTIONS (call from settings or onboarding) ===

export const connectWifi = async (ip: string): Promise<RobotStatus> => {
    wifiBaseUrl = ip.startsWith('http') ? ip : `http://${ip}`;
    await saveConnection('wifi', wifiBaseUrl);
    return await getRobotStatus();
};

export const connectBle = async (deviceId: string): Promise<RobotStatus> => {
    bleDevice = await bleManager.connectToDevice(deviceId);
    await bleDevice.discoverAllServicesAndCharacteristics();
    await saveConnection('ble', undefined, deviceId);
    return await getRobotStatus();
};

// Get current connection status
export const getConnectionStatus = () => ({
    type: currentConnection,
    isConnected: currentConnection !== 'none',
});