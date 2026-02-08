import React from 'react';
import { motion } from 'framer-motion';

interface ChipProps {
    amount: number;
    className?: string;
    style?: React.CSSProperties;
}

const getChipColor = (amount: number) => {
    if (amount >= 500) return 'bg-purple-600 border-purple-800 text-white';
    if (amount >= 100) return 'bg-gray-800 border-gray-900 text-white';
    if (amount >= 25) return 'bg-green-600 border-green-800 text-white';
    if (amount >= 5) return 'bg-red-600 border-red-800 text-white';
    return 'bg-white border-gray-300 text-black';
};

const Chip: React.FC<ChipProps> = ({ amount, className = '', style }) => {
    const colorClass = getChipColor(amount);

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`relative rounded-full border-4 border-dashed w-10 h-10 flex items-center justify-center shadow-lg transform hover:-translate-y-1 transition-transform ${colorClass} ${className}`}
            style={style}
        >
            <div className="absolute inset-0 rounded-full border-2 border-white opacity-20"></div>
            <span className="text-xs font-bold font-mono">{amount}</span>
        </motion.div>
    );
};

export default Chip;
