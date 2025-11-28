// src/types/auction.types.ts

export type AuctionFormat = 'english' | 'dutch' | 'first_price_sealed' | 'vickrey';

export type AuctionStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export type BidderType = 'human' | 'ai';

export type StrategyType = 'heuristic' | 'reinforcement_learning';

export interface AuctionBid {
  bidderId: string;
  bidderName: string;
  /** Type of bidder: e.g. "reinforcement_learning" or "heuristic" */
  bidderType?: string;
  amount: number;
  timestamp: number;
}

export interface Auction {
  id: string;
  title: string;
  description?: string;
  startingPrice: number;
  reservePrice: number;
  increment: number;
  startTime: number | string;
  endTime: number | string;
  currentPrice: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  participants: string[];
  selectedAgents?: Record<string, string>;
  bids: AuctionBid[];
  winnerId?: string;
  winnerName?: string;
  winningPrice?: number;
  /** Winner type (same as agent strategy type) */
  winnerType?: string;
  created_at?: string | number;
}



export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  bidderType: BidderType;
  amount: number;
  timestamp: number;
}

export interface AIAgent {
  id: string;
  name: string;
  strategyType: StrategyType;
  budget: number;
  remainingBudget: number;
  valuationCap: number;
  aggressionLevel: number;
  isActive: boolean;
  config: Record<string, any>;
  totalSpent: number;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  session: any | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

// Backend API response types
export interface BackendAuctionResponse {
  auction?: Auction;
  auctions?: Auction[];
  message?: string;
  error?: string;
}

export interface BackendBidResponse {
  message?: string;
  auction?: Auction;
  error?: string;
}

export interface BackendAIBidResponse {
  agent_id: string;
  bid_amount: number;
  error?: string;
}
