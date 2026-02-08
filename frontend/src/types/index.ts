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
    bet: number; // Current round bet
    status: PlayerStatus;
    cards: Card[]; // Empty if not self or not showdown
    position: number; // 0-5
    handRank?: string; // e.g. "High Card", "Pair"
    bestHand?: Card[]; // The winning 5 cards
    isWinner?: boolean;
    isEmpty?: boolean;
}

export type GameStage = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface GameState {
    roomId: string;
    stage: GameStage;
    pot: number;
    currentBet: number;
    dealerPosition: number;
    activePlayerPosition: number; // Who's turn is it
    communityCards: Card[];
    players: Player[];
    minBet: number;
}
