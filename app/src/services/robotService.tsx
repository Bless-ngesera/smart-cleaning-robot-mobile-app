// src/services/robotService.tsx

export type RobotStatus = {
    batteryLevel: number;
    isCleaning: boolean;
    lastCleaned: string;
    errors: string[];
};

export type ScheduleEntry = {
    day: string;
    time: string;
};

/**
 * Fetch robot status
 */
export const getRobotStatus = async (): Promise<RobotStatus> => {
    // C++ BRIDGE: Replace mock with native call to fetch live status.
    // Android (JNI): RobotBridge.getStatus()
    // iOS (Obj-C++): [RobotBridge status]
    return {
        batteryLevel: 85,
        isCleaning: false,
        lastCleaned: new Date().toISOString(),
        errors: [],
    };
};

/**
 * Start cleaning
 */
export const startCleaning = async (): Promise<void> => {
    // C++ BRIDGE: Send "start" command to robot.
    // Android (JNI): RobotBridge.startCleaning()
    // iOS (Obj-C++): [RobotBridge startCleaning]
    console.log("Start cleaning (mock)");
};

/**
 * Stop cleaning
 */
export const stopCleaning = async (): Promise<void> => {
    // C++ BRIDGE: Send "stop" command to robot.
    // Android (JNI): RobotBridge.stopCleaning()
    // iOS (Obj-C++): [RobotBridge stopCleaning]
    console.log("Stop cleaning (mock)");
};

/**
 * Dock robot
 */
export const dockRobot = async (): Promise<void> => {
    // C++ BRIDGE: Command robot to return to dock.
    // Android (JNI): RobotBridge.returnToDock()
    // iOS (Obj-C++): [RobotBridge returnToDock]
    console.log("Return to dock (mock)");
};

/**
 * Get schedule
 */
export const getSchedule = async (): Promise<ScheduleEntry[]> => {
    // C++ BRIDGE: Fetch schedule from robot.
    // Android (JNI): RobotBridge.getSchedule()
    // iOS (Obj-C++): [RobotBridge schedule]
    return [
        { day: "Monday", time: "10:00 AM" },
        { day: "Wednesday", time: "2:00 PM" },
    ];
};

/**
 * Set schedule
 */
export const setSchedule = async (entry: ScheduleEntry): Promise<void> => {
    // C++ BRIDGE: Persist schedule to robot or edge device.
    // Android (JNI): RobotBridge.setSchedule(entry)
    // iOS (Obj-C++): [RobotBridge setSchedule:entry]
    console.log("Set schedule (mock)", entry);
};

/**
 * Get map data
 */
export const getMap = async (): Promise<any> => {
    // C++ BRIDGE: Fetch robot’s live map data.
    // Android (JNI): RobotBridge.getMap()
    // iOS (Obj-C++): [RobotBridge map]
    return {
        zones: ["Living Room", "Kitchen"],
        obstacles: ["Chair", "Table"],
        path: ["Start", "Living Room", "Kitchen", "Dock"],
    };
};
