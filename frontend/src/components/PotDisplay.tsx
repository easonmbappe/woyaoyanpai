import React from 'react';
import { motion } from 'framer-motion';
import Chip from './Chip';

interface PotDisplayProps {
    amount: number;
    className?: string;
}

const PotDisplay: React.FC<PotDisplayProps> = ({ amount, className = '' }) => {
    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">
                Pot
            </div>
            <motion.div
                key={amount} // Re-animate on change
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="bg-black/40 backdrop-blur-sm px-6 py-2 rounded-full border border-gold/30 shadow-lg flex items-center gap-2"
            >
                <div className="text-gold text-2xl font-mono font-bold">
                    ${amount.toLocaleString()}
                </div>
            </motion.div>
            {/* Visual Chips Pile (Simplified) */}
            <div className="mt-2 flex -space-x-3 items-end h-8">
                {amount > 0 && (
                    <>
                        {/* Generate visual stack based on amount roughly */}
                        {amount >= 100 && <Chip amount={100} className="scale-75 origin-bottom z-10" />}
                        {amount >= 50 && <Chip amount={25} className={`scale-75 origin-bottom -ml-3 ${amount >= 100 ? '-mb-1' : ''}`} />}
                        {amount >= 20 && <Chip amount={10} className="scale-75 origin-bottom -ml-3 -mb-2" />}
                        <Chip amount={5} className="scale-75 origin-bottom -ml-3 -mb-1" />
                    </>
                )}
            </div>
        </div>
    );
};

export default PotDisplay;
