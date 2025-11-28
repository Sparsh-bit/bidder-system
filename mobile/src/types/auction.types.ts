export interface Bid {
    id: string;
    auctionId: string;
    bidderId: string;
    bidderName: string;
    amount: number;
    timestamp: number;
    bidderType: 'user' | 'ai';
}

export interface Auction {
    id: string;
    title: string;
    description: string;
    format: 'english' | 'dutch' | 'sealed';
    startingPrice: number;
    reservePrice: number;
    increment: number;
    startTime: number | string;
    endTime: number | string;
    currentPrice: number;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    winnerId?: string;
    winnerName?: string;
    winningPrice?: number;
    participants: string[];
    bids: Bid[];
    created_by?: string;
    created_at?: string | number;
}

export interface AIAgent {
    id: string;
    name: string;
    strategyType: 'conservative' | 'aggressive' | 'balanced' | 'sniper' | 'reinforcement_learning' | 'heuristic';
    budget: number;
    remainingBudget: number;
    totalSpent: number;
    valuationCap: number;
    aggressionLevel: number;
    isActive: boolean;
    config?: Record<string, any>;
}
