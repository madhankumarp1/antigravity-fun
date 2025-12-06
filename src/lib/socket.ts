import { io } from 'socket.io-client';

// Dynamically determine socket URL based on current hostname
const getSocketUrl = (): string => {
    if (process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL) {
        return process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL;
    }

    // In browser context, use current hostname with port 3001
    if (typeof window !== 'undefined') {
        const isSecure = window.location.protocol === 'https:';
        const protocol = isSecure ? 'https:' : 'http:';
        const hostname = window.location.hostname;
        // If we are on HTTPS, we MUST use a secure backend. 
        // Note: Connecting to port 3001 on HTTPS might fail if the backend doesn't support SSL.
        // We assume the user has set up a reverse proxy or is running locally.
        return `${protocol}//${hostname}:3001`;
    }

    // Fallback for server-side rendering
    return 'http://localhost:3001';
};

export const socket = io(getSocketUrl(), {
    autoConnect: false,
});
