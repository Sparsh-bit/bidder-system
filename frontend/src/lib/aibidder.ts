// src/lib/aiBidder.ts

import { Auction, AIAgent, Bid, BackendAIBidResponse } from '../types/auction.types';

const API_BASE = 'http://127.0.0.1:5000/api/auction';

export class AIBidder {
  private activeBidders: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Starts AI bidding loop for given auction using backend RL agents.
   * @param auction Auction object
   * @param agents List of AI agents participating
   * @param onBid Callback for when an AI agent places a bid
   */
  startBidding(
    auction: Auction,
    agents: AIAgent[],
    onBid: (bid: Bid) => void
  ): void {
    if (!auction || agents.length === 0) return;

    console.log(`Starting AI bidding for auction ${auction.id} with ${agents.length} agents`);

    agents.forEach((agent) => {
      const interval = setInterval(async () => {
        // Check if auction is still active
        if (auction.status !== 'active') {
          clearInterval(interval);
          this.activeBidders.delete(agent.id);
          return;
        }

        // Stop if budget exhausted
        if (agent.remainingBudget <= 0) {
          clearInterval(interval);
          this.activeBidders.delete(agent.id);
          console.log(`Agent ${agent.name} stopped bidding - budget exhausted`);
          return;
        }

        // Check if current price is within agent's budget
        if (auction.currentPrice + auction.increment > agent.remainingBudget) {
          console.log(`Agent ${agent.name} cannot afford minimum bid`);
          return;
        }

        // Prepare state for backend RL model
        const auctionState = {
          current_price: auction.currentPrice,
          increment: auction.increment,
          remaining_budget: agent.remainingBudget,
          time_left: Math.max(0, auction.endTime - Date.now()),
        };

        try {
          // Ask backend DQN agent to decide the bid
          const response = await fetch(`${API_BASE}/ai-bid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent_id: agent.id,
              auction_state: auctionState,
            }),
          });

          if (!response.ok) {
            console.error(`AI bid request failed for agent ${agent.name}`);
            return;
          }

          const data: BackendAIBidResponse = await response.json();

          if (data.error) {
            console.error(`AI bidding error for agent ${agent.name}:`, data.error);
            return;
          }

          if (!data.bid_amount || data.bid_amount <= auction.currentPrice) {
            console.log(`Agent ${agent.name} decided not to bid or bid too low`);
            return;
          }

          const bidAmount = Number(data.bid_amount);

          // Validate bid amount
          if (bidAmount < auction.currentPrice + auction.increment) {
            console.log(`Agent ${agent.name} bid amount too low: ${bidAmount}`);
            return;
          }

          if (bidAmount > agent.remainingBudget) {
            console.log(`Agent ${agent.name} bid amount exceeds budget: ${bidAmount} > ${agent.remainingBudget}`);
            return;
          }

          // Construct bid
          const bid: Bid = {
            id: `bid-${agent.id}-${Date.now()}`,
            auctionId: auction.id,
            bidderId: agent.id,
            bidderType: 'ai',
            bidderName: agent.name,
            amount: bidAmount,
            timestamp: Date.now()
          };

          // Update agent's remaining budget
          agent.remainingBudget -= bidAmount;
          agent.totalSpent += bidAmount;

          console.log(`Agent ${agent.name} placing bid: $${bidAmount}`);

          // Callback to place the bid through the auction engine
          onBid(bid);

        } catch (error) {
          console.error(`AI Bidder (${agent.name}) failed to bid:`, error);
        }
      }, this.randomBetween(3000, 8000)); // 3–8 sec bidding interval

      this.activeBidders.set(agent.id, interval);
    });
  }

  /**
   * Stop bidding for a specific agent
   * @param agentId Agent ID to stop
   */
  stopBidding(agentId: string): void {
    const interval = this.activeBidders.get(agentId);
    if (interval) {
      clearInterval(interval);
      this.activeBidders.delete(agentId);
      console.log(`Stopped bidding for agent ${agentId}`);
    }
  }

  /**
   * Stop all AI bidding loops
   */
  stopAllBidding(): void {
    console.log(`Stopping ${this.activeBidders.size} AI bidders`);
    this.activeBidders.forEach((interval) => clearInterval(interval));
    this.activeBidders.clear();
  }

  /**
   * Check if any agents are currently bidding
   */
  isAnyAgentBidding(): boolean {
    return this.activeBidders.size > 0;
  }

  /**
   * Get list of currently active bidding agents
   */
  getActiveBidders(): string[] {
    return Array.from(this.activeBidders.keys());
  }

  /**
   * Helper for randomized timing to make bidding more realistic
   */
  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

// Export singleton instance
export const aiBidder = new AIBidder();
