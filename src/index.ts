import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { createRoomFromHttp, registerSocketHandlers } from './network/socketHandlers.js';
import { listRooms } from './room/roomManager.js';

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.post('/api/room/create', (req, res) => {
  const { playerName, avatarId } = req.body as { playerName?: string; avatarId?: string };
  if (!playerName || !avatarId) {
    res.status(400).json({ message: 'Missing playerName or avatarId' });
    return;
  }
  const { room, player } = createRoomFromHttp(playerName, avatarId);
  res.json({ roomId: room.id, playerId: player.id });
});

app.get('/api/rooms/discover', (_req, res) => {
  const rooms = listRooms().map((room) => ({
    id: room.id,
    status: room.status,
    players: room.players.length,
    spectators: room.spectators.length,
    maxPlayers: 6,
    blinds: `${room.config.smallBlind}/${room.config.bigBlind}`
  }));
  res.json({ rooms });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  registerSocketHandlers(io, socket);
});

server.listen(3001, () => {
  console.log('Server listening on port 3001');
});
