import type { Card, Rank } from '../types.js';

export type HandCategory =
  | 'straight-flush'
  | 'four-kind'
  | 'full-house'
  | 'flush'
  | 'straight'
  | 'three-kind'
  | 'two-pair'
  | 'one-pair'
  | 'high-card';

export interface EvaluatedHand {
  category: HandCategory;
  score: number;
  kickers: number[];
}

const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};

const CATEGORY_SCORE: Record<HandCategory, number> = {
  'straight-flush': 9,
  'four-kind': 8,
  'full-house': 7,
  flush: 6,
  straight: 5,
  'three-kind': 4,
  'two-pair': 3,
  'one-pair': 2,
  'high-card': 1
};

function sortDesc(values: number[]): number[] {
  return [...values].sort((a, b) => b - a);
}

function isStraight(values: number[]): { isStraight: boolean; high: number } {
  const unique = Array.from(new Set(values)).sort((a, b) => a - b);
  if (unique.length < 5) {
    return { isStraight: false, high: 0 };
  }
  for (let i = 0; i <= unique.length - 5; i += 1) {
    const slice = unique.slice(i, i + 5);
    if (slice[4] - slice[0] === 4 && slice.every((v, idx) => idx === 0 || v === slice[idx - 1] + 1)) {
      return { isStraight: true, high: slice[4] };
    }
  }
  // Wheel straight (A-2-3-4-5)
  if (unique.includes(14) && unique.includes(2) && unique.includes(3) && unique.includes(4) && unique.includes(5)) {
    return { isStraight: true, high: 5 };
  }
  return { isStraight: false, high: 0 };
}

function evaluateFive(cards: Card[]): EvaluatedHand {
  const values = sortDesc(cards.map((card) => RANK_VALUE[card.rank]));
  const suits = cards.map((card) => card.suit);
  const isFlush = new Set(suits).size === 1;
  const straightResult = isStraight(values);

  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const groups = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    return b[0] - a[0];
  });

  if (isFlush && straightResult.isStraight) {
    return { category: 'straight-flush', score: CATEGORY_SCORE['straight-flush'], kickers: [straightResult.high] };
  }

  if (groups[0][1] === 4) {
    const four = groups[0][0];
    const kicker = groups[1][0];
    return { category: 'four-kind', score: CATEGORY_SCORE['four-kind'], kickers: [four, kicker] };
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return { category: 'full-house', score: CATEGORY_SCORE['full-house'], kickers: [groups[0][0], groups[1][0]] };
  }

  if (isFlush) {
    return { category: 'flush', score: CATEGORY_SCORE.flush, kickers: values };
  }

  if (straightResult.isStraight) {
    return { category: 'straight', score: CATEGORY_SCORE.straight, kickers: [straightResult.high] };
  }

  if (groups[0][1] === 3) {
    const trips = groups[0][0];
    const kickers = groups.slice(1).map(([value]) => value).sort((a, b) => b - a);
    return { category: 'three-kind', score: CATEGORY_SCORE['three-kind'], kickers: [trips, ...kickers] };
  }

  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const pairHigh = Math.max(groups[0][0], groups[1][0]);
    const pairLow = Math.min(groups[0][0], groups[1][0]);
    const kicker = groups[2][0];
    return { category: 'two-pair', score: CATEGORY_SCORE['two-pair'], kickers: [pairHigh, pairLow, kicker] };
  }

  if (groups[0][1] === 2) {
    const pair = groups[0][0];
    const kickers = groups.slice(1).map(([value]) => value).sort((a, b) => b - a);
    return { category: 'one-pair', score: CATEGORY_SCORE['one-pair'], kickers: [pair, ...kickers] };
  }

  return { category: 'high-card', score: CATEGORY_SCORE['high-card'], kickers: values };
}

function combinations<T>(items: T[], choose: number): T[][] {
  const results: T[][] = [];
  const combo: T[] = [];
  const backtrack = (start: number, depth: number) => {
    if (depth === choose) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i <= items.length - (choose - depth); i += 1) {
      combo.push(items[i]);
      backtrack(i + 1, depth + 1);
      combo.pop();
    }
  };
  backtrack(0, 0);
  return results;
}

export function evaluateBestHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    throw new Error('At least 5 cards required');
  }
  const combos = combinations(cards, 5);
  let best: EvaluatedHand | undefined;
  for (const combo of combos) {
    const evaluated = evaluateFive(combo);
    if (!best) {
      best = evaluated;
      continue;
    }
    if (evaluated.score > best.score) {
      best = evaluated;
      continue;
    }
    if (evaluated.score === best.score) {
      const len = Math.max(evaluated.kickers.length, best.kickers.length);
      for (let i = 0; i < len; i += 1) {
        const a = evaluated.kickers[i] ?? 0;
        const b = best.kickers[i] ?? 0;
        if (a > b) {
          best = evaluated;
          break;
        }
        if (a < b) {
          break;
        }
      }
    }
  }
  return best ?? { category: 'high-card', score: CATEGORY_SCORE['high-card'], kickers: [] };
}

export function compareHands(a: Card[], b: Card[], community: Card[]): number {
  const evalA = evaluateBestHand([...a, ...community]);
  const evalB = evaluateBestHand([...b, ...community]);
  if (evalA.score !== evalB.score) {
    return evalA.score > evalB.score ? 1 : -1;
  }
  const length = Math.max(evalA.kickers.length, evalB.kickers.length);
  for (let i = 0; i < length; i += 1) {
    const aKick = evalA.kickers[i] ?? 0;
    const bKick = evalB.kickers[i] ?? 0;
    if (aKick !== bKick) {
      return aKick > bKick ? 1 : -1;
    }
  }
  return 0;
}
