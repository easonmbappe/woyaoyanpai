import type { Card } from '../types.js';
import { createDeck, shuffle } from './cards.js';
import { compareHands } from './handEvaluator.js';

export interface WinRateResult {
  winRate: number;
  ties: number;
  wins: number;
  losses: number;
}

function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function estimateWinRate(
  hand: Card[],
  community: Card[],
  opponentCount: number,
  iterations = 1000
): WinRateResult {
  const used = new Set([...hand, ...community].map(cardKey));
  const fullDeck = createDeck().filter((card) => !used.has(cardKey(card)));
  let wins = 0;
  let ties = 0;
  let losses = 0;

  for (let i = 0; i < iterations; i += 1) {
    const deck = shuffle(fullDeck);
    const opponents: Card[][] = [];
    let index = 0;
    for (let j = 0; j < opponentCount; j += 1) {
      opponents.push([deck[index], deck[index + 1]]);
      index += 2;
    }
    const remainingCommunity = [...community];
    while (remainingCommunity.length < 5) {
      remainingCommunity.push(deck[index]);
      index += 1;
    }

    let bestComparison = 0;
    let tieCount = 0;
    for (const opponent of opponents) {
      const comparison = compareHands(hand, opponent, remainingCommunity);
      if (comparison < 0) {
        bestComparison = -1;
        break;
      }
      if (comparison === 0) {
        tieCount += 1;
      }
    }

    if (bestComparison === -1) {
      losses += 1;
    } else if (tieCount > 0) {
      ties += 1;
    } else {
      wins += 1;
    }
  }

  const winRate = ((wins + ties * 0.5) / iterations) * 100;
  return { winRate, wins, ties, losses };
}
