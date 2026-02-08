import React from 'react';
import type { Card as CardType } from '../types';
import Card from './Card';
import { motion } from 'framer-motion';

interface CommunityCardsProps {
    cards: CardType[];
    className?: string;
    stage: string;
}

const CommunityCards: React.FC<CommunityCardsProps> = ({ cards, className = '', stage: _stage }) => {
    // Determine how many cards to show based on stage or cards length
    // In a real app, cards array would grow as game progresses.
    // Assuming cards contains all visible cards.

    return (
        <div className={`flex items-center justify-center space-x-2 ${className}`}>
            {/* 5 slots placeholder */}
            {[0, 1, 2, 3, 4].map((index) => {
                const card = cards[index];
                return (
                    <div key={index} className="w-16 h-24 relative">
                        {/* Slot holder */}
                        {!card && (
                            <div className="absolute inset-0 border-2 border-dashed border-white/20 rounded-lg"></div>
                        )}

                        {card && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0, y: -20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.15, type: 'spring', damping: 12 }}
                            >
                                <Card card={card} />
                            </motion.div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default CommunityCards;
