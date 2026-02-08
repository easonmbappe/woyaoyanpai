import React from 'react';
import { motion } from 'framer-motion';
import Card from './Card'; // Use our Card component
import type { Card as CardType } from '../types';

interface SettlementModalProps {
    winnerName?: string;
    winnerHand?: string; // e.g. "Royal Flush"
    potAmount?: number;
    bestCards?: CardType[];
    onNextHand: () => void;
    onLeave: () => void;
    isLoading?: boolean; // Waiting for backend data
}

const SettlementModal: React.FC<SettlementModalProps> = ({
    winnerName,
    winnerHand,
    potAmount,
    bestCards,
    onNextHand,
    onLeave,
    isLoading = false
}) => {
    console.log('[Render] Winner name:', winnerName);
    console.log('[Render] Best hand:', bestCards);
    console.log('[Render] Hand rank:', winnerHand);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-gray-900 border-2 border-amber-500/50 rounded-2xl p-8 w-[90%] max-w-md shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col items-center relative overflow-hidden"
            >
                {/* Background effects */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent pointer-events-none" />
                
                {/* Content */}
                <div className="relative z-10 w-full text-center">
                    {isLoading ? (
                        <div className="flex flex-col items-center py-10">
                            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-amber-200 font-mono tracking-widest animate-pulse">CALCULATING RESULTS...</p>
                        </div>
                    ) : (
                        <>
                            <motion.div 
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-6xl mb-4"
                            >
                                🏆
                            </motion.div>
                            
                            <motion.h2 
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 mb-2 uppercase tracking-wide drop-shadow-sm"
                            >
                                {winnerName || 'Winner'}
                            </motion.h2>

                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="bg-black/40 rounded-lg p-4 mb-6 border border-white/10 shadow-inner"
                            >
                                <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Winning Hand</p>
                                <p className="text-xl font-bold text-white mb-2">{winnerHand || 'High Card'}</p>
                                <div className="flex justify-center gap-1 min-h-[80px] items-center">
                                    {bestCards && bestCards.length > 0 ? (
                                        bestCards.map((card, i) => (
                                            <div key={i} className="-ml-3 first:ml-0 hover:z-10 transition-all">
                                                <Card 
                                                    card={card} 
                                                    scale={0.7}
                                                    className="shadow-xl"
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        // Placeholder / Loading
                                        [1,2,3,4,5].map(i => (
                                            <div key={i} className="w-10 h-14 bg-gray-700/50 rounded border border-gray-600 flex items-center justify-center text-xs text-gray-500 animate-pulse">
                                                ?
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>

                            <div className="mb-8">
                                <p className="text-gray-400 text-xs uppercase mb-1">Total Pot</p>
                                <p className="text-5xl font-mono font-bold text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                                    ${potAmount?.toLocaleString()}
                                </p>
                            </div>
                        </>
                    )}

                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={onLeave}
                            className="flex-1 py-3 px-4 rounded-xl border border-gray-600 text-gray-300 font-bold hover:bg-gray-800 transition-colors uppercase tracking-wider text-sm"
                        >
                            Leave
                        </button>
                        <button
                            onClick={onNextHand}
                            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-black shadow-lg hover:from-amber-400 hover:to-yellow-500 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-wider text-sm"
                        >
                            Next Hand / Ready
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SettlementModal;
