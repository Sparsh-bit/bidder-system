// src/components/AuctionRoom.tsx
import React, { useState, useEffect } from 'react';
import socket from '../lib/socket';

import { useAuction } from '../hooks/useAuction';
import { Auction } from '../types/auction.types';
import { Clock, X, Bot, User, DollarSign, Trophy, Play, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuctionRoomProps {
  auction: Auction;
  onClose?: () => void;
}

export function AuctionRoom({ auction: initialAuction, onClose }: AuctionRoomProps) {
  const { aiAgents, startAuction, refreshAuctions, simulateBid } = useAuction();
  const { user } = useAuth();

  const [auction, setAuction] = useState<Auction>(initialAuction);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isWorking, setIsWorking] = useState(false);
  const [joined, setJoined] = useState(false);
  const [started, setStarted] = useState(initialAuction.status === 'active');

  // If parent passes a new auction prop (rare), keep local state in sync
  useEffect(() => {
    setAuction(initialAuction);
    setStarted(initialAuction.status === 'active');
  }, [initialAuction]);

  // Join socket room and listen for live updates for this auction
  useEffect(() => {
    if (!auction?.id) return;

    // Join the auction-specific room on the server
    socket.emit('join_auction', { auction_id: auction.id });

    // Handler for bid_update (preferred minimal payload)
    const handleBidUpdate = (payload: {
      auction_id?: string;
      bid?: any;
      auction?: Auction;
    }) => {
      if (!payload) return;
      const id = payload.auction_id || payload.auction?.id;
      if (id !== auction.id) return;

      // If backend sent full auction
      if (payload.auction) {
        setAuction({ ...payload.auction });
        return;
      }

      // If backend sent only a bid
      if (payload.bid) {
        setAuction((prev) => {
          const next = { ...prev };

          // update current price if provided
          if (payload.bid.amount !== undefined && payload.bid.amount !== null) {
            next.currentPrice = payload.bid.amount;
          }

          // append bid into bids array, ensure not to mutate original
          const existing = Array.isArray(next.bids) ? [...next.bids] : [];
          // avoid duplicates by id (if bid has id)
          if (payload.bid.id && existing.some((b) => b.bidderId === payload.bid.id)) {
            return next;
          }
          existing.push(payload.bid);
          next.bids = existing;
          return next;
        });
      }
    };

    // Handler for full auction updates / completion
    const handleAuctionUpdate = (payload: { auction: Auction }) => {
      if (!payload?.auction) return;
      if (payload.auction.id === auction.id) {
        setAuction({ ...payload.auction });
      }
    };

    socket.on('bid_update', handleBidUpdate);
    socket.on('auction_update', handleAuctionUpdate);
    socket.on('auction_complete', handleAuctionUpdate);

    return () => {
      // leave room and clean listeners on unmount / auction change
      socket.emit('leave_auction', { auction_id: auction.id });
      socket.off('bid_update', handleBidUpdate);
      socket.off('auction_update', handleAuctionUpdate);
      socket.off('auction_complete', handleAuctionUpdate);
    };
    // We intentionally depend on auction.id so we re-join if auction changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction.id]);

  // Keep joined/started status in sync with auction state + user
  useEffect(() => {
    setJoined(!!(auction.participants && user && auction.participants.includes(user.id)));
    setStarted(auction.status === 'active');
  }, [auction, user]);

  const formatRemainingTime = (endTime: number) => {
    const remaining = Math.max(0, endTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    if (remaining <= 0) return 'Ended';
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  // Start Auction
  const handleStartAuction = async () => {
    if (!user) return alert('You must be logged in to start the auction.');
    if (!selectedAgentId) return alert('Please select an AI agent.');

    setIsWorking(true);
    try {
      await startAuction(auction.id, [selectedAgentId]);
      setStarted(true);
      setJoined(true);
      await refreshAuctions();
    } catch (err) {
      console.error(err);
      alert('Failed to start auction.');
    } finally {
      setIsWorking(false);
    }
  };

  // Join Active Auction
  const handleJoinAuction = async () => {
    if (!user) return alert('You must be logged in to join.');
    if (!selectedAgentId) return alert('Select an AI agent first.');

    setIsWorking(true);
    try {
      await startAuction(auction.id, [selectedAgentId]);
      setJoined(true);
      await refreshAuctions();
    } catch (err) {
      console.error(err);
      alert('Failed to join auction.');
    } finally {
      setIsWorking(false);
    }
  };

  // Manually trigger one simulation round (debug)
  const handleManualSimulate = async () => {
    setIsWorking(true);
    try {
      await simulateBid(auction.id);
      await refreshAuctions();
    } catch (err) {
      console.error(err);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{auction.title}</h2>
          <p className="text-gray-500 text-sm mt-1">{auction.description}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 h-full">

          {/* LEFT PANEL: Controls & Stats */}
          <div className="lg:col-span-4 p-6 overflow-y-auto border-r border-gray-100 bg-gray-50/50">

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Current Price</div>
                <div className="text-2xl font-bold text-green-600">${auction.currentPrice?.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Time Remaining</div>
                <div className={`text-2xl font-bold ${auction.status === 'active' ? 'text-orange-500 animate-pulse' : 'text-gray-900'}`}>
                  {formatRemainingTime(auction.endTime)}
                </div>
              </div>
            </div>

            {/* Winner Banner */}
            {auction.status === 'completed' && (
              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border border-amber-200 p-6 rounded-2xl text-center mb-8 shadow-sm">
                <Trophy className="w-10 h-10 text-amber-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-amber-900">Auction Completed</h3>
                <div className="mt-2 text-amber-800">
                  Winner: <span className="font-bold">{auction.winnerName || 'No Winner'}</span>
                </div>
                <div className="text-2xl font-bold text-green-700 mt-1">
                  ${auction.winningPrice?.toFixed(2) ?? '0.00'}
                </div>
              </div>
            )}

            {/* Agent Selection & Controls */}
            {auction.status !== 'completed' && (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                  <Bot className="w-5 h-5 mr-2 text-blue-600" />
                  Select Your AI Agent
                </h3>

                {aiAgents.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No AI Agents available.
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    {aiAgents.map((agent) => (
                      <label
                        key={agent.id}
                        className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${selectedAgentId === agent.id
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                      >
                        <input
                          type="radio"
                          name="agent-select"
                          value={agent.id}
                          checked={selectedAgentId === agent.id}
                          onChange={() => setSelectedAgentId(agent.id)}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border mr-3 flex items-center justify-center ${selectedAgentId === agent.id ? 'border-blue-600' : 'border-gray-400'
                          }`}>
                          {selectedAgentId === agent.id && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{agent.name}</div>
                          <div className="text-xs text-gray-500 flex justify-between mt-0.5">
                            <span>{agent.strategyType}</span>
                            <span className="font-semibold text-green-600">${agent.remainingBudget.toLocaleString()}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {!started && auction.status === 'pending' && (
                  <button
                    onClick={handleStartAuction}
                    disabled={isWorking || !selectedAgentId}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center"
                  >
                    {isWorking ? 'Starting...' : (
                      <>
                        <Play className="w-4 h-4 mr-2" /> Start Auction
                      </>
                    )}
                  </button>
                )}

                {started && !joined && (
                  <button
                    onClick={handleJoinAuction}
                    disabled={isWorking || !selectedAgentId}
                    className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-600/20 flex items-center justify-center"
                  >
                    {isWorking ? 'Joining...' : (
                      <>
                        <Zap className="w-4 h-4 mr-2" /> Join Auction
                      </>
                    )}
                  </button>
                )}

                {started && joined && (
                  <div className="p-3 bg-green-50 text-green-700 rounded-xl text-center font-medium border border-green-200">
                    ✅ You are participating
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Bid History */}
          <div className="lg:col-span-8 p-6 bg-gray-50 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-gray-500" />
                Live Bid History
              </h3>
              <span className="text-xs font-medium px-2 py-1 bg-gray-200 text-gray-600 rounded-full">
                {auction.bids?.length || 0} Bids
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {auction.bids && auction.bids.length > 0 ? (
                [...auction.bids].reverse().map((bid, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${idx === 0
                        ? 'bg-white border-blue-200 shadow-md transform scale-[1.01]'
                        : 'bg-white/60 border-gray-100'
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full mr-3 ${bid.bidderType === 'ai' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                          {bid.bidderType === 'ai' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">
                            {bid.bidderName}
                            {idx === 0 && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Leading</span>}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(bid.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-xl font-bold text-gray-900">
                        ${bid.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <DollarSign className="w-8 h-8 text-gray-300" />
                  </div>
                  <p>No bids placed yet.</p>
                  <p className="text-sm">Waiting for auction to start...</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
