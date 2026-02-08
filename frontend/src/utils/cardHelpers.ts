import type { Suit, Rank, Card } from '../types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Add numeric values for sorting
const RANK_VALUES: Record<Rank, number> = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14
};

export const createDeck = (): Card[] => {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return shuffle(deck);
};

export const shuffle = (deck: Card[]): Card[] => {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
};

export const getCardColor = (suit: Suit): string => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-gray-900';
};

export const getSuitSymbol = (suit: Suit): string => {
    switch (suit) {
        case 'hearts': return '♥';
        case 'diamonds': return '♦';
        case 'clubs': return '♣';
        case 'spades': return '♠';
    }
};

export const sortCardsByRankDesc = (cards: Card[]): Card[] => {
    return [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
};

export const sortCardsByHandPriority = (cards: Card[]): Card[] => {
    const counts = new Map<Rank, number>();
    cards.forEach(card => {
        counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
    });
    return [...cards].sort((a, b) => {
        const countDiff = (counts.get(b.rank) || 0) - (counts.get(a.rank) || 0);
        if (countDiff !== 0) return countDiff;
        return RANK_VALUES[b.rank] - RANK_VALUES[a.rank];
    });
};
