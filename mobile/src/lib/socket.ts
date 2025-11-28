import io from 'socket.io-client';

// Use 10.0.2.2 for Android Emulator to access localhost of the host machine
// For physical device, use your machine's LAN IP (e.g., http://192.168.1.x:5000)
const SOCKET_URL = 'http://10.0.2.2:5000';

const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
});

export default socket;
