import { io } from 'socket.io-client';

// Replace with your actual signaling server URL in production
const SOCKET_URL = process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
    autoConnect: false,
});
