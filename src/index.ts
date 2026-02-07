import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { createRoomFromHttp, registerSocketHandlers } from './network/socketHandlers.js';

const app = express();
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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${PORT}`);
});
