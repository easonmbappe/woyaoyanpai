export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type PlayerStatus = 'waiting' | 'ready' | 'active' | 'folded' | 'allin' | 'offline';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  chips: number;
  bet: number;
  status: PlayerStatus;
  cards: Card[];
  position: number;
  handRank?: string;
  isWinner?: boolean;
}

export type GameStage = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface GameState {
  roomId: string;
  stage: GameStage;
  pot: number;
  currentBet: number;
  dealerPosition: number;
  activePlayerPosition: number;
  communityCards: Card[];
  players: Player[];
  minBet: number;
}

export type PlayerActionType = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export interface PlayerAction {
  type: PlayerActionType;
  amount?: number;
}

export interface HeroDeal {
  playerId: string;
  cards: Card[];
}

export interface CommunityPayload {
  cards: Card[];
  stage: 'flop' | 'turn' | 'river';
}

export interface TurnPayload {
  playerId: string;
  timeout: number;
}

export interface ActionResult {
  playerId: string;
  action: PlayerAction;
  pot: number;
  roundBet: number;
  chips: number;
  status: PlayerStatus;
}

export interface ShowdownResult {
  winnerId: string;
  winnerName: string;
  handRank: string;
  winAmount: number;
  winners?: {
    playerId: string;
    name: string;
    handRank: string;
    handRankChinese?: string;
    winAmount: number;
    bestHand: Card[];
    holeCards: Card[];
  }[];
  playerHands: {
    playerId: string;
    name: string;
    holeCards: Card[];
    cards?: Card[];
    handRank?: string;
  }[];
  winner?: {
    id: string;
    name: string;
    handRank: string;
    bestHand: Card[];
    holeCards: Card[];
  };
}

export interface NewRound {
  roomId: string;
  dealerPosition: number;
  smallBlind: number;
  bigBlind: number;
  pot: number;
  communityCards: Card[];
  stage: 'preflop';
  players: Player[];
}
