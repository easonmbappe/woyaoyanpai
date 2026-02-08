import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { GameState, PlayerStatus } from '../types';
import { useSocket } from './useSocket';
import { MockGameEngine } from '../utils/mockEngine';
import { sortCardsByHandPriority } from '../utils/cardHelpers';

interface GameContextType {
    gameState: GameState | null;
    roomInfo: any | null; // Room info including players list etc before game starts
    isConnected: boolean;
    error: string | null;
    rooms: any[];
    joinRoom: (roomId: string, playerName: string) => void;
    createRoom: (playerName: string, isSolo?: boolean) => Promise<string>;
    leaveRoom: (roomId: string) => void;
    resetGameState: () => void;
    startGame: () => void;
    sendAction: (actionType: string, amount?: number) => void;
    sendMessage: (text: string) => void;
    readyUp: () => void;
    playerId: string | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { socket, isConnected, error: socketError, emit } = useSocket();
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [roomInfo, setRoomInfo] = useState<any | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Mock Engine Ref
    const mockEngine = useRef<MockGameEngine | null>(null);

    const [rooms, setRooms] = useState<any[]>([]);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await fetch('/api/rooms/discover');
                if (!res.ok) {
                    throw new Error('Room discovery failed');
                }
                const data = await res.json();
                if (Array.isArray(data.rooms)) {
                    setRooms(data.rooms);
                }
            } catch (err) {
                try {
                    const res = await fetch('http://localhost:3001/api/rooms/discover');
                    if (!res.ok) {
                        throw new Error('Room discovery failed');
                    }
                    const data = await res.json();
                    if (Array.isArray(data.rooms)) {
                        setRooms(data.rooms);
                    }
                } catch (error) {
                    console.error('Failed to fetch rooms', error);
                }
            }
        };

        const interval = setInterval(fetchRooms, 5000);
        fetchRooms(); // Initial fetch

        return () => clearInterval(interval);
    }, []);
    const [isMock, setIsMock] = useState(false);

    useEffect(() => {
        if (!socket || isMock) return;

        socket.on('connection', ({ playerId: connectedPlayerId, roomId }) => {
            setPlayerId(connectedPlayerId);
            if (roomId) {
                setRoomInfo((prev: any) => ({ ...prev, id: roomId, players: prev?.players || [] }));
            }
        });

        socket.on('room:created', (data: any) => {
            console.log('[Room Created]', data);
            if (data.player?.id) setPlayerId(data.player.id);

            setRoomInfo((prev: any) => {
                const playerIdValue = data.player?.id || playerId;
                const hostId = data.isHost ? playerIdValue : prev?.hostId;
                const players = Array.from({ length: 6 }, (_, index) => {
                    if (index === data.seatIndex) {
                        return {
                            id: playerIdValue,
                            name: data.player?.name ?? prev?.nickname ?? 'Me',
                            isHost: Boolean(data.isHost),
                            isReady: false
                        };
                    }
                    return prev?.players?.[index] ?? null;
                });

                return {
                    ...prev,
                    id: data.roomId,
                    hostId,
                    players,
                    seatIndex: data.seatIndex
                };
            });
        });

        socket.on('room:updated', (data: any) => {
            console.log('[Room Updated]', data);
            setRoomInfo((prev: any) => {
                const seatIndex = Array.isArray(data.players)
                    ? data.players.findIndex((seat: any) => seat?.id === playerId)
                    : prev?.seatIndex;
                return {
                    ...prev,
                    id: data.id,
                    hostId: data.hostId,
                    players: data.players,
                    spectators: data.spectators,
                    status: data.status,
                    seatIndex: seatIndex >= 0 ? seatIndex : prev?.seatIndex
                };
            });
        });

        socket.on('game:start', (state) => {
            setGameState(state);
        });

        socket.on('game:state', (state) => {
            setGameState(prev => {
                if (!prev) return state;
                if (state.stage !== 'showdown') {
                    return state;
                }
                const mergedPlayers = state.players.map(p => {
                    const previous = prev.players.find(prevPlayer => prevPlayer.id === p.id);
                    if (previous?.handRank) {
                        return {
                            ...p,
                            handRank: previous.handRank,
                            bestHand: sortCardsByHandPriority((previous as any).bestHand || []),
                            isWinner: previous.isWinner
                        } as any;
                    }
                    return p;
                });
                return { ...state, players: mergedPlayers } as any;
            });
        });

        socket.on('game:deal', ({ playerId: dealtPlayerId, cards }) => {
            setGameState(prev => {
                if (!prev) return null;
                if (dealtPlayerId !== playerId) {
                    return prev;
                }
                return {
                    ...prev,
                    players: prev.players.map(p =>
                        p.id === playerId ? { ...p, cards } : p
                    )
                };
            });
        });

        socket.on('game:community', ({ cards, stage }) => {
            setGameState(prev => {
                if (!prev) return null;
                return { ...prev, communityCards: cards, stage: stage as any };
            });
        });

        socket.on('game:turn', ({ playerId: activePid, timeout: _timeout }) => {
            setGameState(prev => {
                if (!prev) return null;
                const idx = prev.players.findIndex(p => p.id === activePid);
                return { ...prev, activePlayerPosition: idx !== -1 ? idx : -1 };
            });
        });

        socket.on('game:showdown', (payload: any) => {
            console.log('[Showdown] Raw data:', JSON.stringify(payload, null, 2));
            console.log('[Showdown] Winners:', payload.winners);
            console.log('[Showdown] First winner:', payload.winners?.[0]);
            console.log('[Showdown] Best hand:', payload.winners?.[0]?.bestHand);

            setGameState(prev => {
                if (!prev) return null;
                
                // New backend format: { winners: [{ id, name, handRank, bestHand, winAmount, ... }], players: [...] }
                const winners = payload.winners || [];
                // Sort winner's bestHand if it exists
                if (winners.length > 0) {
                    winners.forEach((w: any) => {
                        if (w.bestHand) {
                            w.bestHand = sortCardsByHandPriority(w.bestHand);
                        }
                    });
                }

                const fallbackWinner = payload.winner
                    ? {
                        playerId: payload.winner.id,
                        handRank: payload.winner.handRank,
                        handRankChinese: payload.winner.handRank,
                        winAmount: payload.winAmount,
                        bestHand: sortCardsByHandPriority(payload.winner.bestHand || []),
                        holeCards: payload.winner.holeCards
                    }
                    : undefined;
                const resolvedWinners = winners.length > 0 ? winners : fallbackWinner ? [fallbackWinner] : [];
                const primaryWinner = resolvedWinners[0];
                
                const handMap = new Map<string, any[]>(
                    (payload.playerHands || []).map((hand: any) => [hand.playerId, hand.holeCards || hand.cards || []])
                );

                const updatedPlayers = prev.players.map(p => {
                    const winnerInfo = resolvedWinners.find((w: any) => w.playerId === p.id || w.id === p.id); // Check both id formats
                    const holeCards = handMap.get(p.id) || [];
                    if (winnerInfo) {
                        return {
                            ...p,
                            cards: holeCards && holeCards.length > 0 ? holeCards : p.cards,
                            handRank: winnerInfo.handRankChinese || winnerInfo.handRank,
                            bestHand: sortCardsByHandPriority(winnerInfo.bestHand || []),
                            isWinner: true
                        };
                    }
                    return {
                        ...p,
                        cards: holeCards && holeCards.length > 0 ? holeCards : p.cards,
                        isWinner: false
                    };
                });

                return { 
                    ...prev, 
                    players: updatedPlayers, 
                    stage: 'showdown' as any, // Force type cast if necessary
                    pot: primaryWinner?.winAmount ?? prev.pot 
                };
            });
        });

        socket.on('game:newRound', (payload) => {
            setGameState(prev => {
                const stage = payload?.stage ?? 'preflop';
                const players = Array.isArray(payload?.players)
                    ? payload.players
                    : prev?.players ?? [];
                return {
                    roomId: payload?.roomId ?? prev?.roomId ?? '',
                    stage,
                    pot: payload?.pot ?? 0,
                    currentBet: 0,
                    dealerPosition: payload?.dealerPosition ?? 0,
                    activePlayerPosition: -1,
                    communityCards: payload?.communityCards ?? [],
                    players: players.map((player: any, index: number) => ({
                        ...player,
                        position: player.position ?? index,
                        cards: player.cards ?? [],
                        bet: player.bet ?? 0,
                        status: (player.status ?? 'active') as PlayerStatus,
                        isWinner: false,
                        handRank: undefined
                    })),
                    minBet: payload?.bigBlind ?? prev?.minBet ?? 0
                };
            });
        });

        socket.on('game:actionResult', ({ playerId: actingId, pot, roundBet, chips, status }) => {
            console.log('[ActionResult]', { actingId, pot, roundBet, chips, status });
            setGameState(prev => {
                if (!prev) return null;
                console.log('[Players] Active:', prev.players.filter(p => p.status === 'active').length);
                return {
                    ...prev,
                    pot: pot ?? prev.pot,
                    players: prev.players.map(player =>
                        player.id === actingId
                            ? {
                                ...player,
                                bet: roundBet ?? player.bet,
                                chips: chips ?? player.chips,
                                status: (status ?? player.status) as PlayerStatus
                            }
                            : player
                    )
                };
            });
        });

        // Cleanup listeners
        return () => {
            socket.off('connection');
            socket.off('room:created');
            socket.off('room:updated');
            socket.off('game:start');
            socket.off('game:state');
            socket.off('game:deal');
            socket.off('game:community');
            socket.off('game:turn');
            socket.off('game:showdown');
            socket.off('game:newRound');
            socket.off('game:actionResult');
        };
    }, [socket, isMock, playerId]);

    useEffect(() => {
        if (socketError && !isMock) setError(socketError);
    }, [socketError, isMock]);

    const joinRoom = (roomId: string, playerName: string) => {
        if (roomId === 'solo') {
            setIsMock(true);
            mockEngine.current = new MockGameEngine();
            const initial = mockEngine.current.init(playerName);
            setRoomInfo({ id: 'solo', name: 'Solo Game', players: initial.players, hostId: 'me' });
            setGameState(initial);
            setPlayerId('me');
            return;
        }
        setIsMock(false);

        // Ideally we get playerId from existing session or created during join
        // But backend 'room:join' expects { roomId, playerName, avatarId }
        // Pass a dummy avatarId for now.
        const avatarId = 'avatar_' + Math.floor(Math.random() * 6);
        emit('room:join', { roomId, playerName, avatarId }, (data: { playerId: string; roomId: string }) => {
            setPlayerId(data.playerId);
            setRoomInfo((prev: any) => ({ ...prev, id: data.roomId }));
        });
    };

    const leaveRoom = (roomId: string) => {
        if (!roomId || !playerId) return;
        emit('room:leave', { roomId, playerId });
    };

    const resetGameState = () => {
        setGameState(null);
    };

    const createRoom = async (playerName: string, isSolo: boolean = false): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!socket) return reject(new Error('No Connection'));

            const onCreated = (data: { playerId: string; roomId: string }) => {
                if (data.playerId) setPlayerId(data.playerId);
                setRoomInfo((prev: any) => ({ ...prev, id: data.roomId }));
                resolve(data.roomId);
            };

            emit('room:create', { playerName, isSolo, botCount: isSolo ? 5 : 0 }, onCreated);

            // Timeout?
            setTimeout(() => {
                // reject(new Error('Timeout creating room')); // Optional
            }, 5000);
        });
    };

    const startGame = () => {
        if (isMock && mockEngine.current) {
            const updated = mockEngine.current.start();
            setGameState(updated);
            return;
        }
        if (roomInfo && playerId) {
            emit('room:start', { roomId: roomInfo.id, playerId });
        }
    };

    const readyUp = () => {
        if (isMock && mockEngine.current) {
            // Auto ready
            return;
        }
        if (roomInfo && playerId) {
            emit('room:ready', { roomId: roomInfo.id });
        } else if (roomInfo && socket) {
            emit('room:ready', { roomId: roomInfo.id });
        }
    };

    const sendAction = (actionType: string, amount?: number) => {
        if (isMock && mockEngine.current) {
            const updated = mockEngine.current.handleAction('me', actionType, amount);
            setGameState(updated);

            // Trigger bot loop
            const loopBots = () => {
                setTimeout(() => {
                    if (mockEngine.current && mockEngine.current.processBotTurn) {
                        const freshState = mockEngine.current.processBotTurn();
                        setGameState(freshState);
                        // If still bot turn, continue
                        if (freshState.activePlayerPosition !== 0 && freshState.stage !== 'showdown') {
                            loopBots();
                        }
                    }
                }, 1000);
            };
            loopBots();
            return;
        }

        if (roomInfo && (playerId || socket)) {
            // Simplified payload as per requirement
            emit('game:action', { type: actionType, amount });
        }
    };

    const sendMessage = (text: string) => {
        if (isMock) {
            // Echo locally for now or ignore
            return;
        }
        if (roomInfo) {
            emit('game:chat', { roomId: roomInfo.id, message: text });
        }
    };

    // Auto-detect player ID from room updates if not set
    useEffect(() => {
        if (roomInfo && socket && !playerId && !isMock) {
            const me = roomInfo.players.find((p: any) => p.socketId === socket.id);
            if (me) setPlayerId(me.id);
        }
    }, [roomInfo, socket, playerId, isMock]);

    return (
        <GameContext.Provider value={{
            gameState,
            roomInfo,
            rooms,
            isConnected,
            error,
            joinRoom,
            createRoom,
            leaveRoom,
            resetGameState,
            startGame,
            sendAction,
            sendMessage,
            readyUp,
            playerId
        }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};
