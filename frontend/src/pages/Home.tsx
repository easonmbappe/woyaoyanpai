import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import { useGame } from '../hooks/useGameState';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { createRoom } = useGame();
    const [nickname, setNickname] = useState('Player' + Math.floor(Math.random() * 1000));

    useEffect(() => {
        const cached = localStorage.getItem('playerName');
        if (cached) {
            setNickname(cached);
        }
    }, []);

    const handleSolo = async () => {
        const trimmed = nickname.trim() || 'Guest';
        localStorage.setItem('playerName', trimmed);
        const roomId = await createRoom(trimmed, true);
        if (roomId) {
            navigate(`/game/${roomId}?name=${encodeURIComponent(trimmed)}`);
        }
    };

    const handleLobby = () => {
        const trimmed = nickname.trim() || 'Guest';
        localStorage.setItem('playerName', trimmed);
        navigate('/lobby?name=' + encodeURIComponent(trimmed));
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a4d3a_0%,_#000_100%)] opacity-50" />

            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="z-10 text-center mb-12"
            >
                <h1 className="text-6xl font-black text-gold tracking-tighter mb-2 drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]">
                    WOYAO YANPAI
                </h1>
                <p className="text-gray-400 text-xl tracking-widest uppercase">Texas Hold'em Poker</p>
            </motion.div>

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="z-10 w-full max-w-md bg-gray-800/80 backdrop-blur-md p-8 rounded-2xl border border-gray-700 shadow-2xl"
            >
                <div className="mb-6">
                    <label className="block text-gray-400 text-sm font-bold mb-2">NICKNAME</label>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => {
                            const next = e.target.value;
                            setNickname(next);
                            localStorage.setItem('playerName', next);
                        }}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-gold transition-colors"
                    />
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleSolo}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl font-bold text-white shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                        <span>🤖</span> VS COMPUTER
                    </button>

                    <button
                        onClick={handleLobby}
                        className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 rounded-xl font-bold text-white shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                        <span>🌐</span> PLAY ONLINE
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Home;
