import { io } from 'socket.io-client';

// Dynamically determine socket URL based on current hostname
const getSocketUrl = (): string => {
    if (process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL) {
        return process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL;
    }

    // In browser context, use current hostname with port 3001
    if (typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const hostname = window.location.hostname;
        return `${protocol}//${hostname}:3001`;
    }

    // Fallback for server-side rendering
    return 'http://localhost:3001';
};

export const socket = io(getSocketUrl(), {
    autoConnect: false,
});
