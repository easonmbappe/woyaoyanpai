import type { AIStyle, GameActionPayload, GameState, Player } from '../types.js';
import { estimateWinRate } from '../game/winRate.js';

export interface AIDecisionContext {
  player: Player;
  gameState: GameState;
  opponents: Player[];
  toCall: number;
  positionIndex: number;
  pot: number;
  style: AIStyle;
  iterations?: number;
  randomSeed?: number;
}

type PositionTier = 'early' | 'middle' | 'late';

function nextSeed(seed: number): { value: number; seed: number } {
  const next = (seed * 1664525 + 1013904223) >>> 0;
  return { value: next / 0x100000000, seed: next };
}

function createRandom(player: Player, randomSeed?: number): () => number {
  let seed = player.randomSeed ?? randomSeed;
  if (seed === undefined) {
    return () => Math.random();
  }
  return () => {
    const { value, seed: next } = nextSeed(seed ?? 0);
    seed = next;
    player.randomSeed = next;
    return value;
  };
}

function getPositionTier(positionIndex: number, totalPlayers: number): PositionTier {
  if (totalPlayers <= 0) {
    return 'middle';
  }
  const earlyCutoff = Math.ceil(totalPlayers / 3);
  const middleCutoff = Math.ceil((totalPlayers * 2) / 3);
  if (positionIndex < earlyCutoff) {
    return 'early';
  }
  if (positionIndex < middleCutoff) {
    return 'middle';
  }
  return 'late';
}

function getRaiseAmount(player: Player, gameState: GameState, toCall: number, multiplier: number): GameActionPayload {
  const baseRaise = Math.max(gameState.lastRaiseAmount, gameState.bigBlind);
  const target = toCall + baseRaise * multiplier;
  const amount = Math.min(player.chips, target);
  return amount >= player.chips ? { type: 'allin' } : { type: 'raise', amount };
}

function applyRandomness(
  random: () => number,
  action: GameActionPayload,
  toCall: number,
  gameState: GameState,
  player: Player
): GameActionPayload {
  if (random() >= 0.2) {
    return action;
  }

  if (action.type === 'raise') {
    return toCall > 0 ? { type: 'call' } : { type: 'check' };
  }

  if (action.type === 'call') {
    return toCall > 0 ? { type: 'fold' } : { type: 'check' };
  }

  if (action.type === 'check' && toCall === 0 && player.chips > gameState.bigBlind) {
    return getRaiseAmount(player, gameState, toCall, 1);
  }

  return action;
}

export function decideAction(context: AIDecisionContext): GameActionPayload {
  const { player, gameState, opponents, toCall, positionIndex, pot, style, randomSeed } = context;
  const random = createRandom(player, randomSeed);
  const winRate = estimateWinRate(player.handCards, gameState.communityCards, opponents.length, context.iterations ?? 500)
    .winRate;
  const potOdds = pot + toCall > 0 ? (toCall / (pot + toCall)) * 100 : 0;
  const stackBB = gameState.bigBlind > 0 ? player.chips / gameState.bigBlind : 0;
  const positionTier = getPositionTier(positionIndex, gameState.activePlayerIds.length);
  const isPreflop = gameState.currentRound === 'preflop';

  const styleProfile = {
    aggressive: { raiseThreshold: 40, playThreshold: 28, shoveThreshold: 30 },
    conservative: { raiseThreshold: 65, playThreshold: 55, shoveThreshold: 45 },
    balanced: { raiseThreshold: 50, playThreshold: 32, shoveThreshold: 35 }
  } as const;

  const thresholds = styleProfile[style];
  const positionBonus = positionTier === 'late' ? 6 : positionTier === 'early' ? -6 : 0;
  const adjustedWinRate = winRate + positionBonus;

  if (stackBB > 0 && stackBB < 10) {
    if (adjustedWinRate >= thresholds.shoveThreshold) {
      return { type: 'allin' };
    }
    return toCall > 0 ? { type: 'fold' } : { type: 'check' };
  }

  let action: GameActionPayload = { type: 'check' };

  if (style === 'conservative') {
    const preflopThreshold = positionTier === 'early' ? 70 : 60;
    const playable = isPreflop
      ? winRate >= preflopThreshold
      : adjustedWinRate >= thresholds.playThreshold;

    if (!playable && toCall > 0) {
      action = { type: 'fold' };
    } else if (adjustedWinRate >= thresholds.raiseThreshold && toCall <= player.chips) {
      action = getRaiseAmount(player, gameState, toCall, 2);
    } else if (toCall > 0) {
      action = adjustedWinRate >= potOdds ? { type: 'call' } : { type: 'fold' };
    }
  } else if (style === 'aggressive') {
    const stealAttempt = positionTier === 'late' && toCall === 0 && winRate >= 25;
    const shouldRaise = adjustedWinRate >= thresholds.raiseThreshold || stealAttempt || stackBB < 20;
    if (shouldRaise && player.chips > toCall) {
      action = getRaiseAmount(player, gameState, toCall, 3);
    } else if (toCall > 0) {
      action = adjustedWinRate >= potOdds ? { type: 'call' } : { type: 'fold' };
    }
  } else {
    const positionPlayThreshold =
      positionTier === 'early' ? 45 : positionTier === 'middle' ? 35 : thresholds.playThreshold;
    const isPlayable = adjustedWinRate >= positionPlayThreshold;
    const bluff = random() < 0.1 && toCall === 0;

    if (bluff && player.chips > gameState.bigBlind) {
      action = getRaiseAmount(player, gameState, toCall, 1);
    } else if (!isPlayable && toCall > 0) {
      action = { type: 'fold' };
    } else if (adjustedWinRate >= thresholds.raiseThreshold && player.chips > toCall) {
      action = getRaiseAmount(player, gameState, toCall, 2);
    } else if (toCall > 0) {
      const oddsAdjustment = stackBB > 50 ? 5 : 0;
      action = adjustedWinRate + oddsAdjustment >= potOdds ? { type: 'call' } : { type: 'fold' };
    }
  }

  if (toCall >= player.chips && action.type !== 'fold') {
    return { type: 'allin' };
  }

  return applyRandomness(random, action, toCall, gameState, player);
}
