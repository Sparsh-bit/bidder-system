import { Capacitor } from '@capacitor/core';
import { Platform } from 'react-native';

// -----------------------------------------------------------------------------
// NETWORK CONFIGURATION
// -----------------------------------------------------------------------------
// IP Address of your laptop on the local network.
// REQUIRED for testing on physical Android devices.
const LAPTOP_IP = '192.168.0.102'; // Detected IP
const PORT = '8000';

// -----------------------------------------------------------------------------
// AUTOMATIC URL RESOLVER
// -----------------------------------------------------------------------------
export function getBaseURL() {
    // Default: web
    let url = `http://localhost:${PORT}`;

    if (Capacitor.isNativePlatform()) {
        // Check if running on Android Emulator or Physical Device
        // Note: There isn't a perfect way to detect emulator vs physical in JS only without native plugins,
        // but usually for local dev on physical device we want the LAPTOP_IP.
        // The user explicitly requested to support emulator (10.0.2.2) and physical (192.168.x.x).

        // Strategy: Default to LAPTOP_IP for physical device support as requested.
        // If you are on emulator, you might need to manually toggle this or use a specific build flag.
        // However, 10.0.2.2 is specific to the Android Emulator loopback.

        // For this specific request, we prioritize the physical device IP.
        url = `http://${LAPTOP_IP}:${PORT}`;

        // If you want to force emulator:
        // url = `http://10.0.2.2:${PORT}`;
    }

    console.log("USING API URL:", url);
    return url;
}

export const API_BASE_URL = getBaseURL();
export const SOCKET_URL = API_BASE_URL;
