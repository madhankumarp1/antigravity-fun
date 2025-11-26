import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReport: (reason: string) => void;
}

const REPORT_REASONS = [
    { id: 'inappropriate', label: '🚫 Inappropriate Content', description: 'Nudity, sexual content, or violence' },
    { id: 'harassment', label: '😠 Harassment', description: 'Bullying, threats, or hate speech' },
    { id: 'spam', label: '📧 Spam', description: 'Advertising or repetitive messages' },
    { id: 'underage', label: '👶 Underage User', description: 'Appears to be under 18' },
    { id: 'other', label: '⚠️ Other', description: 'Other concerning behavior' },
];

export default function ReportModal({ isOpen, onClose, onReport }: ReportModalProps) {
    const [selectedReason, setSelectedReason] = useState<string>('');

    const handleReport = () => {
        if (selectedReason) {
            onReport(selectedReason);
            setSelectedReason('');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gradient-to-br from-gray-900 via-red-900/30 to-orange-900/30 rounded-2xl p-6 max-w-md w-full border border-red-500/30 shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-red-500/20">
                                <Flag className="w-6 h-6 text-red-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                Report User
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Warning */}
                    <div className="mb-6 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-200">
                            False reports may result in your account being restricted. Please only report genuine violations.
                        </p>
                    </div>

                    {/* Reason Selection */}
                    <div className="mb-6 space-y-2">
                        <label className="block text-sm font-semibold mb-3 text-gray-200">
                            Select a reason:
                        </label>
                        {REPORT_REASONS.map((reason) => (
                            <button
                                key={reason.id}
                                onClick={() => setSelectedReason(reason.id)}
                                className={`w-full text-left p-4 rounded-xl transition-all ${selectedReason === reason.id
                                        ? 'bg-gradient-to-r from-red-600 to-orange-600 shadow-lg shadow-red-500/30 border-2 border-red-400'
                                        : 'bg-gray-800/50 hover:bg-gray-700/50 border-2 border-transparent'
                                    }`}
                            >
                                <div className="font-medium mb-1">{reason.label}</div>
                                <div className="text-sm text-gray-400">{reason.description}</div>
                            </button>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleReport}
                            disabled={!selectedReason}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${selectedReason
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg shadow-red-500/30'
                                    : 'bg-gray-700/50 cursor-not-allowed opacity-50'
                                }`}
                        >
                            Submit Report
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
