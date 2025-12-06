import { io } from 'socket.io-client';

// Dynamically determine socket URL based on current hostname
const getSocketUrl = (): string => {
    if (process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL) {
        return process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL;
    }

    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // precise logic for production vs local
        if (hostname.includes('vercel.app')) {
            // Your deployed Render server
            return 'https://antigravity-fun-1.onrender.com';
        }

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Local development: Frontend (3000) -> Backend (3001)
            const protocol = window.location.protocol;
            return `${protocol}//${hostname}:3001`;
        }
    }

    // Default fallback
    return 'https://antigravity-fun-1.onrender.com';
};

export const socket = io(getSocketUrl(), {
    autoConnect: false,
});
