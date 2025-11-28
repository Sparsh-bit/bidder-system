import { useState, useEffect, useCallback } from 'react';
import { Auction, AIAgent, Bid } from '../types/auction.types';
import { useAuth } from '../context/AuthContext';
import socket from '../lib/socket';

// Use 10.0.2.2 for Android Emulator, or your LAN IP for physical device
const API_BASE = 'http://10.0.2.2:5000/api/auction';

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

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
    });

    const fetchAuctions = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/get-auction`, {
                headers: getHeaders(),
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

    const createAuction = useCallback(async (auctionData: Omit<Auction, 'bids'>) => {
        try {
            const response = await fetch(`${API_BASE}/create`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ ...auctionData, created_by: user?.id }),
            });
            const data = await response.json();

            if (response.ok && data.auction) {
                setAuctions((prev: Auction[]) => [...prev, data.auction]);
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

    const startAuction = useCallback(
        async (auctionId: string, selectedAgents: string[]) => {
            if (!user?.id || selectedAgents.length === 0) return;

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

                if (response.ok) {
                    await fetchAuctions();
                }
            } catch (err) {
                console.error('Error starting auction:', err);
            }
        },
        [user, session, fetchAuctions]
    );

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
                    await fetchAuctions();
                }
            } catch (err) {
                console.error('Error joining auction:', err);
            }
        },
        [user, session, fetchAuctions]
    );

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
                    setAuctions((prev: Auction[]) => prev.map((a: Auction) => (a.id === auctionId ? data.auction : a)));
                }
            } catch (err) {
                console.error('Error simulating bid:', err);
            }
        },
        [session]
    );

    const refreshAuctions = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);
        await Promise.all([fetchAuctions(), fetchAgents()]);
        if (showLoading) setLoading(false);
    }, [fetchAuctions, fetchAgents]);

    useEffect(() => {
        if (!user) return;
        refreshAuctions(true);
        const interval = setInterval(() => refreshAuctions(false), 5000);
        return () => clearInterval(interval);
    }, [user, refreshAuctions]);

    useEffect(() => {
        const handleAuctionUpdate = (payload: { auction?: Auction }) => {
            if (!payload?.auction) return;
            const updated = payload.auction;
            setAuctions((prev: Auction[]) => {
                const found = prev.find((a: Auction) => a.id === updated.id);
                return found ? prev.map((a: Auction) => (a.id === updated.id ? updated : a)) : [...prev, updated];
            });
        };

        const handleBidUpdate = (payload: { auction_id?: string; bid?: Bid; auction?: Auction }) => {
            if (!payload) return;
            if (payload.auction) {
                handleAuctionUpdate({ auction: payload.auction });
                return;
            }
            const auctionId = payload.auction_id;
            const bid = payload.bid;
            if (!auctionId || !bid) return;

            setAuctions((prev: Auction[]) =>
                prev.map((a: Auction) => {
                    if (a.id !== auctionId) return a;
                    const next = { ...a };
                    if (bid.amount !== undefined) next.currentPrice = bid.amount;
                    const existing = Array.isArray(next.bids) ? [...next.bids] : [];
                    if (!(bid.id && existing.some((b) => b.bidderId === bid.id))) {
                        existing.push(bid);
                    }
                    next.bids = existing;
                    return next;
                })
            );
        };

        socket.on('auction_update', handleAuctionUpdate);
        socket.on('bid_update', handleBidUpdate);
        socket.on('auction_complete', handleAuctionUpdate);

        return () => {
            socket.off('auction_update', handleAuctionUpdate);
            socket.off('bid_update', handleBidUpdate);
            socket.off('auction_complete', handleAuctionUpdate);
        };
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
