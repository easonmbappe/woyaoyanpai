import type { SidePot } from '../types.js';

export interface PlayerBet {
  playerId: string;
  amount: number;
}

export function calculateSidePots(bets: PlayerBet[]): SidePot[] {
  const active = bets.filter((bet) => bet.amount > 0).sort((a, b) => a.amount - b.amount);
  const sidePots: SidePot[] = [];
  let remainingPlayers = active.map((bet) => bet.playerId);
  let previous = 0;

  for (const bet of active) {
    const contribution = bet.amount - previous;
    if (contribution > 0) {
      const potAmount = contribution * remainingPlayers.length;
      sidePots.push({ amount: potAmount, eligiblePlayerIds: [...remainingPlayers] });
      previous = bet.amount;
    }
    remainingPlayers = remainingPlayers.filter((id) => id !== bet.playerId);
  }

  return sidePots;
}
