import { describe, expect, it } from 'vitest';
import { calculateSidePots } from '../src/game/sidePot.js';

describe('calculateSidePots', () => {
  it('splits pots by all-in amounts', () => {
    const pots = calculateSidePots([
      { playerId: 'a', amount: 100 },
      { playerId: 'b', amount: 200 },
      { playerId: 'c', amount: 300 }
    ]);

    expect(pots).toEqual([
      { amount: 300, eligiblePlayerIds: ['a', 'b', 'c'] },
      { amount: 200, eligiblePlayerIds: ['b', 'c'] },
      { amount: 100, eligiblePlayerIds: ['c'] }
    ]);
  });
});
