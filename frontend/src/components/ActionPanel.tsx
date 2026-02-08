import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionPanelProps {
    onAction: (action: string, amount?: number) => void;
    currentBet: number;
    minBet: number;
    userChips: number;
    callAmount: number; // Amount needed to call
    canCheck: boolean;
}

const ActionPanel: React.FC<ActionPanelProps> = ({
    onAction,
    minBet,
    userChips,
    callAmount,
    canCheck
}) => {
    const [raiseAmount, setRaiseAmount] = useState(minBet);
    const [isSliderOpen, setIsSliderOpen] = useState(false);

    const handleRaiseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRaiseAmount(Number(e.target.value));
    };

    const handleRaiseClick = () => {
        if (!isSliderOpen) {
            setIsSliderOpen(true);
        } else {
            onAction('raise', raiseAmount);
            setIsSliderOpen(false);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 pb-8 flex justify-center items-end gap-3 z-50 pointer-events-none">
            <div className="pointer-events-auto flex gap-3 items-end">
                {/* FOLD */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onAction('fold')}
                    className="px-6 py-3 bg-red-600/90 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg border-b-4 border-red-800 active:border-b-0 active:translate-y-1 min-w-[100px]"
                >
                    FOLD
                </motion.button>

                {/* CHECK / CALL */}
                {canCheck ? (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onAction('check')}
                        className="px-6 py-3 bg-gray-600/90 hover:bg-gray-500 text-white font-bold rounded-xl shadow-lg border-b-4 border-gray-800 active:border-b-0 active:translate-y-1 min-w-[100px]"
                    >
                        CHECK
                    </motion.button>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onAction('call')}
                        className="px-6 py-3 bg-green-600/90 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg border-b-4 border-green-800 active:border-b-0 active:translate-y-1 flex flex-col items-center leading-none min-w-[100px]"
                    >
                        <span>CALL</span>
                        <span className="text-xs opacity-80 font-mono mt-1">${callAmount}</span>
                    </motion.button>
                )}

                {/* RAISE */}
                <div className="relative flex flex-col items-center">
                    {/* Slider Popup */}
                    <AnimatePresence>
                        {isSliderOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                className="absolute bottom-full mb-4 bg-gray-800/95 border border-gray-600 p-4 rounded-xl w-64 shadow-2xl backdrop-blur-md"
                            >
                                <div className="text-center text-amber-400 font-mono text-xl font-bold mb-3 drop-shadow-md">
                                    ${raiseAmount}
                                </div>
                                <input
                                    type="range"
                                    min={minBet}
                                    max={userChips}
                                    value={raiseAmount}
                                    onChange={handleRaiseChange}
                                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                                <div className="flex justify-between mt-3 gap-2">
                                    <button 
                                        onClick={() => setRaiseAmount(minBet)} 
                                        className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
                                    >
                                        Min
                                    </button>
                                    <button 
                                        onClick={() => setRaiseAmount(Math.floor(userChips / 2))} 
                                        className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
                                    >
                                        1/2 Pot
                                    </button>
                                    <button 
                                        onClick={() => setRaiseAmount(userChips)} 
                                        className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
                                    >
                                        Max
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRaiseClick}
                        className={`px-6 py-3 font-bold rounded-xl shadow-lg border-b-4 active:border-b-0 active:translate-y-1 min-w-[100px] transition-colors ${
                            isSliderOpen 
                                ? 'bg-amber-400 text-black border-amber-600 hover:bg-amber-300' 
                                : 'bg-amber-500/90 text-black border-amber-700 hover:bg-amber-400'
                        }`}
                    >
                        {isSliderOpen ? 'CONFIRM' : 'RAISE'}
                    </motion.button>
                </div>

                {/* ALL IN BUTTON (Domineering Style) */}
                <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(234, 179, 8, 0.6)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onAction('allin', userChips)}
                    className="px-6 py-3 bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-600 text-black font-black italic tracking-widest rounded-xl shadow-[0_0_10px_rgba(234,179,8,0.4)] border-2 border-yellow-200 active:translate-y-1 relative overflow-hidden group min-w-[100px]"
                >
                    <span className="relative z-10 drop-shadow-sm">ALL IN</span>
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full -translate-x-full group-hover:animate-shine" />
                </motion.button>
            </div>
        </div>
    );
};

export default ActionPanel;
