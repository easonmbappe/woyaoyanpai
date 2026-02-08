import type { Server, Socket } from 'socket.io';
import type { GameActionPayload, PlayerStatus, Room, RoundStage } from '../types.js';
import type {
  ActionResult,
  CommunityPayload,
  GameState as ClientGameState,
  HeroDeal,
  NewRound,
  PlayerAction,
  ShowdownResult,
  TurnPayload
} from '../types/index.js';
import { decideAction } from '../ai/aiEngine.js';
import { applyAction, startGame } from '../game/engine.js';
import { compareHands, evaluateBestHand, evaluateBestHandWithCards, type HandCategory } from '../game/handEvaluator.js';
import { createPlayer, markDisconnected, markReconnected } from '../player/playerManager.js';
import { createRoom, getRoom, joinRoom, leaveRoom, removeRoom, updateRoom } from '../room/roomManager.js';

const disconnectTimers = new Map<string, NodeJS.Timeout>();
const aiActionDelayMs = 600;

const handRankLabels: Record<HandCategory, string> = {
  'straight-flush': '同花顺',
  'four-kind': '四条',
  'full-house': '葫芦',
  flush: '同花',
  straight: '顺子',
  'three-kind': '三条',
  'two-pair': '两对',
  'one-pair': '一对',
  'high-card': '高牌'
};

const handRankEnglish: Record<HandCategory, string> = {
  'straight-flush': 'Straight Flush',
  'four-kind': 'Four of a Kind',
  'full-house': 'Full House',
  flush: 'Flush',
  straight: 'Straight',
  'three-kind': 'Three of a Kind',
  'two-pair': 'Two Pair',
  'one-pair': 'One Pair',
  'high-card': 'High Card'
};

function getHandRankLabel(evaluated: ReturnType<typeof evaluateBestHandWithCards>['hand']): string {
  if (evaluated.category === 'straight-flush' && evaluated.kickers[0] === 14) {
    return '皇家同花顺';
  }
  return handRankLabels[evaluated.category];
}

function getHandRankEnglish(evaluated: ReturnType<typeof evaluateBestHandWithCards>['hand']): string {
  if (evaluated.category === 'straight-flush' && evaluated.kickers[0] === 14) {
    return 'Royal Flush';
  }
  return handRankEnglish[evaluated.category];
}

type ClientPlayerStatus = ClientGameState['players'][number]['status'];

function toClientStatus(status: PlayerStatus): ClientPlayerStatus {
  return status === 'spectator' ? 'waiting' : status;
}

function emitConnection(socket: Socket, payload: { playerId: string; roomId?: string }): void {
  socket.emit('connection', payload);
}

function highestBet(roundBets: Record<string, number>): number {
  return Math.max(0, ...Object.values(roundBets));
}

function buildClientPlayers(
  room: Room,
  viewerId: string | undefined,
  stage: RoundStage | 'waiting',
  revealHeroCards: boolean,
  revealAtShowdown = true
): ClientGameState['players'] {
  const gameState = room.gameState;
  return room.players.map((player, index) => {
    const bet = gameState?.roundBets[player.id] ?? 0;
    const shouldReveal = (revealAtShowdown && stage === 'showdown') || (revealHeroCards && viewerId === player.id);
    return {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      chips: player.chips,
      bet,
      status: toClientStatus(player.status),
      cards: shouldReveal ? player.handCards : [],
      position: index
    };
  });
}

function buildClientGameState(
  room: Room,
  viewerId?: string,
  revealHeroCards = true,
  revealAtShowdown = true
): ClientGameState {
  const gameState = room.gameState;
  const stage = gameState?.currentRound ?? 'waiting';
  const currentBet = gameState ? highestBet(gameState.roundBets) : 0;
  const activePlayerPosition = gameState
    ? room.players.findIndex((player) => player.id === gameState.currentTurnPlayerId)
    : -1;

  return {
    roomId: room.id,
    stage: stage === 'waiting' ? 'waiting' : stage,
    pot: gameState?.pot ?? 0,
    currentBet,
    dealerPosition: gameState?.dealerPos ?? 0,
    activePlayerPosition,
    communityCards: gameState?.communityCards ?? [],
    players: buildClientPlayers(room, viewerId, stage, revealHeroCards, revealAtShowdown),
    minBet: gameState?.bigBlind ?? room.config.bigBlind
  };
}

function buildRoomUpdate(room: Room): {
  id: string;
  hostId: string;
  players: Array<{ id: string; name: string; isHost: boolean; isReady: boolean } | null>;
  spectators: Array<{ id: string; name: string }>;
  status: Room['status'];
} {
  const seats = Array.from({ length: 6 }, (_, index) => {
    const player = room.players[index];
    if (!player) {
      return null;
    }
    return {
      id: player.id,
      name: player.name,
      isHost: player.id === room.hostId,
      isReady: player.ready
    };
  });

  return {
    id: room.id,
    hostId: room.hostId,
    players: seats,
    spectators: room.spectators.map((spectator) => ({ id: spectator.id, name: spectator.name })),
    status: room.status
  };
}

function buildNewRound(room: Room): NewRound {
  return {
    roomId: room.id,
    dealerPosition: room.gameState?.dealerPos ?? 0,
    smallBlind: room.config.smallBlind,
    bigBlind: room.config.bigBlind,
    pot: 0,
    communityCards: [],
    stage: 'preflop',
    players: room.players.map((player, index) => ({
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      chips: player.chips,
      status: toClientStatus(player.status),
      cards: [],
      position: index,
      bet: 0
    }))
  };
}

function buildShowdown(room: Room): ShowdownResult {
  const gameState = room.gameState;
  if (!gameState) {
    return {
      winnerId: '',
      winnerName: '',
      handRank: '',
      winAmount: 0,
      winners: [],
      playerHands: []
    };
  }
  const activePlayers = room.players.filter((player) => gameState.activePlayerIds.includes(player.id));
  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    return {
      winnerId: winner.id,
      winnerName: winner.name,
      handRank: 'All Others Folded',
      winAmount: gameState.pot,
      winners: [
        {
          playerId: winner.id,
          name: winner.name,
          handRank: 'All Others Folded',
          handRankChinese: '其他玩家弃牌',
          winAmount: gameState.pot,
          bestHand: [],
          holeCards: winner.handCards
        }
      ],
      playerHands: [],
      winner: {
        id: winner.id,
        name: winner.name,
        handRank: '其他玩家弃牌',
        bestHand: [],
        holeCards: winner.handCards
      }
    };
  }
  if (gameState.communityCards.length + 2 < 5) {
    console.warn('[game:showdown] not enough cards', {
      communityCount: gameState.communityCards.length
    });
    return {
      winnerId: '',
      winnerName: '',
      handRank: '',
      winAmount: gameState.pot,
      winners: [],
      playerHands: room.players
        .filter((player) => gameState.activePlayerIds.includes(player.id))
        .map((player) => ({
          playerId: player.id,
          name: player.name,
          holeCards: player.handCards,
          cards: player.handCards,
          handRank: ''
        }))
    };
  }
  const livePlayers = activePlayers;
  const playerHands = livePlayers.map((player) => {
    const evaluated = evaluateBestHandWithCards([...player.handCards, ...gameState.communityCards]);
    return {
      playerId: player.id,
      name: player.name,
      holeCards: player.handCards,
      cards: player.handCards,
      handRank: getHandRankLabel(evaluated.hand)
    };
  });

  let winner = livePlayers[0];
  for (const player of livePlayers.slice(1)) {
    if (winner && compareHands(player.handCards, winner.handCards, gameState.communityCards) > 0) {
      winner = player;
    }
  }

  const winnerEval = winner
    ? evaluateBestHandWithCards([...winner.handCards, ...gameState.communityCards])
    : undefined;
  const winnerRank = winnerEval ? getHandRankLabel(winnerEval.hand) : '';
  const winnerRankEnglish = winnerEval ? getHandRankEnglish(winnerEval.hand) : '';
  const winners = winner && winnerEval
    ? [{
        playerId: winner.id,
        name: winner.name,
        handRank: winnerRankEnglish,
        handRankChinese: winnerRank,
        winAmount: gameState.pot,
        bestHand: winnerEval.cards,
        holeCards: winner.handCards
      }]
    : [];

  return {
    winnerId: winner?.id ?? '',
    winnerName: winner?.name ?? '',
    handRank: winnerRankEnglish || winnerRank,
    winAmount: gameState.pot,
    winners,
    playerHands,
    winner: winner
      ? {
          id: winner.id,
          name: winner.name,
          handRank: winnerRank,
          bestHand: winnerEval?.cards ?? [],
          holeCards: winner.handCards
        }
      : undefined
  };
}

function buildActionResult(room: Room, playerId: string, action: PlayerAction): ActionResult {
  const gameState = room.gameState;
  const player = room.players.find((item) => item.id === playerId);
  return {
    playerId,
    action,
    pot: gameState?.pot ?? 0,
    roundBet: gameState?.roundBets[playerId] ?? 0,
    chips: player?.chips ?? 0,
    status: toClientStatus(player?.status ?? 'active')
  };
}

function emitTurn(io: Server, room: Room): void {
  if (!room.gameState?.currentTurnPlayerId) {
    return;
  }
  const payload: TurnPayload = {
    playerId: room.gameState.currentTurnPlayerId,
    timeout: Math.round(room.config.timeoutMs / 1000)
  };
  console.log('[game:turn]', payload);
  io.to(room.id).emit('game:turn', payload);
}

function emitCommunity(io: Server, room: Room, stage: CommunityPayload['stage']): void {
  if (!room.gameState) {
    return;
  }
  const payload: CommunityPayload = {
    cards: room.gameState.communityCards,
    stage
  };
  console.log('[game:community]', { stage, count: payload.cards.length });
  io.to(room.id).emit('game:community', payload);
}

function emitStateToHumans(io: Server, room: Room, revealHeroCards = true): void {
  room.players.filter((player) => !player.isAI).forEach((player) => {
    if (!player.socketId) {
      return;
    }
    console.log('[game:state]', { playerId: player.id, stage: room.gameState?.currentRound ?? 'waiting' });
    io.to(player.socketId).emit('game:state', buildClientGameState(room, player.id, revealHeroCards));
  });
  room.spectators.forEach((spectator) => {
    if (!spectator.socketId) {
      return;
    }
    console.log('[game:state]', { spectatorId: spectator.id, stage: room.gameState?.currentRound ?? 'waiting' });
    io.to(spectator.socketId).emit('game:state', buildClientGameState(room, undefined, false, false));
  });
}

function emitStartToHumans(io: Server, room: Room): void {
  room.players.filter((player) => !player.isAI).forEach((player) => {
    if (!player.socketId) {
      return;
    }
    console.log('[game:start]', { playerId: player.id, roomId: room.id });
    io.to(player.socketId).emit('game:start', buildClientGameState(room, player.id, false));
  });
}

function emitDealToHumans(io: Server, room: Room): void {
  room.players.filter((player) => !player.isAI).forEach((player) => {
    if (!player.socketId) {
      return;
    }
    const payload: HeroDeal = {
      playerId: player.id,
      cards: player.handCards
    };
    console.log('[game:deal]', { playerId: player.id, count: payload.cards.length });
    io.to(player.socketId).emit('game:deal', payload);
  });
}

function startRoundFlow(io: Server, room: Room): void {
  console.log('[game:newRound]', { roomId: room.id });
  io.to(room.id).emit('game:newRound', buildNewRound(room));
  startGame(room);
  emitStartToHumans(io, room);
  emitDealToHumans(io, room);
  emitTurn(io, room);
  emitStateToHumans(io, room, true);
  runAIActions(io, room);
}

function runAIActions(io: Server, room: Room): void {
  if (!room.gameState) {
    return;
  }
  const currentId = room.gameState.currentTurnPlayerId;
  if (!currentId) {
    return;
  }
  const activePlayer = room.players.find((player) => player.id === currentId);
  if (!activePlayer || !activePlayer.isAI) {
    return;
  }

  const highest = highestBet(room.gameState.roundBets);
  const toCall = highest - (room.gameState.roundBets[currentId] ?? 0);
  const action = decideAction({
    player: activePlayer,
    gameState: room.gameState,
    opponents: room.players.filter((player) => player.id !== currentId),
    toCall,
    positionIndex: room.players.findIndex((player) => player.id === currentId),
    pot: room.gameState.pot,
    style: activePlayer.aiStyle ?? 'balanced',
    randomSeed: activePlayer.randomSeed
  });

  setTimeout(() => {
    const beforeStage = room.gameState?.currentRound;
    const result = applyAction(room, currentId, action as GameActionPayload);
    if (result.error) {
      io.to(room.id).emit('game:error', { message: result.error });
      return;
    }
    io.to(room.id).emit('game:actionResult', buildActionResult(room, currentId, action));

    if (room.status === 'ended') {
      const payload = buildShowdown(room);
      console.log('[Showdown] Emitting payload:', JSON.stringify(payload, null, 2));
      io.to(room.id).emit('game:showdown', payload);
      console.log('[Showdown] Emitted to room:', room.id);
      return;
    }

    const afterStage = room.gameState?.currentRound;
    if (beforeStage !== afterStage && afterStage && afterStage !== 'preflop' && afterStage !== 'showdown') {
      emitCommunity(io, room, afterStage);
    }

    emitTurn(io, room);
    emitStateToHumans(io, room, true);
    runAIActions(io, room);
  }, aiActionDelayMs);
}

export function registerSocketHandlers(io: Server, socket: Socket): void {
  if (!socket.data.playerId) {
    socket.data.playerId = crypto.randomUUID();
  }
  emitConnection(socket, { playerId: socket.data.playerId });

  socket.on(
    'room:create',
    (
      { playerName, avatarId, smallBlind, bigBlind, isSolo, botCount }: {
        playerName: string;
        avatarId?: string;
        smallBlind?: number;
        bigBlind?: number;
        isSolo?: boolean;
        botCount?: number;
      },
      callback?: (payload: { playerId: string; roomId: string }) => void
    ) => {
      console.log('[room:create]', { playerName, isSolo, botCount, smallBlind, bigBlind });
      if (!playerName) {
        socket.emit('game:error', { message: 'Missing playerName' });
        return;
      }
      const playerId = socket.data.playerId ?? crypto.randomUUID();
      socket.data.playerId = playerId;
      const player = createPlayer({
        id: playerId,
        socketId: socket.id,
        name: playerName,
        avatar: avatarId ?? 'avatar-1',
        isAI: false
      });
      const soloMode = isSolo === true;
      const room = createRoom(player, { smallBlind, bigBlind });
      room.isSolo = soloMode;
      room.players[0] = player;
      room.hostId = player.id;
      console.log('[CreateRoom] Host auto-seated:', player.id, 'at seat 0');
      const bots = soloMode ? Math.min(Math.max(botCount ?? 0, 1), 5) : 0;
      const stylePool: Array<'aggressive' | 'conservative' | 'balanced'> = [
        'aggressive',
        'aggressive',
        'conservative',
        'balanced',
        'balanced'
      ];
      for (let i = 0; i < bots; i += 1) {
        const style = stylePool[i % stylePool.length];
        const bot = createPlayer({
          id: crypto.randomUUID(),
          socketId: '',
          name: `Bot-${i + 1}`,
          avatar: `avatar-bot-${i + 1}`,
          isAI: true,
          aiStyle: style,
          randomSeed: Math.floor(Math.random() * 1_000_000_000)
        });
        bot.ready = true;
        joinRoom(room, bot);
      }
      player.ready = soloMode;
      if (soloMode) {
        player.status = 'ready';
      }
      socket.join(room.id);
      socket.data.roomId = room.id;
      emitConnection(socket, { playerId: player.id, roomId: room.id });
      if (callback) {
        callback({ playerId: player.id, roomId: room.id });
      }
      socket.emit('room:created', {
        roomId: room.id,
        player,
        seatIndex: 0,
        isHost: true
      });
      io.to(room.id).emit('room:updated', buildRoomUpdate(room));
      if (soloMode) {
        console.log('[room:create] start solo round', { roomId: room.id });
        try {
          startRoundFlow(io, room);
        } catch (error) {
          console.error('[room:create] startRoundFlow failed', error);
        }
        return;
      }
      emitStateToHumans(io, room, false);
    }
  );

  socket.on(
    'room:leave',
    ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      const socketPlayerId = socket.data.playerId as string | undefined;
      if (socketPlayerId && socketPlayerId !== playerId) {
        console.warn('[room:leave] ignored mismatched player', { roomId, playerId, socketPlayerId });
        return;
      }
      const room = getRoom(roomId);
      if (!room) {
        return;
      }
      console.log('[room:leave]', { roomId, playerId });
      const leaving = room.players.find((player) => player.id === playerId)
        ?? room.spectators.find((player) => player.id === playerId);
      if (leaving && room.hostId === leaving.id) {
        io.to(room.id).emit('game:error', { message: 'Host left, room closed' });
        removeRoom(room.id);
        return;
      }
      leaveRoom(room, playerId);
      io.to(room.id).emit('room:updated', buildRoomUpdate(room));
    }
  );

  socket.on(
    'room:join',
    (
      { roomId, playerName, avatarId }: { roomId: string; playerName: string; avatarId?: string },
      callback?: (payload: { playerId: string; roomId: string }) => void
    ) => {
      const room = getRoom(roomId);
      if (!room) {
        socket.emit('game:error', { message: 'Room not found' });
        return;
      }
      if (!playerName) {
        socket.emit('game:error', { message: 'Missing playerName' });
        return;
      }

      const offlineMatch = room.players.find((player) => player.name === playerName);
      if (offlineMatch && offlineMatch.status === 'offline') {
        const updated = markReconnected(offlineMatch, socket.id);
        Object.assign(offlineMatch, updated);
        const timer = disconnectTimers.get(offlineMatch.id);
        if (timer) {
          clearTimeout(timer);
          disconnectTimers.delete(offlineMatch.id);
        }
        socket.join(room.id);
        socket.data.playerId = offlineMatch.id;
        socket.data.roomId = room.id;
        emitConnection(socket, { playerId: offlineMatch.id, roomId: room.id });
        if (callback) {
          callback({ playerId: offlineMatch.id, roomId: room.id });
        }
        socket.emit('game:state', buildClientGameState(room, offlineMatch.id, true));
        return;
      }

      const playerId = socket.data.playerId ?? crypto.randomUUID();
      socket.data.playerId = playerId;
      if (room.isSolo) {
        room.players = room.players.filter((seat) => !seat.isAI);
        room.isSolo = false;
      }

      const existingSeat = room.players.find((item) => item.id === playerId)
        ?? room.spectators.find((item) => item.id === playerId);
      if (existingSeat) {
        existingSeat.socketId = socket.id;
        socket.join(room.id);
        socket.data.roomId = room.id;
        emitConnection(socket, { playerId: existingSeat.id, roomId: room.id });
        if (callback) {
          callback({ playerId: existingSeat.id, roomId: room.id });
        }
        const isSpectator = room.spectators.some((item) => item.id === existingSeat.id);
        if (isSpectator) {
          socket.emit('game:state', buildClientGameState(room, undefined, false, false));
        } else {
          socket.emit('game:state', buildClientGameState(room, existingSeat.id, false));
        }
        io.to(room.id).emit('room:updated', buildRoomUpdate(room));
        return;
      }

      const player = createPlayer({
        id: playerId,
        socketId: socket.id,
        name: playerName,
        avatar: avatarId ?? 'avatar-1'
      });
      const asSpectator = room.status === 'playing';
      joinRoom(room, player, { asSpectator });
      socket.join(room.id);
      socket.data.roomId = room.id;
      emitConnection(socket, { playerId: player.id, roomId: room.id });
      if (callback) {
        callback({ playerId: player.id, roomId: room.id });
      }
      if (asSpectator) {
        socket.emit('game:state', buildClientGameState(room, undefined, false, false));
      } else {
        socket.emit('game:state', buildClientGameState(room, player.id, false));
      }
      io.to(room.id).emit('room:updated', buildRoomUpdate(room));
    }
  );

  socket.on('room:ready', () => {
    const roomId = socket.data.roomId as string | undefined;
    const playerId = socket.data.playerId as string | undefined;
    if (!roomId || !playerId) {
      return;
    }
    const room = getRoom(roomId);
    if (!room) {
      return;
    }
    const player = room.players.find((item) => item.id === playerId);
    if (player) {
      console.log('[room:ready]', { roomId, playerId });
      player.ready = true;
      player.status = 'ready';
      updateRoom(room);
      io.to(room.id).emit('room:updated', buildRoomUpdate(room));
      emitStateToHumans(io, room, false);
    }
  });

  socket.on('room:start', () => {
    const roomId = socket.data.roomId as string | undefined;
    const playerId = socket.data.playerId as string | undefined;
    if (!roomId || !playerId) {
      return;
    }
    const room = getRoom(roomId);
    if (!room || room.hostId !== playerId) {
      socket.emit('game:error', { message: 'Only host can start' });
      return;
    }
    const allReady = room.players.filter((player) => !player.isAI).every((player) => player.ready);
    if (!allReady || room.players.length < 2) {
      socket.emit('game:error', { message: 'Not all players ready or too few players' });
      return;
    }

    startRoundFlow(io, room);
  });

  socket.on('game:action', (action: PlayerAction) => {
    const roomId = socket.data.roomId as string | undefined;
    const playerId = socket.data.playerId as string | undefined;
    console.log('[Action] Received:', action);
    console.log('[Action] From player:', socket.id);
    console.log('[Action] Current player:', roomId ? getRoom(roomId)?.gameState?.currentTurnPlayerId : undefined);
    console.log('[game:action]', { roomId, playerId, action });
    if (!roomId || !playerId) {
      return;
    }
    const room = getRoom(roomId);
    if (!room) {
      return;
    }
    const beforeStage = room.gameState?.currentRound;
    const result = applyAction(room, playerId, action as GameActionPayload);
    if (result.error) {
      socket.emit('game:error', { message: result.error });
      return;
    }
    io.to(room.id).emit('game:actionResult', buildActionResult(room, playerId, action));

    if (room.status === 'ended') {
      const payload = buildShowdown(room);
      console.log('[Showdown] Emitting payload:', JSON.stringify(payload, null, 2));
      io.to(room.id).emit('game:showdown', payload);
      console.log('[Showdown] Emitted to room:', room.id);
      return;
    }

    const afterStage = room.gameState?.currentRound;
    if (beforeStage !== afterStage && afterStage && afterStage !== 'preflop' && afterStage !== 'showdown') {
      emitCommunity(io, room, afterStage);
    }

    emitTurn(io, room);
    emitStateToHumans(io, room, true);
    runAIActions(io, room);
  });

  socket.on('game:chat', ({ message }: { message: string }) => {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) {
      return;
    }
    io.to(roomId).emit('game:chat', { message });
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) {
      return;
    }
    const room = getRoom(roomId);
    if (!room) {
      return;
    }
    const player = room.players.find((item) => item.socketId === socket.id);
    if (!player) {
      return;
    }
    if (player.id === room.hostId) {
      const existingTimer = disconnectTimers.get(player.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      const updated = markDisconnected(player);
      Object.assign(player, updated);
      updateRoom(room);
      const timer = setTimeout(() => {
        const latestRoom = getRoom(room.id);
        if (!latestRoom) {
          return;
        }
        const host = latestRoom.players.find((item) => item.id === player.id);
        if (host?.status === 'offline') {
          io.to(latestRoom.id).emit('game:error', { message: 'Host left, room closed' });
          removeRoom(latestRoom.id);
        }
      }, 30000);
      disconnectTimers.set(player.id, timer);
      return;
    }
    const updated = markDisconnected(player);
    Object.assign(player, updated);
    io.to(room.id).emit('game:error', { message: `${player.name} disconnected` });

    const timer = setTimeout(() => {
      player.status = 'offline';
      player.handCards = [];
      if (room.gameState) {
        room.gameState.activePlayerIds = room.gameState.activePlayerIds.filter((id) => id !== player.id);
      }
    }, 30000);
    disconnectTimers.set(player.id, timer);
  });
}

export function createRoomFromHttp(playerName: string, avatarId: string): { room: Room; player: ReturnType<typeof createPlayer> } {
  const player = createPlayer({
    id: crypto.randomUUID(),
    socketId: '',
    name: playerName,
    avatar: avatarId,
    isAI: false
  });
  const room = createRoom(player);
  room.isSolo = false;
  return { room, player };
}
