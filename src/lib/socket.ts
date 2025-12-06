import { io } from 'socket.io-client';

// Dynamically determine socket URL based on current hostname
const getSocketUrl = (): string => {
    if (process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL) {
        return process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL;
    }

    // Since we are now serving the socket on the same server as the Next.js app,
    // we can connect to the current origin (relative path).
    // Socket.io client will automatically use the current window location.
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    // Fallback for server-side rendering
    return 'http://localhost:3000';
};

export const socket = io(getSocketUrl(), {
    autoConnect: false,
});
