import React from 'react';
import PlayerSeat from './PlayerSeat';
import CommunityCards from './CommunityCards';
import PotDisplay from './PotDisplay';
import type { GameState, Player } from '../types';

interface TableProps {
    gameState: GameState;
    userParams: { id: string }; // Local user identifying info
    children?: React.ReactNode; // For ActionPanel and ChatBox overlay
}

// Positions for 6 players relative to the table container
// 0: Bottom (User), 1: Bottom Right, 2: Top Right, 3: Top Center, 4: Top Left, 5: Bottom Left
// Actually, let's map generic 0-5 positions to visual spots based on where the user is sitting.
// We always want the User to be at the Bottom (Visual Position 0).
// Function to rotate players array so 'user' is at index 0 of the visual array.

const getVisualPositions = (players: Player[], myId: string) => {
    // Find my index
    const myIndex = players.findIndex(p => p.id === myId);
    if (myIndex === -1) return players; // Spectator mode (keep server order)

    // Rotate so I am at 0.
    // Server: [A, B, Me, C, D, E] -> Me in index 2.
    // Visual: [Me, C, D, E, A, B]
    const rotated = [
        ...players.slice(myIndex),
        ...players.slice(0, myIndex)
    ];
    return rotated;
};

// CSS classes for 6 seats relative to the TABLE (not screen)
// The Table container will be centered.
// Using percentages for responsiveness.
const SEAT_POSITIONS = [
    "bottom-[5%] left-1/2 -translate-x-1/2",           // 0: Hero (Bottom Center)
    "bottom-[15%] -right-[10%] translate-x-0",       // 1: Right Bottom
    "top-[15%] -right-[10%] translate-x-0",          // 2: Right Top
    "top-[2%] left-1/2 -translate-x-1/2",            // 3: Villain (Top Center)
    "top-[15%] -left-[10%] translate-x-0",           // 4: Left Top
    "bottom-[15%] -left-[10%] translate-x-0",        // 5: Left Bottom
];

const Table: React.FC<TableProps> = ({ gameState, userParams, children }) => {
    const visualPlayers = getVisualPositions(gameState.players, userParams.id);

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gray-900 overflow-hidden">
            {/* Environment - Floor/Carpet */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a202c_0%,_#000_100%)] opacity-80" />

            {/* The Table */}
            <div className="relative w-[95%] max-w-[1200px] aspect-[1.8/1] bg-[#0d3328] rounded-[200px] border-[12px] border-[#3d2b1f] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center">
                {/* Felt Texture & Gradient */}
                <div className="absolute inset-2 rounded-[180px] bg-[radial-gradient(circle_at_center,_#1a4d3a_0%,_#0d3328_100%)] border border-white/5 opacity-100" />
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />

                {/* Inner Ring (Decoration) */}
                <div className="absolute inset-[15%] border-2 border-gold/10 rounded-[100px]" />

                {/* Community Cards Area */}
                <div className="z-10 absolute top-[42%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
                    <PotDisplay amount={gameState.pot} />
                    <CommunityCards cards={gameState.communityCards} stage={gameState.stage} />
                </div>

                {/* Board Info (Room ID etc) */}
                <div className="absolute bottom-[20%] text-white/10 font-bold tracking-widest pointer-events-none select-none">
                    TEXAS HOLD'EM PO.KER
                </div>

                {/* Players - Placed ON or AROUND the table edge */}
                {visualPlayers.map((player, index) => {
                    // If less than 6 players, we need to map them to appropriate seats? 
                    // For now, let's assume fixed 6 slots filling up. 
                    // Actually, for < 6 players, usually we still use the relative relative rotation 
                    // but might want to space them out differently. 
                    // MVP: Just map to indices 0-5.
                    return (
                        <PlayerSeat
                            key={player.id}
                            player={player}
                            isActive={gameState.activePlayerPosition === player.position} // Note: check mapping logic later
                            isSelf={player.id === userParams.id}
                            positionClass={SEAT_POSITIONS[index] || ""}
                            isShowdown={gameState.stage === 'showdown'}
                        />
                    );
                })}
            </div>

            {/* Overlays (Action Panel, etc) */}
            {children}
        </div>
    );
};

export default Table;
