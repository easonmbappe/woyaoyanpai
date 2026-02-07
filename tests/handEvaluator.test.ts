import { describe, expect, it } from 'vitest';
import { evaluateBestHand } from '../src/game/handEvaluator.js';
import type { Card } from '../src/types.js';

const make = (cards: string[]): Card[] =>
  cards.map((card) => ({ rank: card[0] as Card['rank'], suit: card[1] as Card['suit'] }));

describe('evaluateBestHand', () => {
  it('detects straight flush', () => {
    const cards = make(['A S', 'K S', 'Q S', 'J S', 'T S', '2 D', '3 H'].map((c) => c.replace(' ', '')));
    const evaluated = evaluateBestHand(cards);
    expect(evaluated.category).toBe('straight-flush');
  });

  it('detects full house', () => {
    const cards = make(['K H', 'K D', 'K S', '9 C', '9 H', '2 D', '3 S'].map((c) => c.replace(' ', '')));
    const evaluated = evaluateBestHand(cards);
    expect(evaluated.category).toBe('full-house');
  });
});
