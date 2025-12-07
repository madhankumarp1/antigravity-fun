'use client';

import { useEffect, useRef, useState } from 'react';
import { socket } from '@/lib/socket';
import SimplePeer from 'simple-peer';
import { Mic, MicOff, Video, VideoOff, Send, SkipForward, StopCircle, Flag, Filter, Monitor, Users } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import FilterModal from '@/components/FilterModal';
import ReportModal from '@/components/ReportModal';

export default function VideoChat() {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [messages, setMessages] = useState<{ text: string; sender: 'me' | 'stranger' }[]>([]);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState('Connecting to server...');
    const [userCount, setUserCount] = useState({ online: 0, waiting: 0 });
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [canSkip, setCanSkip] = useState(true);

    const myVideo = useRef<HTMLVideoElement>(null);
    const remoteVideo = useRef<HTMLVideoElement | null>(null);
    const connectionRef = useRef<SimplePeer.Instance | null>(null);
    const originalStream = useRef<MediaStream | null>(null);

    const initialized = useRef(false);

    // Initial Setup
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((currentStream) => {
                setStream(currentStream);
                originalStream.current = currentStream;
                if (myVideo.current) {
                    myVideo.current.srcObject = currentStream;
                }

                socket.connect();
                setStatus('Connecting to server...');
            })
            .catch((err) => {
                console.error('Error accessing media devices:', err);
                setStatus('Error accessing camera/microphone');
            });

        socket.on('connect', () => {
            console.log('✅ Connected to signaling server');
            setStatus('Looking for a stranger...');
            socket.emit('find_partner');
        });

        socket.on('connect_error', (err) => {
            console.error('❌ Socket connection error:', err);
            setStatus(`Connection error: ${err.message}. If you are on HTTPS, ensure server acts as WSS.`);
        });

        socket.on('user_count_update', (count: { online: number; waiting: number }) => {
            setUserCount(count);
        });

        socket.on('partner_found', (partnerId: string) => {
            console.log('🎯 Partner found! Partner ID:', partnerId);
            setStatus('Connected to stranger!');
            callUser(partnerId);
        });

        socket.on('call_made', ({ signal, from }: { signal: SimplePeer.SignalData; from: string }) => {
            console.log('📞 Incoming call from:', from);
            setStatus('Connected to stranger!');
            answerCall(signal, from);
        });

        socket.on('call_accepted', (signal: SimplePeer.SignalData) => {
            console.log('✅ Call accepted! Signaling...');
            if (connectionRef.current && !connectionRef.current.destroyed) {
                connectionRef.current.signal(signal);
            }
        });

        socket.on('message_received', (message: string) => {
            setMessages((prev) => [...prev, { text: message, sender: 'stranger' }]);
        });

        socket.on('partner_disconnected', () => {
            setRemoteStream(null);
            setMessages([]);
            setStatus('Stranger disconnected. Searching...');
            if (connectionRef.current) {
                connectionRef.current.destroy();
            }
            connectionRef.current = null;
            socket.emit('find_partner');
        });

        socket.on('report_submitted', () => {
            setStatus('Report submitted. Thank you!');
            setTimeout(() => setStatus('Looking for a stranger...'), 2000);
        });

        socket.on('banned', ({ until }: { until: number }) => {
            const minutes = Math.ceil((until - Date.now()) / 60000);
            setStatus(`You have been temporarily banned for ${minutes} minutes`);
        });

        return () => {
            socket.disconnect();
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (originalStream.current) {
                originalStream.current.getTracks().forEach(track => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const callUser = (id: string) => {
        const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            stream: originalStream.current!,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                ]
            }
        });

        peer.on('signal', (data: SimplePeer.SignalData) => {
            socket.emit('call_user', { userToCall: id, signalData: data, from: socket.id });
        });

        peer.on('stream', (currentStream: MediaStream) => {
            console.log('🎥 Received remote stream (initiator)');
            setRemoteStream(currentStream);
        });

        connectionRef.current = peer;
    };

    const answerCall = (signal: SimplePeer.SignalData, from: string) => {
        const peer = new SimplePeer({
            initiator: false,
            trickle: false,
            stream: originalStream.current!,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                ]
            }
        });

        peer.on('signal', (data: SimplePeer.SignalData) => {
            socket.emit('answer_call', { signal: data, to: from });
        });

        peer.on('stream', (currentStream: MediaStream) => {
            console.log('🎥 Received remote stream (answerer)');
            setRemoteStream(currentStream);
        });

        peer.signal(signal);
        connectionRef.current = peer;
    };

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            setMessages((prev) => [...prev, { text: input, sender: 'me' }]);
            socket.emit('send_message', input);
            setInput('');
        }
    };

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
            setIsVideoOff(!isVideoOff);
        }
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            if (originalStream.current && myVideo.current) {
                setStream(originalStream.current);
                myVideo.current.srcObject = originalStream.current;
                if (connectionRef.current) {
                    const videoTrack = originalStream.current.getVideoTracks()[0];
                    connectionRef.current.replaceTrack(
                        stream!.getVideoTracks()[0],
                        videoTrack,
                        stream!
                    );
                }
            }
            setIsScreenSharing(false);
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const audioTrack = stream?.getAudioTracks()[0];
                if (audioTrack) {
                    screenStream.addTrack(audioTrack);
                }
                setStream(screenStream);
                if (myVideo.current) {
                    myVideo.current.srcObject = screenStream;
                }
                if (connectionRef.current && originalStream.current) {
                    const videoTrack = screenStream.getVideoTracks()[0];
                    connectionRef.current.replaceTrack(
                        originalStream.current.getVideoTracks()[0],
                        videoTrack,
                        screenStream
                    );
                }
                setIsScreenSharing(true);
                screenStream.getVideoTracks()[0].onended = () => {
                    toggleScreenShare();
                };
            } catch (err) {
                console.error('Error sharing screen:', err);
            }
        }
    };

    const handleSkip = () => {
        if (!canSkip) return;
        if (connectionRef.current) {
            connectionRef.current.destroy();
        }
        setRemoteStream(null);
        setMessages([]);
        setStatus('Skipped. Searching...');
        socket.emit('find_partner');
        setCanSkip(false);
        setTimeout(() => setCanSkip(true), 3000);
    };

    const handleApplyFilters = (preferences: { gender: string; interests: string[] }) => {
        socket.emit('set_preferences', preferences);
        setStatus('Filters applied. Searching...');
        if (connectionRef.current) {
            connectionRef.current.destroy();
            setRemoteStream(null);
            setMessages([]);
        }
        socket.emit('find_partner');
    };

    const handleReport = (reason: string) => {
        socket.emit('report_user', { reason });
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="flex flex-col h-screen bg-white text-[#333] font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white z-50">
                <div className="flex items-center gap-2">
                    <Link href="/" className="text-3xl font-bold tracking-tight select-none">
                        <span className="text-blue-500">antigravity</span>
                        <span className="text-orange-500 transform rotate-12 inline-block">.fun</span>
                    </Link>
                    <span className="text-xs text-gray-400 mt-2 rotate-[-5deg] font-handwriting">talk to strangers!</span>
                </div>

                <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                    {/* Online Counters */}
                    <div className="hidden md:flex gap-4">
                        <span title="Users Online">
                            <strong className="text-gray-700">{userCount.online}</strong> online
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden">

                {/* Left Side: Video & Controls */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#f0f0f0] p-2 md:p-4 gap-2 md:gap-4 relative">

                    {/* Primary Video Container */}
                    <div className="flex-1 relative bg-gray-100 rounded-lg overflow-hidden border border-gray-300 shadow-sm flex items-center justify-center group">
                        {/* Local Video Label */}
                        {stream && (
                            <div className="absolute top-4 left-4 z-10 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                                You
                            </div>
                        )}
                        {/* Local Video (Main) */}
                        <video
                            playsInline
                            autoPlay
                            muted
                            ref={myVideo}
                            className={`w-full h-full object-contain bg-black ${isVideoOff ? 'hidden' : ''}`}
                        />
                        {isVideoOff && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white text-lg">
                                Camera Off
                            </div>
                        )}



                        {/* Remote Video (PiP Style) */}
                        <AnimatePresence mode="wait">
                            {remoteStream ? (
                                <motion.div
                                    key="remote-pip"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute bottom-4 right-4 w-32 md:w-48 aspect-video bg-black rounded border-2 border-blue-400 overflow-hidden shadow-lg z-20 hover:scale-105 transition-transform"
                                >
                                    <div className="absolute bottom-2 right-2 z-30 bg-black/50 text-white px-2 py-0.5 rounded text-xs font-medium">
                                        Stranger
                                    </div>
                                    <video
                                        playsInline
                                        autoPlay
                                        muted={false}
                                        ref={(el) => {
                                            remoteVideo.current = el;
                                            if (el && remoteStream) {
                                                if (el.srcObject !== remoteStream) {
                                                    console.log('🔄 Setting remote srcObject in PiP');
                                                    el.srcObject = remoteStream;
                                                    el.play().catch(e => console.error('Auto-play error:', e));
                                                }
                                            }
                                        }}
                                        className="w-full h-full object-cover"
                                    />
                                </motion.div>
                            ) : (
                                <div className="absolute bottom-4 right-4 w-32 md:w-48 aspect-video bg-gray-700 rounded border-2 border-gray-500 overflow-hidden shadow-lg z-20 flex flex-col items-center justify-center">
                                    <div className="text-gray-400 text-xs text-center px-2">
                                        <div className="animate-pulse mb-1">⏳</div>
                                        <div>Waiting...</div>
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* Report Flag (Overlay) */}
                        {remoteStream && (
                            <button
                                onClick={() => setShowReportModal(true)}
                                className="absolute top-2 right-2 p-2 bg-black/50 text-white/70 hover:text-red-500 rounded hover:bg-black/70 transition-colors"
                                title="Report User"
                            >
                                <Flag size={16} />
                            </button>
                        )}
                    </div>

                    {/* Control Bar (Omegle Style) */}
                    <div className="h-16 flex gap-0.5 md:gap-4 shrink-0">
                        {/* Stop / New Chat Button */}
                        <button
                            onClick={handleSkip}
                            disabled={!canSkip}
                            className={`flex-1 md:flex-none md:w-40 flex flex-col items-center justify-center rounded shadow-sm transition-all active:scale-[0.98]
                                ${canSkip
                                    ? 'bg-[#80bfff] hover:bg-[#66b3ff] text-white' // Blue "New" style
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            <span className="font-bold text-lg drop-shadow-sm uppercase tracking-wide">
                                {remoteStream ? 'Stop' : 'New'}
                            </span>
                            <span className="text-[10px] uppercase font-semibold opacity-80">
                                {canSkip ? 'Press Esc' : 'Wait...'}
                            </span>
                        </button>

                        {/* Middle Controls (Orange) */}
                        <div className="flex-1 flex bg-orange-100 rounded border border-orange-200 p-1 gap-1">
                            <button
                                onClick={toggleMute}
                                className={`flex-1 flex flex-col items-center justify-center rounded text-orange-800 hover:bg-orange-200 transition-colors ${isMuted ? 'text-red-600 bg-red-50' : ''}`}
                            >
                                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                                <span className="text-[10px] font-bold mt-1">Mic</span>
                            </button>

                            <button
                                onClick={toggleVideo}
                                className={`flex-1 flex flex-col items-center justify-center rounded text-orange-800 hover:bg-orange-200 transition-colors ${isVideoOff ? 'text-red-600 bg-red-50' : ''}`}
                            >
                                {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                                <span className="text-[10px] font-bold mt-1">Cam</span>
                            </button>

                            <button
                                onClick={() => setShowFilterModal(true)}
                                className="hidden md:flex flex-1 flex-col items-center justify-center rounded text-orange-800 hover:bg-orange-200 transition-colors"
                            >
                                <Filter size={20} />
                                <span className="text-[10px] font-bold mt-1">Filters</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Chat (Omegle Style) */}
                <div className="w-full md:w-96 bg-white border-l border-gray-200 flex flex-col">
                    {/* Messages Area - Simple Text */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm md:text-base">
                        <div className="text-gray-400 text-center text-xs mb-4">
                            You're now chatting with a random stranger. Say hi!
                        </div>

                        {messages.map((msg, idx) => (
                            <div key={idx} className={`leading-relaxed break-words ${msg.sender === 'me' ? 'text-blue-600' : 'text-red-600'}`}>
                                <span className="font-bold uppercase tracking-wider mr-1">
                                    {msg.sender === 'me' ? 'You:' : 'Stranger:'}
                                </span>
                                <span className="text-gray-800">
                                    {msg.text}
                                </span>
                            </div>
                        ))}

                        {!remoteStream && status.includes('Waiting') && (
                            <div className="text-gray-400 italic text-sm animate-pulse mt-4">
                                Stranger is typing...
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 bg-gray-50 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message..."
                            disabled={!remoteStream}
                            className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 disabled:opacity-50 disabled:bg-gray-100 placeholder-gray-400 text-gray-800 shadow-sm"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || !remoteStream}
                            className={`px-4 py-2 font-bold rounded text-sm uppercase tracking-wide transition-all shadow-sm
                                ${input.trim() && remoteStream
                                    ? 'bg-white text-blue-600 border border-blue-200 hover:border-blue-400'
                                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                                }`}
                        >
                            Send
                        </button>
                    </form>
                </div>

            </main>

            {/* Modals */}
            <FilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                onApply={handleApplyFilters}
            />
            <ReportModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                onReport={handleReport}
            />
        </div>
    );
}
