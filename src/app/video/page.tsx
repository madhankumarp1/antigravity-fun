'use client';

import { useEffect, useRef, useState } from 'react';
import { socket } from '@/lib/socket';
import SimplePeer from 'simple-peer';
import { Mic, MicOff, Video, VideoOff, Send, SkipForward, StopCircle, Flag, Filter, Monitor, Users } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import FilterModal from '@/components/FilterModal';
import ReportModal from '@/components/ReportModal';

// Debug Component
function DebugStats({ videoRef, stream }: { videoRef: React.RefObject<HTMLVideoElement | null>; stream: MediaStream }) {
    const [stats, setStats] = useState({ width: 0, height: 0, currentTime: 0, paused: true, readyState: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            if (videoRef.current) {
                setStats({
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight,
                    currentTime: videoRef.current.currentTime,
                    paused: videoRef.current.paused,
                    readyState: videoRef.current.readyState
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [videoRef]);

    return (
        <div className="space-y-1">
            <p>Resolution: {stats.width}x{stats.height}</p>
            <p>Time: {stats.currentTime.toFixed(1)}s</p>
            <p>Paused: {stats.paused ? 'YES' : 'NO'}</p>
            <p>State: {stats.readyState} (4=HAVE_ENOUGH_DATA)</p>
            <p>Stream Active: {stream.active ? 'YES' : 'NO'}</p>
            <p>Tracks: {stream.getTracks().length}</p>
        </div>
    );
}

export default function VideoChat() {
    // ... existing component ...

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
    const remoteVideo = useRef<HTMLVideoElement>(null);
    const connectionRef = useRef<SimplePeer.Instance | null>(null);
    const originalStream = useRef<MediaStream | null>(null);

    const initialized = useRef(false);

    useEffect(() => {
        if (remoteVideo.current && remoteStream) {
            console.log('🎥 Setting remote video srcObject via useEffect');
            console.log('📊 Remote stream details:', {
                id: remoteStream.id,
                active: remoteStream.active,
                videoTracks: remoteStream.getVideoTracks().length,
                audioTracks: remoteStream.getAudioTracks().length
            });

            // Log track details
            remoteStream.getVideoTracks().forEach((track, index) => {
                console.log(`🎬 Video Track ${index}:`, {
                    id: track.id,
                    label: track.label,
                    enabled: track.enabled,
                    muted: track.muted,
                    readyState: track.readyState
                });
            });

            remoteStream.getAudioTracks().forEach((track, index) => {
                console.log(`🔊 Audio Track ${index}:`, {
                    id: track.id,
                    label: track.label,
                    enabled: track.enabled,
                    muted: track.muted,
                    readyState: track.readyState
                });
            });

            remoteVideo.current.srcObject = remoteStream;

            // Enhanced play handling with retry logic
            const playVideo = async () => {
                const videoEl = remoteVideo.current;
                if (!videoEl) return;

                console.log('🎬 Attempting to play remote video. srcObject:', !!videoEl.srcObject);
                console.log('🎬 Video Element State:', {
                    paused: videoEl.paused,
                    muted: videoEl.muted,
                    readyState: videoEl.readyState,
                    networkState: videoEl.networkState
                });

                try {
                    // Force playback
                    videoEl.srcObject = remoteStream;
                    videoEl.muted = true; // Always mute first to allow autoplay
                    await videoEl.play();
                    console.log('✅ Remote video playing successfully');

                    // Unmute after successful play if desired
                    // setTimeout(() => { if (videoEl) videoEl.muted = false; }, 500); 
                } catch (error) {
                    console.error('❌ Play failed:', error);
                    // Interactive retry fallback
                    setStatus('Tap to play video');
                }
            };

            playVideo();

            playVideo();
        }
    }, [remoteStream]);

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
            // Only disconnect if we are unmounting for real (not just strict mode flicker)
            // But for now, standard cleanup is safer to avoid leaks
            socket.disconnect();
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (originalStream.current) {
                originalStream.current.getTracks().forEach(track => track.stop());
            }
        };
                ]
    }
        });

peer.on('signal', (data: SimplePeer.SignalData) => {
    socket.emit('call_user', { userToCall: id, signalData: data, from: socket.id });
});

peer.on('stream', (currentStream: MediaStream) => {
    console.log('🎥 Received remote stream (initiator)!', {
        id: currentStream.id,
        active: currentStream.active,
        videoTracks: currentStream.getVideoTracks().length,
        audioTracks: currentStream.getAudioTracks().length
    });

    // Log all tracks
    currentStream.getTracks().forEach((track, index) => {
        console.log(`🎯 Track ${index} (${track.kind}):`, {
            id: track.id,
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState
        });
    });

    setRemoteStream(currentStream);
    if (remoteVideo.current) {
        remoteVideo.current.srcObject = currentStream;
        console.log('✅ Remote video element updated (initiator)');
    }
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
        console.log('🎥 Received remote stream (answerer)!', {
            id: currentStream.id,
            active: currentStream.active,
            videoTracks: currentStream.getVideoTracks().length,
            audioTracks: currentStream.getAudioTracks().length
        });

        // Log all tracks
        currentStream.getTracks().forEach((track, index) => {
            console.log(`🎯 Track ${index} (${track.kind}):`, {
                id: track.id,
                label: track.label,
                enabled: track.enabled,
                readyState: track.readyState
            });
        });

        setRemoteStream(currentStream);
        if (remoteVideo.current) {
            remoteVideo.current.srcObject = currentStream;
            console.log('✅ Remote video element updated (answerer)');
        }
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
        // Stop screen sharing, return to camera
        if (originalStream.current && myVideo.current) {
            setStream(originalStream.current);
            myVideo.current.srcObject = originalStream.current;

            // Replace track in peer connection
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
        // Start screen sharing
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

            // Replace track in peer connection
            if (connectionRef.current && originalStream.current) {
                const videoTrack = screenStream.getVideoTracks()[0];
                connectionRef.current.replaceTrack(
                    originalStream.current.getVideoTracks()[0],
                    videoTrack,
                    screenStream
                );
            }

            setIsScreenSharing(true);

            // Handle screen share stop
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

    // Cooldown
    setCanSkip(false);
    setTimeout(() => setCanSkip(true), 3000);
};

const handleApplyFilters = (preferences: { gender: string; interests: string[] }) => {
    socket.emit('set_preferences', preferences);
    setStatus('Filters applied. Searching...');

    // Disconnect current partner if any
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 text-white">
        {/* Header */}
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-gradient-to-r from-cyan-900/50 via-purple-900/50 to-pink-900/50 border-b border-purple-500/30 backdrop-blur-sm z-50">
            <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 drop-shadow-lg mb-2 md:mb-0">
                🌈 Antigravity Fun
            </Link>
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 text-sm bg-white/5 rounded-full px-4 py-2 border border-white/10">
                    <Users className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-bold">{userCount.online}</span>
                    <span className="text-gray-300">online</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-200">
                    <span className={`w-3 h-3 rounded-full ${status.includes('Connected') ? 'bg-gradient-to-r from-green-400 to-emerald-400 shadow-lg shadow-green-500/50' : 'bg-gradient-to-r from-yellow-400 to-orange-400 animate-pulse shadow-lg shadow-yellow-500/50'}`}></span>
                    <span className="font-semibold">{status}</span>
                </div>
            </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
            {/* Video Area */}
            <div className="flex-1 flex flex-col relative bg-gradient-to-br from-gray-900 via-purple-900/30 to-pink-900/30">
                <div className="flex-1 flex items-center justify-center relative">
                    {/* Remote Video */}
                    {/* Remote Video - Simplified for Debugging */}
                    <div className="relative w-full h-full flex items-center justify-center">
                        {remoteStream ? (
                            <>
                                <video
                                    key="remote-video-raw"
                                    className="w-full h-full object-contain rounded-lg bg-black/20 border-2 border-red-500"
                                    playsInline
                                    autoPlay
                                    muted
                                    ref={(el) => {
                                        remoteVideo.current = el;
                                        if (el && remoteStream) {
                                            if (el.srcObject !== remoteStream) {
                                                console.log('🔄 Setting srcObject', remoteStream.id);
                                                el.srcObject = remoteStream;
                                                el.play().catch(e => console.error('Auto-play error:', e));
                                            }
                                        }
                                    }}
                                    onLoadedMetadata={() => console.log('🎞️ Metadata loaded. Resolution:', remoteVideo.current?.videoWidth, 'x', remoteVideo.current?.videoHeight)}
                                    onResize={() => console.log('🎞️ Video resized:', remoteVideo.current?.videoWidth, 'x', remoteVideo.current?.videoHeight)}
                                />
                                {/* Advanced Debug Overlay */}
                                <div className="absolute top-2 left-2 bg-black/70 text-green-400 text-xs p-2 rounded z-50 font-mono whitespace-pre pointer-events-none">
                                    <DebugStats videoRef={remoteVideo} stream={remoteStream} />
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-300">
                                <div className="animate-spin rounded-full h-20 w-20 border-4 border-transparent border-t-cyan-400 border-r-purple-400 border-b-pink-400 mb-4"></div>
                                <p className="animate-pulse text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">Waiting for partner...</p>
                            </div>
                        )}
                    </div>

                    {/* Local Video (Picture-in-Picture) */}
                    <motion.div
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        drag
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        className="absolute bottom-4 right-4 w-48 h-36 bg-gradient-to-br from-cyan-900/80 to-purple-900/80 rounded-xl overflow-hidden border-2 border-purple-400/50 shadow-2xl shadow-purple-500/30 cursor-move backdrop-blur-sm"
                    >
                        <video playsInline autoPlay muted ref={myVideo} className="w-full h-full object-cover" />
                        {isMuted && <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-900/70 to-pink-900/70 backdrop-blur-sm"><MicOff className="w-6 h-6 text-red-300" /></div>}
                        {isScreenSharing && <div className="absolute top-2 left-2 bg-blue-500/80 rounded px-2 py-1 text-xs font-bold">Sharing</div>}
                    </motion.div>

                    {/* Filter Button */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowFilterModal(true)}
                        className="absolute top-4 left-4 p-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/30 hover:from-purple-700 hover:to-pink-700 transition-all"
                    >
                        <Filter className="w-5 h-5" />
                    </motion.button>

                    {/* Report Button */}
                    {remoteStream && (
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowReportModal(true)}
                            className="absolute top-4 right-4 p-3 rounded-full bg-gradient-to-r from-red-600 to-orange-600 shadow-lg shadow-red-500/30 hover:from-red-700 hover:to-orange-700 transition-all"
                        >
                            <Flag className="w-5 h-5" />
                        </motion.button>
                    )}
                </div>

                {/* Controls */}
                <div className="h-24 bg-gradient-to-r from-gray-900/90 via-purple-900/50 to-pink-900/50 border-t border-purple-500/30 flex items-center justify-center gap-4 backdrop-blur-md">
                    <motion.button whileHover={{ scale: 1.15, rotate: 5 }} whileTap={{ scale: 0.9 }} onClick={toggleMute} className={`p-4 rounded-full ${isMuted ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-lg shadow-red-500/50' : 'bg-gradient-to-r from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/50'} transition-all duration-300`}>
                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.15, rotate: -5 }} whileTap={{ scale: 0.9 }} onClick={toggleVideo} className={`p-4 rounded-full ${isVideoOff ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-lg shadow-red-500/50' : 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/50'} transition-all duration-300`}>
                        {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={toggleScreenShare} className={`p-4 rounded-full ${isScreenSharing ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/50' : 'bg-gradient-to-r from-gray-700 to-gray-600 shadow-lg'} transition-all duration-300`}>
                        <Monitor className="w-6 h-6" />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSkip}
                        disabled={!canSkip}
                        className={`px-8 py-4 rounded-full font-bold flex items-center gap-2 transition-all duration-300 shadow-2xl ${canSkip ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 shadow-orange-500/40' : 'bg-gray-700 opacity-50 cursor-not-allowed'}`}
                    >
                        <SkipForward className="w-5 h-5" /> Skip
                    </motion.button>
                    <Link href="/">
                        <motion.div whileHover={{ scale: 1.15, rotate: 180 }} whileTap={{ scale: 0.9 }} className="p-4 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 transition-all duration-300 shadow-lg shadow-red-500/50">
                            <StopCircle className="w-6 h-6" />
                        </motion.div>
                    </Link>
                </div>
            </div>

            {/* Chat Area */}
            <div className="w-80 bg-gradient-to-br from-gray-900/95 via-purple-900/40 to-pink-900/40 border-l border-purple-500/30 flex flex-col hidden md:flex backdrop-blur-sm">
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-lg ${msg.sender === 'me' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 rounded-br-none shadow-cyan-500/30' : 'bg-gradient-to-r from-purple-700 to-pink-700 rounded-bl-none shadow-purple-500/30'}`}>
                                    {msg.text}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                <form onSubmit={sendMessage} className="p-4 bg-gradient-to-r from-gray-900/90 via-purple-900/50 to-pink-900/50 border-t border-purple-500/30 flex gap-2 backdrop-blur-md">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-gradient-to-r from-gray-800 to-purple-900/50 border border-purple-500/30 rounded-full px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none transition-all focus:scale-[1.02] text-white placeholder-gray-400"
                    />
                    <motion.button whileHover={{ scale: 1.15, rotate: 15 }} whileTap={{ scale: 0.9 }} type="submit" className="p-3 rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg shadow-purple-500/50">
                        <Send className="w-5 h-5" />
                    </motion.button>
                </form>
            </div>
        </div>

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
