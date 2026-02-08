import React from 'react';
import type { Player } from '../types';
import Card from './Card';
import Chip from './Chip';
import { motion } from 'framer-motion';

interface PlayerSeatProps {
    player: Player;
    isActive: boolean; // Is it this player's turn?
    isSelf: boolean; // Is this the local user?
    positionClass: string; // CSS class for absolute positioning on the table
    isShowdown?: boolean;
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({ player, isActive, isSelf, positionClass, isShowdown = false }) => {
    if (player.isEmpty) {
        return (
            <div className={`absolute flex flex-col items-center gap-2 ${positionClass} opacity-60`}>
                <div className="w-16 h-16 rounded-full border border-dashed border-gray-600" />
                <div className="text-xs text-gray-500">空位</div>
            </div>
        );
    }
    return (
        <div className={`absolute flex flex-col items-center gap-2 ${positionClass}`}>
            {/* Cards */}
            <div className={`flex h-16 relative transition-all duration-300 ${isSelf ? 'mb-12 -space-x-4' : 'mb-2 -space-x-[20px] ml-2'}`}>
                {player.cards.map((card, index) => (
                    <motion.div
                        key={index}
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card
                            card={card}
                            hidden={!isSelf && !isShowdown}
                            className="w-12 h-16 text-xs" // Smaller cards for seat
                        />
                    </motion.div>
                ))}
                {/* Placeholder for no cards or hidden cards if player has cards but we don't know them (should be handled by prop, but mostly length check) */}
                {player.status !== 'folded' && player.status !== 'waiting' && player.cards.length === 0 && !isSelf && (
                    <>
                        <Card hidden className="w-12 h-16 text-xs" />
                        <div className="-ml-8"><Card hidden className="w-12 h-16 text-xs" /></div>
                    </>
                )}
            </div>

            {/* Hand Rank Label (Showdown) */}
            {isShowdown && player.handRank && (
                <div className="absolute -top-12 text-gold font-bold text-xs bg-black/80 px-2 py-1 rounded shadow-sm border border-gold/30 z-20 whitespace-nowrap">
                    {player.handRank}
                </div>
            )}

            {/* Winning Effect: Floating Chips Text */}
            {player.isWinner && (
                <motion.div
                    initial={{ y: 0, opacity: 0 }}
                    animate={{ y: -60, opacity: 1 }}
                    className="absolute top-0 text-green-400 font-bold text-xl z-50 drop-shadow-md font-mono"
                >
                    WIN!
                </motion.div>
            )}

            <div className={`relative px-4 py-2 rounded-xl bg-gray-800 border-2 transition-all duration-300 min-w-[120px] flex flex-col items-center
        ${player.isWinner ? 'border-yellow-400 shadow-[0_0_20px_#ffd700] scale-110 z-10 bg-gray-800' : ''}
        ${!player.isWinner && isShowdown && player.status !== 'folded' ? 'opacity-60 grayscale-[0.3]' : ''}
        ${!player.isWinner && !isShowdown && isActive ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-105' : ''}
        ${!player.isWinner && !isShowdown && !isActive ? 'border-gray-600' : ''}
        ${player.status === 'folded' ? 'opacity-50 grayscale' : ''}
      `}>
                {/* Status Badge */}
                {player.status !== 'active' && player.status !== 'waiting' && (
                    <div className="absolute -top-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-700 border border-gray-500 text-white z-10">
                        {player.status}
                    </div>
                )}

                {/* Name */}
                <div className="text-sm font-bold text-white truncate max-w-[100px] text-center">
                    {player.name}
                </div>

                {/* Chips */}
                <div className="flex items-center gap-1 text-gold font-mono text-xs mt-1">
                    <span>🪙</span>
                    {player.chips.toLocaleString()}
                </div>

                {/* Current Round Bet */}
                {player.bet > 0 && (
                    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
                        <Chip amount={player.bet} />
                    </div>
                )}
            </div>

            {/* Dealer Button - TODO: Add dealer prop to interface and render */}
        </div>
    );
};

export default PlayerSeat;
