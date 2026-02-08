export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type PlayerStatus = 'waiting' | 'ready' | 'active' | 'folded' | 'allin' | 'offline' | 'spectator';
export type AIStyle = 'aggressive' | 'conservative' | 'balanced';
export type RoomStatus = 'waiting' | 'playing' | 'ended';
export type RoundStage = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatar: string;
  chips: number;
  status: PlayerStatus;
  handCards: Card[];
  isAI: boolean;
  ready: boolean;
  disconnectedAt?: number;
  aiStyle?: AIStyle;
  randomSeed?: number;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface GameState {
  deck: Card[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentRound: RoundStage;
  dealerPos: number;
  activePlayerIds: string[];
  currentTurnPlayerId?: string;
  smallBlind: number;
  bigBlind: number;
  roundBets: Record<string, number>;
  totalBets: Record<string, number>;
  lastRaiseAmount: number;
}

export interface RoomConfig {
  smallBlind: number;
  bigBlind: number;
  timeoutMs: number;
}

export interface Room {
  id: string;
  hostId: string;
  players: Player[];
  spectators: Player[];
  status: RoomStatus;
  config: RoomConfig;
  gameState?: GameState;
  isSolo?: boolean;
}

export type GameActionType = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export interface GameActionPayload {
  type: GameActionType;
  amount?: number;
}
