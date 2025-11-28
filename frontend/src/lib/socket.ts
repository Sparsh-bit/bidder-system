// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

import { SOCKET_URL } from '../utils/config';

// const SOCKET_URL = import.meta.env.VITE_API_WS_URL || 'http://127.0.0.1:5000'; // Now handled in config.ts

export const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket'],
  // Optional: adjust reconnection settings if needed
  reconnectionAttempts: 5,
});

export default socket;
