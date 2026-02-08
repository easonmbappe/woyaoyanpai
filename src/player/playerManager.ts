import type { Player } from '../types.js';

export function createPlayer(params: {
  id: string;
  socketId: string;
  name: string;
  avatar: string;
  chips?: number;
  isAI?: boolean;
  aiStyle?: Player['aiStyle'];
  randomSeed?: number;
}): Player {
  return {
    id: params.id,
    socketId: params.socketId,
    name: params.name,
    avatar: params.avatar,
    chips: params.chips ?? 1000,
    status: 'waiting',
    handCards: [],
    isAI: params.isAI ?? false,
    ready: false,
    aiStyle: params.aiStyle,
    randomSeed: params.randomSeed
  };
}

export function markDisconnected(player: Player, timestamp = Date.now()): Player {
  return { ...player, status: 'offline', disconnectedAt: timestamp };
}

export function markReconnected(player: Player, socketId: string): Player {
  const { disconnectedAt: _disconnectedAt, ...rest } = player;
  return { ...rest, socketId, status: 'active' };
}
