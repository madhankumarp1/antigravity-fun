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
        <div className="min-h-screen flex flex-col items-center bg-[#FFFBEF] text-[#444] font-sans">
            {/* Header */}
            <header className="w-full max-w-6xl mx-auto p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-blue-400 to-cyan-400 p-2 rounded-lg transform -rotate-6">
                        <span className="text-white font-bold text-2xl tracking-tighter">af</span>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-800">
                        <span className="text-blue-500">antigravity</span>
                        <span className="text-orange-500">.fun</span>
                    </h1>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    {mounted && (
                        <span className="text-green-600 bg-green-100 px-3 py-1 rounded-full animate-pulse">
                            {userCount.online.toLocaleString()} + Online
                        </span>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full max-w-5xl mx-auto px-4 py-12 flex flex-col md:flex-row items-start gap-12">

                {/* Left Side: Illustration */}
                <div className="flex-1 space-y-8 mt-8 hidden md:block">
                    <div className="relative">
                        <div className="absolute -top-10 -left-10 w-40 h-40 bg-orange-200 rounded-full blur-3xl opacity-50"></div>
                        <div className="absolute top-20 right-10 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-50"></div>
                        <h2 className="text-5xl font-extrabold text-[#333] leading-tight relative z-10">
                            Talk to <br />
                            <span className="text-blue-500">strangers</span>,<br />
                            make <span className="text-orange-500">friends</span>!
                        </h2>
                    </div>
                    <p className="text-xl text-gray-600 max-w-md leading-relaxed">
                        Antigravity Fun is a great way to meet new friends. When you use Antigravity Fun, we pick someone else at random and let you talk one-on-one.
                    </p>
                </div>

                {/* Right Side: Action Box */}
                <div className="flex-1 w-full bg-white rounded-3xl shadow-xl p-8 border border-orange-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-bl-full -mr-16 -mt-16 opacity-50"></div>

                    <div className="space-y-8 relative z-10">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Start Chatting:</h3>
                            <p className="text-gray-500 text-sm">Pick your preferred way to connect</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-400 transition-all group cursor-not-allowed opacity-60" title="Coming soon">
                                <span className="p-3 bg-white rounded-full shadow-sm text-orange-500 group-hover:scale-110 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                </span>
                                <span className="font-bold text-gray-700">Text</span>
                            </button>

                            <Link href="/video" className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all group shadow-sm hover:shadow-md">
                                <span className="p-3 bg-white rounded-full shadow-sm text-blue-500 group-hover:scale-110 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                </span>
                                <span className="font-bold text-blue-700">Video</span>
                            </Link>
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <label className="block text-sm font-semibold text-gray-600 mb-3">Add your interests (optional)</label>
                            <input
                                type="text"
                                placeholder="TikTok, Anime, Movies..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-gray-50"
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-auto py-8 text-center text-gray-400 text-sm">
                <p>© 2024 Antigravity Fun • <a href="#" className="hover:text-blue-500">Terms</a> • <a href="#" className="hover:text-blue-500">Privacy</a></p>
            </footer>
        </div>
    );
};
