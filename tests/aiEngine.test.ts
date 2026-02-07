import { describe, expect, it, vi } from 'vitest';
import type { GameState, Player } from '../src/types.js';

vi.mock('../src/game/winRate.js', () => ({
  estimateWinRate: () => ({ winRate: 80, wins: 8, losses: 2, ties: 0 })
}));

import { decideAction } from '../src/ai/aiEngine.js';

const basePlayer: Player = {
  id: 'p1',
  socketId: 's1',
  name: 'AI',
  avatar: 'a',
  chips: 1000,
  status: 'active',
  handCards: [
    { rank: 'A', suit: 'S' },
    { rank: 'K', suit: 'S' }
  ],
  isAI: true,
  ready: true
};

const baseState: GameState = {
  deck: [],
  communityCards: [],
  pot: 100,
  sidePots: [],
  currentRound: 'preflop',
  dealerPos: 0,
  activePlayerIds: ['p1', 'p2'],
  currentTurnPlayerId: 'p1',
  smallBlind: 5,
  bigBlind: 10,
  roundBets: { p1: 0, p2: 10 },
  totalBets: { p1: 0, p2: 10 },
  lastRaiseAmount: 10
};

describe('decideAction', () => {
  it('raises when win rate is strong', () => {
    const action = decideAction({
      player: { ...basePlayer },
      gameState: baseState,
      opponents: [
        {
          ...basePlayer,
          id: 'p2',
          socketId: 's2',
          name: 'Opp',
          handCards: [
            { rank: '2', suit: 'C' },
            { rank: '7', suit: 'D' }
          ]
        }
      ],
      toCall: 10,
      positionIndex: 1,
      pot: 100,
      style: 'Aggressive'
    });

    expect(['raise', 'allin']).toContain(action.type);
  });
});
