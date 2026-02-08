import { io } from 'socket.io-client';

type GameState = {
  roomId: string;
  stage: string;
  pot: number;
  currentBet: number;
  activePlayerPosition: number;
  players: Array<{ id: string; name: string; bet: number }>;
};

const baseUrl = process.env.WS_URL ?? 'http://localhost:3001';
const hostName = process.env.HOST_NAME ?? 'Tester';
const hostAvatar = process.env.HOST_AVATAR ?? 'avatar-1';
const exitOnEnd = process.env.EXIT_ON_END === '1';

function logEvent(label: string, payload: unknown): void {
  const text = payload ? JSON.stringify(payload, null, 2) : '';
  console.log(`\n[${label}] ${text}`);
}

async function main(): Promise<void> {
  const socket = io(baseUrl, { transports: ['websocket'] });
  let heroId = '';
  let latestState: GameState | null = null;

  socket.on('connect', () => {
    socket.emit('room:create', {
      playerName: hostName,
      avatarId: hostAvatar,
      isSolo: true,
      botCount: 5,
      smallBlind: 10,
      bigBlind: 20
    });
  });

  socket.on('connection', (payload: { playerId: string; roomId?: string }) => {
    logEvent('connection', payload);
    if (payload.playerId) {
      heroId = payload.playerId;
    }
    if (payload.roomId) {
      socket.emit('room:ready', {});
      socket.emit('room:start', {});
    }
  });

  socket.on('game:start', (state: GameState) => logEvent('game:start', state));
  socket.on('game:newRound', (payload: unknown) => logEvent('game:newRound', payload));
  socket.on('game:deal', (payload: unknown) => logEvent('game:deal', payload));
  socket.on('game:community', (payload: unknown) => logEvent('game:community', payload));
  socket.on('game:showdown', (payload: unknown) => {
    logEvent('game:showdown', payload);
    if (exitOnEnd) {
      socket.disconnect();
      process.exit(0);
    }
  });

  socket.on('game:state', (state: GameState) => {
    logEvent('game:state', state);
    latestState = state;
  });

  socket.on('game:turn', (payload: { playerId: string }) => {
    logEvent('game:turn', payload);
    if (payload.playerId !== heroId) {
      return;
    }
    const hero = latestState?.players.find((player) => player.id === heroId);
    const toCall = latestState ? Math.max(latestState.currentBet - (hero?.bet ?? 0), 0) : 0;
    socket.emit('game:action', { type: toCall > 0 ? 'call' : 'check' });
  });

  socket.on('game:actionResult', (payload: unknown) => logEvent('game:actionResult', payload));
  socket.on('game:error', (payload: unknown) => logEvent('game:error', payload));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
