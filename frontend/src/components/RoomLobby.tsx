import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Room {
    id: string;
    name: string;
    players: number;
    maxPlayers: number;
    blinds: string; // "10/20"
}

interface RoomLobbyProps {
    rooms: Room[];
    onCreateRoom: (name: string, blinds: string) => void;
    onJoinRoom: (roomId: string) => void;
}

const RoomLobby: React.FC<RoomLobbyProps> = ({ rooms, onCreateRoom, onJoinRoom }) => {
    const [roomName, setRoomName] = useState('');

    return (
        <div className="w-full max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gold">Lobby</h2>
                <div className="flex gap-4">
                    <input
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="New Room Name"
                        className="bg-gray-800 border border-gray-600 text-white px-4 py-2 rounded"
                    />
                    <button
                        onClick={() => onCreateRoom(roomName || "New Room", "10/20")}
                        className="bg-gold text-black px-6 py-2 rounded font-bold hover:bg-yellow-500"
                    >
                        Create Room
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map((room) => (
                    <motion.div
                        key={room.id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-gray-800 border border-gray-700 p-6 rounded-xl hover:border-gold transition-colors cursor-pointer"
                        onClick={() => onJoinRoom(room.id)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-white">{room.name}</h3>
                            <span className="text-sm bg-gray-700 px-2 py-1 rounded text-gray-300">#{room.id}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>Blinds: <span className="text-white">{room.blinds}</span></span>
                            <span>Players: <span className="text-white">{room.players}/{room.maxPlayers}</span></span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-4">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(room.players / room.maxPlayers) * 100}%` }}></div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default RoomLobby;
