import { createDeck, dealCards, shuffle } from '../src/game/cards.js';
import type { GameState, Player, Room, RoundStage, SidePot } from '../src/types.js';

type Options = {
  players: number;
  stage: RoundStage;
  revealAll: boolean;
  roomId: string;
  heroName: string;
};

const DEFAULTS: Options = {
  players: 4,
  stage: 'preflop',
  revealAll: false,
  roomId: '123456',
  heroName: 'Hero'
};

const args = process.argv.slice(2);

function readArg(key: string): string | undefined {
  const entry = args.find((value) => value.startsWith(`${key}=`));
  return entry ? entry.split('=')[1] : undefined;
}

const playerCount = Number(readArg('--players') ?? DEFAULTS.players);
const stage = (readArg('--stage') ?? DEFAULTS.stage) as RoundStage;
const revealAll = (readArg('--revealAll') ?? `${DEFAULTS.revealAll}`) === 'true';
const roomId = readArg('--roomId') ?? DEFAULTS.roomId;
const heroName = readArg('--heroName') ?? DEFAULTS.heroName;

const config = {
  smallBlind: 5,
  bigBlind: 10,
  timeoutMs: 45000
};

let deck = shuffle(createDeck());

const players: Player[] = Array.from({ length: playerCount }, (_, index) => {
  const { cards, remaining } = dealCards(deck, 2);
  deck = remaining;
  const isHero = index === 0;
  return {
    id: `player-${index + 1}`,
    socketId: `socket-${index + 1}`,
    name: isHero ? heroName : `Bot-${index}`,
    avatar: `avatar-${index + 1}`,
    chips: 1000 - index * 10,
    status: 'active',
    handCards: revealAll || isHero ? cards : [],
    isAI: !isHero,
    ready: true
  };
});

const communityCardsCount = stage === 'flop' ? 3 : stage === 'turn' ? 4 : stage === 'river' || stage === 'showdown' ? 5 : 0;
const communityCards = communityCardsCount > 0 ? dealCards(deck, communityCardsCount).cards : [];
const roundBets: Record<string, number> = {};
const totalBets: Record<string, number> = {};

players.forEach((player) => {
  roundBets[player.id] = 0;
  totalBets[player.id] = 0;
});

const smallBlindIndex = players.length > 1 ? 1 : 0;
const bigBlindIndex = players.length > 2 ? 2 : players.length > 1 ? 1 : 0;

let pot = 0;
if (stage === 'preflop') {
  const smallBlindPlayer = players[smallBlindIndex];
  const bigBlindPlayer = players[bigBlindIndex];
  roundBets[smallBlindPlayer.id] = config.smallBlind;
  roundBets[bigBlindPlayer.id] = config.bigBlind;
  totalBets[smallBlindPlayer.id] = config.smallBlind;
  totalBets[bigBlindPlayer.id] = config.bigBlind;
  pot = config.smallBlind + config.bigBlind;
} else {
  players.forEach((player) => {
    totalBets[player.id] = config.bigBlind * 4;
  });
  pot = players.length * config.bigBlind * 4;
}

const sidePots: SidePot[] = stage === 'showdown'
  ? [{ amount: pot, eligiblePlayerIds: players.map((player) => player.id) }]
  : [];

const gameState: GameState = {
  deck,
  communityCards,
  pot,
  sidePots,
  currentRound: stage,
  dealerPos: 0,
  activePlayerIds: players.map((player) => player.id),
  currentTurnPlayerId: stage === 'showdown' ? undefined : players[0]?.id,
  smallBlind: config.smallBlind,
  bigBlind: config.bigBlind,
  roundBets,
  totalBets,
  lastRaiseAmount: config.bigBlind
};

const room: Room = {
  id: roomId,
  hostId: players[0]?.id ?? 'player-1',
  players,
  spectators: [],
  status: stage === 'showdown' ? 'ended' : 'playing',
  config,
  gameState
};

const output = {
  meta: {
    generatedAt: new Date().toISOString(),
    stage,
    heroPlayerId: players[0]?.id ?? 'player-1'
  },
  roomUpdated: room,
  gameStarted: gameState,
  gameState,
  gameEnded: stage === 'showdown' ? gameState : null
};

console.log(JSON.stringify(output, null, 2));
