import { Auction, Bid, BackendAuctionResponse, BackendBidResponse } from '../types/auction.types';

const API_BASE = 'http://127.0.0.1:5000/api/auction';

export class AuctionEngine {
  private auctions: Map<string, Auction> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  // Create a new auction (backend first, then store locally)
  async createAuction(auction: Omit<Auction, 'bids' | 'participants'>): Promise<boolean> {
    try {
      const auctionData = {
        ...auction,
        bids: [],
        participants: []
      };

      const response = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auctionData),
      });

      if (!response.ok) {
        console.error('Failed to create auction on backend');
        return false;
      }

      const result: BackendAuctionResponse = await response.json();
      if (result.auction) {
        // Ensure participants is always a string[]
        const auctionWithArray = {
          ...result.auction,
          participants: Array.isArray(result.auction.participants)
            ? result.auction.participants
            : Array.from(result.auction.participants),
        };
        this.auctions.set(auction.id, auctionWithArray as Auction);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error creating auction:', error);
      return false;
    }
  }

  // Get all auctions from backend
  async fetchAuctions(): Promise<Auction[]> {
    try {
      const response = await fetch(`${API_BASE}/get-auction`);
      if (!response.ok) {
        console.warn('Backend not reachable, using local data.');
        return Array.from(this.auctions.values());
      }

      const data: BackendAuctionResponse = await response.json();
      if (data.auctions) {
        // Only use arrays for participants
        data.auctions.forEach(auction => {
          this.auctions.set(auction.id, {
            ...auction,
            participants: Array.isArray(auction.participants)
              ? auction.participants
              : Array.from(auction.participants),
          } as Auction);
        });
        return data.auctions.map(auction => ({
          ...auction,
          participants: Array.isArray(auction.participants)
            ? auction.participants
            : Array.from(auction.participants),
        })) as Auction[];
      }

      return Array.from(this.auctions.values());
    } catch (error) {
      console.warn('Error fetching auctions:', error);
      return Array.from(this.auctions.values());
    }
  }

  getAuction(id: string): Auction | undefined {
    return this.auctions.get(id);
  }

  getAllAuctions(): Auction[] {
    return Array.from(this.auctions.values());
  }

  async startAuction(auctionId: string, onUpdate: (auction: Auction) => void): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auction_id: auctionId }),
      });

      if (!response.ok) {
        console.error('Failed to start auction on backend');
        return false;
      }

      const auction = this.auctions.get(auctionId);
      if (!auction) return false;

      auction.status = 'active';
      this.auctions.set(auctionId, auction);
      onUpdate(auction);

      const remainingTime = auction.endTime - Date.now();
      if (remainingTime > 0) {
        const timer = setTimeout(() => {
          this.endAuction(auctionId, onUpdate);
        }, remainingTime);
        this.timers.set(auctionId, timer);
      }

      return true;
    } catch (error) {
      console.error('Error starting auction:', error);
      return false;
    }
  }

  async placeBid(
    auctionId: string,
    bid: Bid,
    onUpdate: (auction: Auction) => void
  ): Promise<{ success: boolean; message: string }> {
    const auction = this.auctions.get(auctionId);
    if (!auction) {
      return { success: false, message: 'Auction not found' };
    }

    if (auction.status !== 'active') {
      return { success: false, message: 'Auction is not active' };
    }

    if (bid.amount < auction.currentPrice + auction.increment) {
      return {
        success: false,
        message: `Bid must be at least $${(auction.currentPrice + auction.increment).toFixed(2)}`,
      };
    }

    try {
      const response = await fetch(`${API_BASE}/place-bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auctionId,
          bidder_id: bid.bidderId,
          amount: bid.amount,
        }),
      });

      const result: BackendBidResponse = await response.json();

      if (result.error) {
        return { success: false, message: result.error };
      }

      auction.currentPrice = bid.amount;
      auction.bids.push(bid);
      this.auctions.set(auctionId, auction);
      onUpdate(auction);

      return { success: true, message: 'Bid placed successfully' };
    } catch (error) {
      console.error('Error placing bid:', error);
      return { success: false, message: 'Failed to place bid. Please try again.' };
    }
  }

  private endAuction(auctionId: string, onUpdate: (auction: Auction) => void): void {
    const auction = this.auctions.get(auctionId);
    if (!auction || auction.status !== 'active') return;

    auction.status = 'completed';
    const timer = this.timers.get(auctionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(auctionId);
    }

    this.determineWinner(auction);
    this.auctions.set(auctionId, auction);
    onUpdate(auction);
  }

  private determineWinner(auction: Auction): void {
    if (auction.bids.length === 0) return;

    const highestBid = auction.bids.reduce((max, bid) =>
      bid.amount > max.amount ? bid : max
    );

    auction.winnerId = highestBid.bidderId;
    auction.winnerType = highestBid.bidderType;
    auction.winnerName = highestBid.bidderName;
    auction.winningPrice = highestBid.amount;
  }

  // Always use array methods for participants
  joinAuction(auctionId: string, participantId: string): void {
    const auction = this.auctions.get(auctionId);
    if (auction) {
      if (!auction.participants.includes(participantId)) {
        auction.participants.push(participantId);
      }
      this.auctions.set(auctionId, auction);
    }
  }

  updateAuction(auctionData: Auction): void {
    const auctionWithArray = {
      ...auctionData,
      participants: Array.isArray(auctionData.participants)
        ? auctionData.participants
        : Array.from(auctionData.participants),
    };
    this.auctions.set(auctionData.id, auctionWithArray as Auction);
  }

  cleanup(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }
}
