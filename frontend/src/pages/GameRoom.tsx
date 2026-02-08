import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Table from '../components/Table';
import ActionPanel from '../components/ActionPanel';
import ChatBox from '../components/ChatBox';
import SettlementModal from '../components/SettlementModal';
import { useGame } from '../hooks/useGameState';
import type { GameState } from '../types';

const GameRoom: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const cachedName = localStorage.getItem('playerName');
    const playerName = searchParams.get('name') || cachedName || 'Guest';
    const navigate = useNavigate();
    const roomIdRef = useRef<string | null>(null);
    const joinedRef = useRef(false);
    const [dismissSettlement, setDismissSettlement] = useState(false);

    const {
        gameState,
        roomInfo,
        joinRoom,
        isConnected,
        playerId,
        sendAction,
        startGame,
        readyUp,
        sendMessage,
        error: gameError,
        leaveRoom
    } = useGame();

    useEffect(() => {
        if (id && (isConnected || id === 'solo') && !gameState && !roomInfo) {
            // Try to join if not already associated (page refresh)
            joinRoom(id, playerName);
        }
    }, [id, isConnected, playerName]);

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

    useEffect(() => {
        if (id) {
            roomIdRef.current = id;
        }
    }, [id]);

    useEffect(() => {
        if (id && (roomInfo?.id === id || gameState?.roomId === id)) {
            joinedRef.current = true;
        }
    }, [id, roomInfo?.id, gameState?.roomId]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            if (joinedRef.current && roomIdRef.current && roomIdRef.current !== 'solo') {
                leaveRoom(roomIdRef.current);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [leaveRoom]);

    useEffect(() => {
        if (gameError && gameError.includes('Host left')) {
            navigate('/lobby');
        }
    }, [gameError, navigate]);

    const isLoading = !gameState && !roomInfo;
    const shouldUseRoomInfo = Boolean(dismissSettlement && gameState?.stage === 'showdown');

    // Use either gameState (active) or roomInfo (waiting) to display players
    // We prefer gameState if available.
    const activeState = (gameState && !shouldUseRoomInfo) ? gameState : {
        // Fallback state from roomInfo if game hasn't started
        players: Array.from({ length: 6 }, (_, i) => {
            const seat = roomInfo?.players?.[i] ?? null;
            if (!seat) {
                return {
                    id: `empty-${i}`,
                    name: 'Empty Seat',
                    avatar: 'avatar-1',
                    chips: 0,
                    bet: 0,
                    status: 'waiting',
                    cards: [],
                    position: i,
                    isEmpty: true
                } as any;
            }
            return {
                id: seat.id,
                name: seat.name,
                avatar: seat.avatar || 'avatar-1',
                chips: 1000,
                bet: 0,
                status: seat.isReady ? 'ready' : 'waiting',
                cards: [],
                position: i,
                isHost: seat.isHost
            } as any;
        }),
        communityCards: [],
        pot: 0,
        stage: 'waiting',
        activePlayerPosition: -1,
        roomId: id || '',
        currentBet: 0,
        dealerPosition: 0,
        minBet: 0
    } as GameState;

    const isHost = Boolean(roomInfo?.hostId && playerId && roomInfo.hostId === playerId);
    // Simplified host check:
    // We need to know who we are. `playerId` from context.

    // Action Panel Logic
    const myPlayer = activeState.players.find(p => p.id === playerId)
        || (roomInfo?.seatIndex !== undefined
            ? activeState.players.find(p => p.position === roomInfo.seatIndex)
            : undefined);
    const isMyTurn = myPlayer && activeState.activePlayerPosition === myPlayer.position;
    const isSpectator = !myPlayer || myPlayer.status === 'waiting';
    const allReady = useMemo(() => {
        return activeState.players
            .filter(player => !player.isEmpty)
            .every(player => player.status === 'ready');
    }, [activeState.players]);

    useEffect(() => {
        if (gameState?.stage !== 'showdown') {
            setDismissSettlement(false);
        }
    }, [gameState?.stage]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
                Connecting to Room {id}...
            </div>
        );
    }

    return (
        <div className="w-full h-screen relative">
            <Table gameState={activeState as any} userParams={{ id: playerId || '' }}>
                {/* Overlays */}

                {/* Spectator Mode Banner */}
                {isSpectator && activeState.stage !== 'waiting' && (
                    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-1 rounded-full text-sm border border-white/20 z-40 backdrop-blur-sm">
                        👀 观战模式 - 等待空位加入
                    </div>
                )}

                {/* Start Button Overlay */}
                {activeState.stage === 'waiting' && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/60 p-8 rounded-xl text-center z-50 backdrop-blur-sm">
                        <h2 className="text-2xl text-gold font-bold mb-4">Waiting for players</h2>
                        <div className="text-white mb-4">Room ID: {id}</div>
                        {myPlayer?.status !== 'ready' && (
                            <button
                                onClick={readyUp}
                                className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-lg font-bold text-xl shadow-lg"
                            >
                                {myPlayer ? '准备' : '申请入座'}
                            </button>
                        )}
                        {myPlayer?.status === 'ready' && !isHost && (
                            <div className="text-green-400 font-bold">READY! Waiting for host...</div>
                        )}
                        {/* Host Start Button - Assuming we can check host */}
                        {isHost && (
                            <button
                                onClick={startGame}
                                disabled={!allReady}
                                className={`block mt-4 text-sm underline mx-auto ${
                                    allReady ? 'text-gray-200 hover:text-white' : 'text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                Start Game
                            </button>
                        )}
                    </div>
                )}

                {/* Settlement Modal (Showdown) */}
                <AnimatePresence>
                    {activeState.stage === 'showdown' && !dismissSettlement && (
                        <SettlementModal
                            key="settlement"
                            winnerName={activeState.players.find(p => p.isWinner)?.name}
                            winnerHand={activeState.players.find(p => p.isWinner)?.handRank}
                            bestCards={activeState.players.find(p => p.isWinner)?.bestHand}
                            potAmount={activeState.pot}
                            onNextHand={() => {
                                readyUp();
                                setDismissSettlement(true);
                            }}
                            onLeave={() => {
                                if (id && id !== 'solo') {
                                    leaveRoom(id);
                                }
                                navigate('/lobby');
                            }}
                            isLoading={false} // Todo: Connect to backend loading state
                        />
                    )}
                </AnimatePresence>

                {/* Action Panel - Only Show if it's my turn and game is active */}
                {isMyTurn && activeState.stage !== 'waiting' && (
                    <ActionPanel
                        onAction={(type, amount) => sendAction(type, amount)}
                        currentBet={activeState.currentBet}
                        minBet={activeState.minBet}
                        userChips={myPlayer?.chips || 0}
                        callAmount={activeState.currentBet - (myPlayer?.bet || 0)}
                        canCheck={activeState.currentBet === (myPlayer?.bet || 0)}
                    />
                )}

                {/* Chat Box */}
                <div className="absolute top-4 right-4 w-80 z-40 hidden md:block">
                    <ChatBox
                        messages={[]} // Todo: Hook up messages from context
                        onSendMessage={sendMessage}
                        className="shadow-xl"
                    />
                </div>

                {/* Mobile Menu / Leave */}
                <div className="absolute top-4 left-4 z-50">
                    <button
                        onClick={() => navigate('/lobby')}
                        className="bg-gray-800/80 text-white px-4 py-2 rounded hover:bg-gray-700"
                    >
                        Exit
                    </button>
                </div>

            </Table>
        </div>
    );
};

export default GameRoom;
