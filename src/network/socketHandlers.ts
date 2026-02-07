import type { Server, Socket } from 'socket.io';
import type { GameActionPayload, Player, Room } from '../types.js';
import { applyAction, startGame } from '../game/engine.js';
import { createPlayer, markDisconnected, markReconnected } from '../player/playerManager.js';
import { createRoom, getRoom, joinRoom, leaveRoom, updateRoom } from '../room/roomManager.js';

const disconnectTimers = new Map<string, NodeJS.Timeout>();

function broadcastRoom(io: Server, room: Room): void {
  io.to(room.id).emit('room:updated', room);
}

export function registerSocketHandlers(io: Server, socket: Socket): void {
  socket.on('room:join', ({ roomId, playerName, avatarId }: { roomId: string; playerName: string; avatarId: string }) => {
    const room = getRoom(roomId);
    if (!room) {
      socket.emit('room:error', { message: 'Room not found' });
      return;
    }

    const existing = room.players.find((player) => player.name === playerName);
    if (existing && existing.status === 'offline') {
      const updated = markReconnected(existing, socket.id);
      Object.assign(existing, updated);
      const timer = disconnectTimers.get(existing.id);
      if (timer) {
        clearTimeout(timer);
        disconnectTimers.delete(existing.id);
      }
      socket.join(room.id);
      broadcastRoom(io, room);
      io.to(room.id).emit('player:reconnected', { playerId: existing.id });
      return;
    }

    const player = createPlayer({
      id: crypto.randomUUID(),
      socketId: socket.id,
      name: playerName,
      avatar: avatarId
    });
    joinRoom(room, player);
    socket.join(room.id);
    broadcastRoom(io, room);
  });

  socket.on('room:leave', ({ roomId, playerId }: { roomId: string; playerId: string }) => {
    const room = getRoom(roomId);
    if (!room) {
      return;
    }
    leaveRoom(room, playerId);
    socket.leave(roomId);
    broadcastRoom(io, room);
  });

  socket.on('room:kick', ({ roomId, playerId, targetId }: { roomId: string; playerId: string; targetId: string }) => {
    const room = getRoom(roomId);
    if (!room || room.hostId !== playerId || playerId === targetId) {
      return;
    }
    leaveRoom(room, targetId);
    io.to(roomId).emit('room:updated', room);
  });

  socket.on('player:ready', ({ roomId, playerId }: { roomId: string; playerId: string }) => {
    const room = getRoom(roomId);
    if (!room) {
      return;
    }
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.ready = true;
      updateRoom(room);
      broadcastRoom(io, room);
    }
  });

  socket.on('room:start', ({ roomId, playerId }: { roomId: string; playerId: string }) => {
    const room = getRoom(roomId);
    if (!room || room.hostId !== playerId) {
      return;
    }
    const allReady = room.players.filter((p) => !p.isAI).every((p) => p.ready);
    if (!allReady || room.players.length < 2) {
      socket.emit('room:error', { message: 'Not all players ready or too few players' });
      return;
    }
    startGame(room);
    io.to(roomId).emit('game:started', room.gameState);
    io.to(roomId).emit('room:updated', room);
  });

  socket.on('game:action', ({ roomId, playerId, action }: { roomId: string; playerId: string; action: GameActionPayload }) => {
    const room = getRoom(roomId);
    if (!room) {
      return;
    }
    const result = applyAction(room, playerId, action);
    if (result.error) {
      socket.emit('game:error', { message: result.error });
      return;
    }
    io.to(roomId).emit('game:actionResult', { playerId, action });
    io.to(roomId).emit('game:state', room.gameState);
    if (room.status === 'ended') {
      io.to(roomId).emit('game:ended', room.gameState);
    }
  });

  socket.on('game:chat', ({ roomId, message }: { roomId: string; message: string }) => {
    io.to(roomId).emit('game:chat', { message });
  });

  socket.on('disconnect', () => {
    const room = findRoomBySocket(io, socket.id);
    if (!room) {
      return;
    }
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) {
      return;
    }
    const updated = markDisconnected(player);
    Object.assign(player, updated);
    broadcastRoom(io, room);
    io.to(room.id).emit('player:disconnected', { playerId: player.id });

    const timer = setTimeout(() => {
      player.status = 'offline';
      player.handCards = [];
      if (room.gameState) {
        room.gameState.activePlayerIds = room.gameState.activePlayerIds.filter((id) => id !== player.id);
      }
      broadcastRoom(io, room);
    }, 30000);
    disconnectTimers.set(player.id, timer);
  });
}

function findRoomBySocket(io: Server, socketId: string): Room | undefined {
  const rooms = io.sockets.adapter.rooms;
  for (const [roomId, sockets] of rooms) {
    if (roomId !== socketId && sockets.has(socketId)) {
      return getRoom(roomId);
    }
  }
  return undefined;
}

export function createRoomFromHttp(playerName: string, avatarId: string): { room: Room; player: Player } {
  const player = createPlayer({ id: crypto.randomUUID(), socketId: '', name: playerName, avatar: avatarId });
  const room = createRoom(player);
  return { room, player };
}
