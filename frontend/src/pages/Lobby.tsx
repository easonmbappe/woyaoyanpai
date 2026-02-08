import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RoomLobby from '../components/RoomLobby';
import { useGame } from '../hooks/useGameState';

const Lobby: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const cachedName = localStorage.getItem('playerName');
    const playerName = searchParams.get('name') || cachedName || 'Guest';

    const { createRoom, joinRoom, error: gameError, isConnected, rooms } = useGame();

    useEffect(() => {
        const shouldRedirect = sessionStorage.getItem('reloadRedirect') === '1';
        if (shouldRedirect) {
            sessionStorage.removeItem('reloadRedirect');
            navigate('/');
        }
    }, [navigate]);

    useEffect(() => {
        if (playerName) {
            localStorage.setItem('playerName', playerName);
        }
    }, [playerName]);

    const lobbyRooms = (rooms || []).map((room: any) => ({
        id: room.id,
        name: `Room ${room.id}`,
        players: room.players ?? 0,
        maxPlayers: room.maxPlayers ?? 6,
        blinds: room.blinds ?? '5/10'
    }));

    const handleCreate = async (_name: string, _blinds: string) => {
        // Call context create
        const roomId = await createRoom(playerName);
        if (roomId) {
            navigate(`/game/${roomId}?name=${encodeURIComponent(playerName)}`);
        }
    };

    const handleJoin = (roomId: string) => {
        joinRoom(roomId, playerName);
        navigate(`/game/${roomId}?name=${encodeURIComponent(playerName)}`);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center py-4 border-b border-gray-800 mb-8">
                    <h1 className="text-xl font-bold text-gold">WOYAO YANPAI LOBBY</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400">Welcome, <span className="text-white font-bold">{playerName}</span></span>
                        <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </div>
                </header>

                {gameError && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6">
                        {gameError}
                    </div>
                )}

                <RoomLobby
                    rooms={lobbyRooms}
                    onCreateRoom={handleCreate}
                    onJoinRoom={handleJoin}
                />
            </div>
        </div>
    );
};

export default Lobby;
