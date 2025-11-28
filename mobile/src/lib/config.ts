import { Capacitor } from '@capacitor/core';
import { Platform } from 'react-native';

// -----------------------------------------------------------------------------
// NETWORK CONFIGURATION
// -----------------------------------------------------------------------------
// IP Address of your laptop on the local network.
// REQUIRED for testing on physical Android devices.
const LAPTOP_IP = '192.168.0.101'; // Detected IP
const PORT = '8000';

// -----------------------------------------------------------------------------
// AUTOMATIC URL RESOLVER
// -----------------------------------------------------------------------------
export function getBaseURL() {
    // Default: web
    let url = `http://localhost:${PORT}`;

    if (Capacitor.isNativePlatform()) {
        // Android Emulator:
        // url = `http://10.0.2.2:${PORT}`;

        // Physical Device (Prioritized as per user request):
        url = `http://${LAPTOP_IP}:${PORT}`;
    }

    console.log("USING API URL:", url);
    return url;
}

export const API_BASE_URL = getBaseURL();
export const SOCKET_URL = API_BASE_URL;
