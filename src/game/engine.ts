import type { GameActionPayload, GameState, Player, Room, RoundStage } from '../types.js';
import { calculateSidePots } from './sidePot.js';
import { compareHands } from './handEvaluator.js';
import { createDeck, dealCards, shuffle } from './cards.js';

function nextIndex(current: number, total: number): number {
  return (current + 1) % total;
}

function nextActivePlayerId(gameState: GameState, players: Player[], startIndex: number): string | undefined {
  let idx = startIndex;
  for (let i = 0; i < players.length; i += 1) {
    const player = players[idx];
    if (gameState.activePlayerIds.includes(player.id)) {
      return player.id;
    }
    idx = nextIndex(idx, players.length);
  }
  return undefined;
}

function activePlayers(players: Player[]): Player[] {
  return players.filter((player) => player.status === 'active' || player.status === 'allin');
}

export function startGame(room: Room): Room {
  const deck = shuffle(createDeck());
  const gameState: GameState = {
    deck,
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentRound: 'preflop',
    dealerPos: room.gameState ? nextIndex(room.gameState.dealerPos, room.players.length) : 0,
    activePlayerIds: room.players.map((player) => player.id),
    currentTurnPlayerId: undefined,
    smallBlind: room.config.smallBlind,
    bigBlind: room.config.bigBlind,
    roundBets: {},
    totalBets: {},
    lastRaiseAmount: room.config.bigBlind
  };

  room.players.forEach((player) => {
    player.handCards = [];
    player.status = 'active';
    gameState.roundBets[player.id] = 0;
    gameState.totalBets[player.id] = 0;
  });

  for (let i = 0; i < room.players.length; i += 1) {
    const { cards, remaining } = dealCards(gameState.deck, 2);
    gameState.deck = remaining;
    room.players[i].handCards = cards;
  }

  const smallBlindIndex = nextIndex(gameState.dealerPos, room.players.length);
  const bigBlindIndex = nextIndex(smallBlindIndex, room.players.length);
  postBlind(room.players[smallBlindIndex], gameState, gameState.smallBlind);
  postBlind(room.players[bigBlindIndex], gameState, gameState.bigBlind);

  gameState.currentTurnPlayerId = nextActivePlayerId(gameState, room.players, nextIndex(bigBlindIndex, room.players.length));
  room.status = 'playing';
  room.gameState = gameState;
  return room;
}

function postBlind(player: Player, gameState: GameState, amount: number): void {
  const blind = Math.min(player.chips, amount);
  player.chips -= blind;
  if (player.chips === 0) {
    player.status = 'allin';
  }
  gameState.pot += blind;
  gameState.roundBets[player.id] += blind;
  gameState.totalBets[player.id] += blind;
}

function getHighestBet(roundBets: Record<string, number>): number {
  return Math.max(0, ...Object.values(roundBets));
}

function roundComplete(room: Room): boolean {
  const gameState = room.gameState;
  if (!gameState) {
    return false;
  }
  const highestBet = getHighestBet(gameState.roundBets);
  return room.players
    .filter((player) => gameState.activePlayerIds.includes(player.id))
    .every((player) => player.status !== 'active' || gameState.roundBets[player.id] === highestBet);
}

function advanceRound(room: Room): void {
  const gameState = room.gameState;
  if (!gameState) {
    return;
  }
  gameState.roundBets = Object.fromEntries(Object.keys(gameState.roundBets).map((id) => [id, 0]));
  gameState.lastRaiseAmount = gameState.bigBlind;

  const dealCommunity = (count: number) => {
    const { cards, remaining } = dealCards(gameState.deck, count);
    gameState.deck = remaining;
    gameState.communityCards.push(...cards);
  };

  const nextRound: Record<RoundStage, RoundStage> = {
    preflop: 'flop',
    flop: 'turn',
    turn: 'river',
    river: 'showdown',
    showdown: 'showdown'
  };

  const stage = nextRound[gameState.currentRound];
  gameState.currentRound = stage;

  if (stage === 'flop') {
    dealCommunity(3);
  } else if (stage === 'turn' || stage === 'river') {
    dealCommunity(1);
  }

  if (stage === 'showdown') {
    resolveShowdown(room);
    return;
  }

  const dealerIndex = gameState.dealerPos;
  gameState.currentTurnPlayerId = nextActivePlayerId(gameState, room.players, nextIndex(dealerIndex, room.players.length));
}

function resolveShowdown(room: Room): void {
  const gameState = room.gameState;
  if (!gameState) {
    return;
  }
  const livePlayers = room.players.filter((player) => gameState.activePlayerIds.includes(player.id));
  const pots = calculateSidePots(
    livePlayers.map((player) => ({ playerId: player.id, amount: gameState.totalBets[player.id] }))
  );
  gameState.sidePots = pots;

  for (const pot of pots) {
    let winners: Player[] = [];
    for (const player of livePlayers) {
      if (!pot.eligiblePlayerIds.includes(player.id)) {
        continue;
      }
      if (winners.length === 0) {
        winners = [player];
        continue;
      }
      const comparison = compareHands(player.handCards, winners[0].handCards, gameState.communityCards);
      if (comparison > 0) {
        winners = [player];
      } else if (comparison === 0) {
        winners.push(player);
      }
    }
    if (winners.length > 0) {
      const share = Math.floor(pot.amount / winners.length);
      winners.forEach((winner) => {
        winner.chips += share;
      });
    }
  }

  room.status = 'ended';
}

export function applyAction(room: Room, playerId: string, action: GameActionPayload): { room: Room; error?: string } {
  const gameState = room.gameState;
  if (!gameState) {
    return { room, error: 'Game not started' };
  }
  if (gameState.currentTurnPlayerId !== playerId) {
    return { room, error: 'Not your turn' };
  }
  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return { room, error: 'Player not found' };
  }

  const highestBet = getHighestBet(gameState.roundBets);
  const toCall = highestBet - gameState.roundBets[playerId];

  switch (action.type) {
    case 'fold':
      player.status = 'folded';
      gameState.activePlayerIds = gameState.activePlayerIds.filter((id) => id !== playerId);
      break;
    case 'check':
      if (toCall > 0) {
        return { room, error: 'Cannot check' };
      }
      break;
    case 'call':
      if (toCall === 0) {
        return { room, error: 'Nothing to call' };
      }
      commitBet(player, gameState, toCall);
      break;
    case 'raise': {
      const raiseAmount = action.amount ?? 0;
      if (raiseAmount <= toCall) {
        return { room, error: 'Raise must exceed call' };
      }
      const total = raiseAmount;
      if (total > player.chips + gameState.roundBets[playerId]) {
        return { room, error: 'Insufficient chips' };
      }
      commitBet(player, gameState, total - gameState.roundBets[playerId]);
      gameState.lastRaiseAmount = raiseAmount - highestBet;
      break;
    }
    case 'allin': {
      const amount = player.chips;
      commitBet(player, gameState, amount);
      player.status = 'allin';
      break;
    }
    default:
      return { room, error: 'Invalid action' };
  }

  if (gameState.activePlayerIds.length <= 1) {
    resolveShowdown(room);
    return { room };
  }

  if (roundComplete(room)) {
    advanceRound(room);
  } else {
    const currentIndex = room.players.findIndex((p) => p.id === playerId);
    gameState.currentTurnPlayerId = nextActivePlayerId(gameState, room.players, nextIndex(currentIndex, room.players.length));
  }

  return { room };
}

function commitBet(player: Player, gameState: GameState, amount: number): void {
  const bet = Math.min(player.chips, amount);
  player.chips -= bet;
  gameState.pot += bet;
  gameState.roundBets[player.id] += bet;
  gameState.totalBets[player.id] += bet;
  if (player.chips === 0) {
    player.status = 'allin';
  }
}
