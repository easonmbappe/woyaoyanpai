import type { GameActionPayload, GameState, Player } from '../types.js';
import { estimateWinRate } from '../game/winRate.js';

export type AIStyle = 'Aggressive' | 'Conservative' | 'Balanced';

export interface AIDecisionContext {
  player: Player;
  gameState: GameState;
  opponents: Player[];
  toCall: number;
  positionIndex: number;
  pot: number;
  style: AIStyle;
  iterations?: number;
}

export function decideAction(context: AIDecisionContext): GameActionPayload {
  const { player, gameState, opponents, toCall, positionIndex, pot, style } = context;
  const winRate = estimateWinRate(player.handCards, gameState.communityCards, opponents.length, context.iterations ?? 500)
    .winRate;
  const potOdds = pot > 0 ? (toCall / (pot + toCall)) * 100 : 0;
  const stackRatio = player.chips > 0 ? toCall / player.chips : 1;

  const positionFactor = positionIndex >= Math.max(0, gameState.activePlayerIds.length - 2) ? 5 : -5;
  const adjustedWinRate = winRate + positionFactor - stackRatio * 10;

  const thresholds = {
    Aggressive: 20,
    Conservative: 15,
    Balanced: 18
  } as const;

  const baseThreshold = thresholds[style];
  const isPlayable = adjustedWinRate >= baseThreshold;
  const shouldRaise = adjustedWinRate >= baseThreshold + 10;

  const randomRoll = Math.random();
  if (randomRoll < 0.2) {
    if (toCall === 0) {
      return { type: 'check' };
    }
    return { type: 'call' };
  }

  if (!isPlayable && toCall > 0) {
    return { type: 'fold' };
  }

  if (shouldRaise && player.chips > toCall) {
    const raiseAmount = Math.max(gameState.lastRaiseAmount, gameState.bigBlind);
    const amount = Math.min(player.chips, toCall + raiseAmount);
    return amount >= player.chips ? { type: 'allin' } : { type: 'raise', amount };
  }

  if (toCall >= player.chips) {
    return { type: 'allin' };
  }

  if (toCall > 0) {
    if (adjustedWinRate + 5 >= potOdds) {
      return { type: 'call' };
    }
    return { type: 'fold' };
  }

  return { type: 'check' };
}
