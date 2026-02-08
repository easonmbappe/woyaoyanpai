import React from 'react';
import { motion } from 'framer-motion';
import type { Card as CardType } from '../types';

interface CardProps {
    card?: CardType; // If undefined, renders back
    hidden?: boolean; // If true, forces back
    className?: string;
    style?: React.CSSProperties;
    scale?: number;
}

const getCardColor = (suit: string) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-gray-900';
};

const getSuitSymbol = (suit: string) => {
    switch (suit) {
        case 'hearts': return '♥';
        case 'diamonds': return '♦';
        case 'clubs': return '♣';
        case 'spades': return '♠';
        default: return '';
    }
};

const Card: React.FC<CardProps> = ({ card, hidden = false, className = '', style, scale = 1 }) => {
    const isBack = hidden || !card;

    return (
        <div 
            className={`relative w-16 h-24 perspective-1000 ${className}`} 
            style={{ 
                ...style,
                transform: `scale(${scale})`,
                transformOrigin: 'center center'
            }}
        >
            <motion.div
                className="w-full h-full relative preserve-3d shadow-md rounded-lg"
                initial={false}
                animate={{ rotateY: isBack ? 180 : 0 }}
                transition={{ duration: 0.6 }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Front (Face) */}
                <div 
                    className="absolute inset-0 w-full h-full bg-white rounded-lg border border-gray-300 flex flex-col items-center justify-center backface-hidden overflow-hidden"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
                >
                    {card && !hidden && (
                        <>
                            <div className={`absolute top-1 left-1 text-sm font-bold leading-none ${getCardColor(card.suit)}`}>
                                {card.rank}
                                <div className="text-[10px]">{getSuitSymbol(card.suit)}</div>
                            </div>
                            <div className={`text-3xl ${getCardColor(card.suit)}`}>
                                {getSuitSymbol(card.suit)}
                            </div>
                            <div className={`absolute bottom-1 right-1 text-sm font-bold leading-none ${getCardColor(card.suit)} rotate-180`}>
                                {card.rank}
                                <div className="text-[10px]">{getSuitSymbol(card.suit)}</div>
                            </div>
                        </>
                    )}
                </div>

                {/* Back */}
                <div 
                    className="absolute inset-0 w-full h-full bg-blue-900 rounded-lg border-2 border-white backface-hidden"
                    style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: `repeating-linear-gradient(
                            45deg,
                            #1e3a8a,
                            #1e3a8a 10px,
                            #172554 10px,
                            #172554 20px
                        )`
                    }}
                >
                    <div className="absolute inset-2 border border-blue-400/30 rounded-sm" />
                </div>
            </motion.div>
        </div>
    );
};

export default Card;

