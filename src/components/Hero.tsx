'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';

export default function Hero() {
    const [userCount, setUserCount] = useState({ online: 0, waiting: 0 });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        socket.connect();

        socket.on('user_count_update', (count: { online: number; waiting: number }) => {
            setUserCount(count);
        });

        return () => {
            socket.off('user_count_update');
        };
    }, []);

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-40 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-500 opacity-40 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-40 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
                <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-gradient-to-r from-green-400 to-emerald-500 opacity-30 rounded-full blur-3xl animate-blob animation-delay-6000"></div>
            </div>

            {/* Content */}
                </Link>
                <div className="mt-12 text-gray-200 text-sm backdrop-blur-sm bg-white/5 rounded-full px-6 py-3 inline-block border border-white/10">
                    <p>✨ No registration • 🔒 Anonymous • 🌍 Global • 🎨 Colorful</p>
                </div>
            </div >

        {/* Glassmorphism Cards */ }
        < div className = "absolute bottom-8 right-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-white/30 hidden lg:block shadow-xl" >
                <p className="text-white font-semibold text-lg">🎥 Live Now</p>
                <p className="text-gray-200 text-sm">Join thousands chatting</p>
            </div >

        <div className="absolute top-8 left-8 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-lg rounded-2xl p-6 border border-white/30 hidden lg:block shadow-xl">
            <p className="text-white font-semibold text-lg">🌈 Vibrant</p>
            <p className="text-gray-200 text-sm">Colorful experience</p>
        </div>
        </div >
    );
}
