import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from '../types';

// Define the events based on the backend
interface ServerToClientEvents {
    connection: (data: { playerId: string; roomId?: string }) => void;
    'room:created': (data: {
        roomId: string;
        player: { id: string; name: string; isHost?: boolean };
        seatIndex: number;
        isHost: boolean;
    }) => void;
    'room:updated': (data: {
        id: string;
        hostId: string;
        players: Array<{ id: string; name: string; isHost: boolean; isReady: boolean } | null>;
        spectators: Array<{ id: string; name: string }>;
        status: string;
    }) => void;
    'game:start': (gameState: GameState) => void;
    'game:state': (gameState: GameState) => void;
    'game:deal': (data: { playerId: string; cards: any[] }) => void;
    'game:community': (data: { cards: any[]; stage: string }) => void;
    'game:turn': (data: { playerId: string; timeout: number }) => void;
    'game:showdown': (data: {
        winnerId: string;
        handRank: string;
        winAmount: number;
        playerHands: any[];
        winner?: {
            id: string;
            name: string;
            handRank: string;
            bestHand: any[];
            holeCards: any[];
        };
    }) => void;
    'game:newRound': (data: any) => void;
    'game:actionResult': (data: { playerId: string; action: any; pot: number; roundBet: number; chips: number; status: string }) => void;
    'game:ended': (gameState: GameState) => void;
    'game:error': (error: { message: string }) => void;
    'room:error': (error: { message: string }) => void;
    'game:chat': (data: { message: string }) => void;
    'player:reconnected': (data: { playerId: string }) => void;
    'player:disconnected': (data: { playerId: string }) => void;
}

interface ClientToServerEvents {
    'room:join': (data: { roomId: string; playerName: string; avatarId: string }) => void;
    'room:create': (data: { playerName: string; isSolo: boolean; botCount: number }) => void;
    'room:leave': (data: { roomId: string; playerId: string }) => void;
    'room:kick': (data: { roomId: string; playerId: string; targetId: string }) => void;
    'room:ready': (data: { roomId: string }) => void;
    'room:start': (data: { roomId: string; playerId: string }) => void;
    'game:action': (data: { type: string; amount?: number }) => void;
    'game:chat': (data: { roomId: string; message: string }) => void;
}

// Default to port 3001 as per backend config
export const useSocket = (url: string = 'http://localhost:3001') => {
    const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const socket = io(url, {
            transports: ['polling', 'websocket'],
            autoConnect: true,
            reconnection: true,
            withCredentials: true,
        });

        // Debug logging
        socket.onAny((event, ...args) => {
            console.log('%c[Socket IN]', 'color: #00ff00', event, args);
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket.id);
            setIsConnected(true);
            setError(null);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
            setError('Connection failed');
        });

        socket.on('room:error', (err) => {
            setError(err.message);
        });

        socket.on('game:error', (err) => {
            setError(err.message); // Temporarily show game errors as global errors or handle differently
        });

        return () => {
            socket.disconnect();
        };
    }, [url]);

    const emit = <K extends keyof ClientToServerEvents>(
        event: K,
        data: Parameters<ClientToServerEvents[K]>[0],
        callback?: (...args: any[]) => void
    ) => {
        if (socketRef.current) {
            console.log('%c[Socket OUT]', 'color: #00ffff', event, data);
            (socketRef.current.emit as any)(event, data, callback);
        }
    };

    return { socket: socketRef.current, isConnected, error, emit };
};
