import type { Player, Room, RoomConfig } from '../types.js';

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  let id = '';
  while (id.length < 6) {
    id += Math.floor(Math.random() * 10).toString();
  }
  if (rooms.has(id)) {
    return generateRoomId();
  }
  return id;
}

export function createRoom(host: Player, config?: Partial<RoomConfig>): Room {
  const roomId = generateRoomId();
  const room: Room = {
    id: roomId,
    hostId: host.id,
    players: [host],
    spectators: [],
    status: 'waiting',
    config: {
      smallBlind: config?.smallBlind ?? 5,
      bigBlind: config?.bigBlind ?? 10,
      timeoutMs: config?.timeoutMs ?? 45000
    }
  };
  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function updateRoom(room: Room): void {
  rooms.set(room.id, room);
}

export function removeRoom(roomId: string): void {
  rooms.delete(roomId);
}

export function joinRoom(room: Room, player: Player): Room {
  if (room.players.length < 6) {
    room.players.push(player);
  } else {
    room.spectators.push({ ...player, status: 'spectator' });
  }
  updateRoom(room);
  return room;
}

export function leaveRoom(room: Room, playerId: string): Room {
  room.players = room.players.filter((player) => player.id !== playerId);
  room.spectators = room.spectators.filter((player) => player.id !== playerId);
  if (room.players.length === 0) {
    removeRoom(room.id);
    return room;
  }
  if (room.hostId === playerId) {
    room.hostId = room.players[0].id;
  }
  updateRoom(room);
  return room;
}

export function listRooms(): Room[] {
  return Array.from(rooms.values());
}
