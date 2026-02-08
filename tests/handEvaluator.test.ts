import { describe, expect, it } from 'vitest';
import { evaluateBestHand } from '../src/game/handEvaluator.js';
import type { Card } from '../src/types.js';

const make = (cards: Card[]): Card[] => cards;

describe('evaluateBestHand', () => {
  it('detects straight flush', () => {
    const cards = make([
      { rank: 'A', suit: 'spades' },
      { rank: 'K', suit: 'spades' },
      { rank: 'Q', suit: 'spades' },
      { rank: 'J', suit: 'spades' },
      { rank: '10', suit: 'spades' },
      { rank: '2', suit: 'diamonds' },
      { rank: '3', suit: 'hearts' }
    ]);
    const evaluated = evaluateBestHand(cards);
    expect(evaluated.category).toBe('straight-flush');
  });

  it('detects full house', () => {
    const cards = make([
      { rank: 'K', suit: 'hearts' },
      { rank: 'K', suit: 'diamonds' },
      { rank: 'K', suit: 'spades' },
      { rank: '9', suit: 'clubs' },
      { rank: '9', suit: 'hearts' },
      { rank: '2', suit: 'diamonds' },
      { rank: '3', suit: 'spades' }
    ]);
    const evaluated = evaluateBestHand(cards);
    expect(evaluated.category).toBe('full-house');
  });
});
