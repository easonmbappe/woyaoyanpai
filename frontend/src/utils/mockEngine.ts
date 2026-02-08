import type { GameState, Card } from '../types';
import { createDeck } from './cardHelpers';

export const INITIAL_MOCK_STATE: GameState = {
    roomId: 'solo',
    stage: 'waiting',
    pot: 0,
    currentBet: 0,
    dealerPosition: 0,
    activePlayerPosition: 0,
    communityCards: [],
    players: [],
    minBet: 20,
};

// Create 5 AI bots
const BOTS = [
    { name: 'Bot-1', avatar: 'avatar_1' },
    { name: 'Bot-2', avatar: 'avatar_2' },
    { name: 'Bot-3', avatar: 'avatar_3' },
    { name: 'Bot-4', avatar: 'avatar_4' },
    { name: 'Bot-5', avatar: 'avatar_5' },
];

export class MockGameEngine {
    private state: GameState;
    private deck: Card[] = [];

    constructor() {
        this.state = JSON.parse(JSON.stringify(INITIAL_MOCK_STATE));
    }

    init(playerName: string): GameState {
        this.state.players = [
            {
                id: 'me',
                name: playerName,
                avatar: 'avatar_0',
                chips: 1000,
                bet: 0,
                status: 'ready',
                cards: [],
                position: 0
            },
            ...BOTS.map((bot, i) => ({
                id: `bot-${i}`,
                name: bot.name,
                avatar: bot.avatar,
                chips: 1000,
                bet: 0,
                status: 'ready' as const,
                cards: [],
                position: i + 1
            }))
        ];
        return this.state;
    }

    start(): GameState {
        this.state.stage = 'preflop';
        this.deck = createDeck();
        this.state.pot = 30; // Blinds
        this.state.currentBet = 20;

        this.state.communityCards = []; // Clear board

        // Deal cards
        this.state.players.forEach(p => {
            p.cards = [this.deck.pop()!, this.deck.pop()!];
            p.status = 'active';
            p.bet = 0;
            p.handRank = undefined;
            p.isWinner = false;
        });

        // Blinds logic (simplified)
        // Dealer is 0 (Me). SB is 1, BB is 2.
        // Active is 3.
        this.state.activePlayerPosition = 0; // Let's simplify, user starts for UI testing

        return { ...this.state };
    }

    handleAction(playerId: string, type: string, amount?: number): GameState {
        // Only handle user action for now
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) return this.state;

        if (type === 'fold') player.status = 'folded';
        if (type === 'call') {
            const toCall = this.state.currentBet - player.bet;
            player.chips -= toCall;
            player.bet += toCall;
            this.state.pot += toCall;
        }
        if (type === 'raise' && amount) {
            const total = amount; // User raises to amount
            const diff = total - player.bet;
            player.chips -= diff;
            player.bet = total;
            this.state.currentBet = total;
            this.state.pot += diff;
        }
        if (type === 'check') {
            // do nothing
        }

        // Move turn
        this.nextTurn();

        // Auto-bot moves if active player is bot
        setTimeout(() => {
            if (this.state.activePlayerPosition !== 0) {
                this.botMove();
            }
        }, 1000);

        return { ...this.state };
    }

    private nextTurn() {
        let nextPos = (this.state.activePlayerPosition + 1) % 6;
        // simple skip folded
        while (this.state.players.find(p => p.position === nextPos)?.status === 'folded') {
            nextPos = (nextPos + 1) % 6;
        }

        this.state.activePlayerPosition = nextPos;

        // Check for next stage (if back to dealer/start) - Simplified
        if (nextPos === 0 && this.state.stage !== 'showdown') {
            this.nextStage();
        }
    }

    private nextStage() {
        // Deal community cards
        if (this.state.stage === 'preflop') {
            this.state.stage = 'flop';
            this.state.communityCards = [this.deck.pop()!, this.deck.pop()!, this.deck.pop()!];
        } else if (this.state.stage === 'flop') {
            this.state.stage = 'turn';
            this.state.communityCards.push(this.deck.pop()!);
        } else if (this.state.stage === 'turn') {
            this.state.stage = 'river';
            this.state.communityCards.push(this.deck.pop()!);
        } else if (this.state.stage === 'river') {
            this.state.stage = 'showdown';
            this.determineWinner();
        }
    }

    private botMove() {
        // Simulate bot call/check
        // In a real mock, this would update state and trigger UI update via callback?
        // Since this class is sync, we can't emit. 
        // The caller needs to drive this or poll.
        // We'll leave it simple: The hook calls "game loop" if active player is bot.
    }

    // Expose bot move public
    processBotTurn(): GameState {
        if (this.state.activePlayerPosition === 0) return this.state;

        const bot = this.state.players.find(p => p.position === this.state.activePlayerPosition);
        if (bot) {
            // Check or Call
            if (this.state.currentBet > bot.bet) {
                const toCall = this.state.currentBet - bot.bet;
                bot.chips -= toCall;
                bot.bet += toCall;
                this.state.pot += toCall;
            }
        }
        this.nextTurn();
        if (this.state.activePlayerPosition !== 0) {
            // Chain bot moves? handled by hook loop
        }
        return { ...this.state };
    }

    private determineWinner() {
        const activePlayers = this.state.players.filter(p => p.status !== 'folded');
        if (activePlayers.length === 0) return;

        // Assign random ranks
        const ranks = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];
        activePlayers.forEach(p => {
            const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
            p.handRank = randomRank;
            p.isWinner = false;
        });

        // Pick a winner
        const winnerIndex = Math.floor(Math.random() * activePlayers.length);
        const winner = activePlayers[winnerIndex];
        winner.isWinner = true;
        winner.chips += this.state.pot;
        // this.state.pot = 0; // Keep pot visible for animation? Layout says "Central pot chips fly to winner".
        // If we set pot to 0 immediately, it might disappear. 
        // Let's keep it for a moment or handle in UI.

        this.state.activePlayerPosition = -1; // No one acting
    }
}
