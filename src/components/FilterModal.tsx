import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, Users, Heart, Gamepad2, Music, Film, Book } from 'lucide-react';
import { useState } from 'react';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (preferences: { gender: string; interests: string[] }) => void;
}

const INTERESTS = [
    { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'movies', label: 'Movies', icon: Film },
    { id: 'books', label: 'Books', icon: Book },
    { id: 'sports', label: 'Sports', icon: Users },
    { id: 'art', label: 'Art', icon: Heart },
];

export default function FilterModal({ isOpen, onClose, onApply }: FilterModalProps) {
    const [selectedGender, setSelectedGender] = useState<string>('any');
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

    const toggleInterest = (interestId: string) => {
        setSelectedInterests(prev =>
            prev.includes(interestId)
                ? prev.filter(id => id !== interestId)
                : [...prev, interestId]
        );
    };

    const handleApply = () => {
        onApply({
            gender: selectedGender,
            interests: selectedInterests,
        });
        onClose();
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
                    className="bg-gradient-to-br from-gray-900 via-purple-900/50 to-pink-900/50 rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-pink-400">
                            🎯 Find Your Match
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Gender Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-3 text-gray-200">
                            Looking for:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {['any', 'male', 'female', 'other'].map((gender) => (
                                <button
                                    key={gender}
                                    onClick={() => setSelectedGender(gender)}
                                    className={`py-3 px-4 rounded-xl font-medium transition-all ${selectedGender === gender
                                            ? 'bg-gradient-to-r from-cyan-600 to-purple-600 shadow-lg shadow-purple-500/30'
                                            : 'bg-gray-800/50 hover:bg-gray-700/50'
                                        }`}
                                >
                                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Interests Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-3 text-gray-200">
                            Interests (optional):
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {INTERESTS.map((interest) => {
                                const Icon = interest.icon;
                                const isSelected = selectedInterests.includes(interest.id);
                                return (
                                    <button
                                        key={interest.id}
                                        onClick={() => toggleInterest(interest.id)}
                                        className={`py-3 px-4 rounded-xl font-medium transition-all flex items-center gap-2 ${isSelected
                                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-pink-500/30'
                                                : 'bg-gray-800/50 hover:bg-gray-700/50'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="text-sm">{interest.label}</span>
                                    </button>
                                );
                            })}
                        </div>
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
                            onClick={handleApply}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-600 hover:via-purple-600 hover:to-pink-600 font-bold transition-all shadow-lg shadow-purple-500/30"
                        >
                            Apply Filters
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
