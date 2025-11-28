// src/hooks/useAuction.ts
import { useState, useEffect, useCallback } from 'react';
import { Auction, AIAgent } from '../types/auction.types';
import { useAuth } from '../contexts/AuthContext';
import socket from '../lib/socket';

import { API_BASE_URL } from '../utils/config';

const API_BASE = `${API_BASE_URL}/api/auction`;

interface UseAuctionResult {
  auctions: Auction[];
  aiAgents: AIAgent[];
  loading: boolean;
  error: string | null;
  refreshAuctions: () => Promise<void>;
  createAuction: (auctionData: Omit<Auction, 'bids'>) => Promise<{ success: boolean }>;
  startAuction: (auctionId: string, selectedAgents: string[]) => Promise<void>;
  joinAuction: (auctionId: string) => Promise<void>;
  simulateBid: (auctionId: string) => Promise<void>;
}

export function useAuction(): UseAuctionResult {
  const { user, session } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [aiAgents, setAiAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Helper for auth headers
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
  });

  // Fetch all auctions
  const fetchAuctions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/get-auction`, {
        headers: getHeaders(), // Optional if get-auction is public, but good practice
      });
      const data = await response.json();
      if (data.auctions) {
        setAuctions(data.auctions);
      }
    } catch (err) {
      console.error('Error fetching auctions:', err);
      setError('Failed to fetch auctions');
    }
  }, [session]);

  // Fetch user-specific AI agents
  const fetchAgents = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${API_BASE}/get-agents/${user.id}`, {
        headers: getHeaders(),
      });
      const data = await response.json();
      if (data.agents) {
        setAiAgents(data.agents);
      }
    } catch (err) {
      console.error('Error fetching AI agents:', err);
      setError('Failed to fetch AI agents');
    }
  }, [user, session]);

  // Create new auction
  const createAuction = useCallback(async (auctionData: Omit<Auction, 'bids'>) => {
    try {
      const response = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...auctionData, created_by: user?.id }),
      });
      const data = await response.json();

      if (response.ok && data.auction) {
        setAuctions((prev) => [...prev, data.auction]);
        return { success: true };
      } else {
        console.error('Auction creation failed:', data.error);
        return { success: false };
      }
    } catch (err) {
      console.error('Error creating auction:', err);
      return { success: false };
    }
  }, [user, session]);

  // Start auction (pass userId and selected agent)
  const startAuction = useCallback(
    async (auctionId: string, selectedAgents: string[]) => {
      if (!user?.id || selectedAgents.length === 0) {
        console.warn('User or agent not selected');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/start`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            auction_id: auctionId,
            user_id: user.id,
            selected_agent: selectedAgents[0],
          }),
        });

        const data = await response.json();
        if (response.ok) {
          console.log('✅ Auction started:', data.auction);
          // backend should emit auction_update; also refresh to be safe
          await fetchAuctions();
        } else {
          console.error('Start auction error:', data.error);
        }
      } catch (err) {
        console.error('Error starting auction:', err);
      }
    },
    [user, session, fetchAuctions]
  );

  // Join auction
  const joinAuction = useCallback(
    async (auctionId: string) => {
      if (!user?.id) return;
      try {
        const response = await fetch(`${API_BASE}/join`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ auction_id: auctionId, user_id: user.id }),
        });

        if (response.ok) {
          console.log(`👤 User ${user.id} joined auction ${auctionId}`);
          // backend should emit auction_update; refresh to be safe
          await fetchAuctions();
        }
      } catch (err) {
        console.error('Error joining auction:', err);
      }
    },
    [user, session, fetchAuctions]
  );

  // Simulate DQN bidding
  const simulateBid = useCallback(
    async (auctionId: string) => {
      try {
        const response = await fetch(`${API_BASE}/simulate-bid`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ auction_id: auctionId }),
        });

        const data = await response.json();
        if (response.ok && data.auction) {
          // update auction from response; backend should also emit socket events
          setAuctions((prev) => prev.map((a) => (a.id === auctionId ? data.auction : a)));
        }
      } catch (err) {
        console.error('Error simulating bid:', err);
      }
    },
    [session]
  );

  // Refresh auctions and agents
  const refreshAuctions = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    await Promise.all([fetchAuctions(), fetchAgents()]);
    if (showLoading) setLoading(false);
  }, [fetchAuctions, fetchAgents]);

  // Polling fallback (every 5s) — keeps behaviour if WebSocket fails
  // Polling fallback (every 5s) — keeps behaviour if WebSocket fails
  useEffect(() => {
    if (!user) return;
    refreshAuctions(true); // Initial load with spinner

    const interval = setInterval(() => {
      refreshAuctions(false); // Background refresh (no spinner)
    }, 5000);

    return () => clearInterval(interval);
  }, [user, refreshAuctions]);

  // Realtime socket listeners — updates auctions array in-place
  useEffect(() => {
    // Handler when backend emits a full auction update
    const handleAuctionUpdate = (payload: { auction?: Auction }) => {
      if (!payload?.auction) return;
      const updated = payload.auction;
      setAuctions((prev) => {
        const found = prev.find((a) => a.id === updated.id);
        if (found) {
          return prev.map((a) => (a.id === updated.id ? updated : a));
        } else {
          return [...prev, updated];
        }
      });
    };

    // Handler when backend emits only a bid payload
    const handleBidUpdate = (payload: {
      auction_id?: string;
      bid?: any;
      auction?: Auction;
    }) => {
      if (!payload) return;

      // If backend included full auction, reuse auction handler
      if (payload.auction) {
        handleAuctionUpdate({ auction: payload.auction });
        return;
      }

      const auctionId = payload.auction_id;
      const bid = payload.bid;
      if (!auctionId || !bid) return;

      setAuctions((prev) =>
        prev.map((a) => {
          if (a.id !== auctionId) return a;
          const next = { ...a };
          // update currentPrice if provided
          if (bid.amount !== undefined && bid.amount !== null) {
            next.currentPrice = bid.amount;
          }
          // append bid safely
          const existing = Array.isArray(next.bids) ? [...next.bids] : [];
          if (!(bid.id && existing.some((b) => b.bidderId === bid.id))) {
            existing.push(bid);
          }
          next.bids = existing;
          return next;
        })
      );
    };

    // Listen for events
    socket.on('auction_update', handleAuctionUpdate);
    socket.on('bid_update', handleBidUpdate);
    socket.on('auction_complete', handleAuctionUpdate);

    // cleanup
    return () => {
      socket.off('auction_update', handleAuctionUpdate);
      socket.off('bid_update', handleBidUpdate);
      socket.off('auction_complete', handleAuctionUpdate);
    };
    // empty deps so we attach listeners once per hook lifecycle
  }, []);

  return {
    auctions,
    aiAgents,
    loading,
    error,
    refreshAuctions,
    createAuction,
    startAuction,
    joinAuction,
    simulateBid,
  };
}
