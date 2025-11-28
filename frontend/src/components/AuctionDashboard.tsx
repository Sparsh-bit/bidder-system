// src/components/AuctionDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useAuction } from '../hooks/useAuction';
import { Auction } from '../types/auction.types';
import { Clock, Users, TrendingUp, DollarSign, RefreshCw, Gavel, Plus, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuctionDashboardProps {
  onSelectAuction: (auction: Auction) => void;
  onCreateNew: () => void;
}

export function AuctionDashboard({ onSelectAuction, onCreateNew }: AuctionDashboardProps) {
  const { auctions, loading } = useAuction();
  const { wallet } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update time remaining for all active auctions
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining: Record<string, number> = {};
      auctions.forEach((auction) => {
        if (auction.status === 'active') {
          newTimeRemaining[auction.id] = Math.max(0, new Date(auction.endTime).getTime() - Date.now());
        }
      });
      setTimeRemaining(newTimeRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [auctions]);

  const formatTimeRemaining = (endTime: string | number): string => {
    const end = new Date(endTime).getTime();
    const remaining = Math.max(0, end - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    if (remaining <= 0) return 'Ended';
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      // We can just re-trigger the hook's fetch if exposed, but for now we'll simulate a delay
      await new Promise(resolve => setTimeout(resolve, 800));
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Gavel className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <span className="mt-4 text-gray-500 font-medium animate-pulse">Loading Marketplace...</span>
      </div>
    );
  }

  const sortedAuctions = [...auctions].sort((a, b) => {
    const statusPriority: Record<string, number> = { active: 0, pending: 1, completed: 2, cancelled: 3 };
    const priorityDiff = (statusPriority[a.status] ?? 4) - (statusPriority[b.status] ?? 4);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/20 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            Auction Marketplace
          </h2>
          <p className="text-gray-500 mt-1">
            Discover and bid on exclusive AI-driven auctions
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Wallet Card */}
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full text-green-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">My Balance</div>
              <div className="text-lg font-bold text-gray-900">
                ${wallet?.balance?.toLocaleString() ?? '0.00'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2.5 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 shadow-sm"
              title="Refresh List"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onCreateNew}
              className="flex items-center px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Auction
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {sortedAuctions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-gray-300">
          <div className="bg-blue-50 p-4 rounded-full mb-4">
            <Gavel className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Auctions Yet</h3>
          <p className="text-gray-500 max-w-md text-center mb-6">
            Be the first to start an auction and watch AI agents compete for the best price.
          </p>
          <button
            onClick={onCreateNew}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            Create Your First Auction
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedAuctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              timeRemaining={formatTimeRemaining(auction.endTime)}
              onClick={() => onSelectAuction(auction)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AuctionCard({ auction, timeRemaining, onClick }: { auction: Auction, timeRemaining: string, onClick: () => void }) {
  const statusStyles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse',
    completed: 'bg-slate-100 text-slate-700 border-slate-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Upcoming',
    active: 'Live Now',
    completed: 'Ended',
    cancelled: 'Cancelled',
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Top Gradient Bar */}
      <div className={`h-1.5 w-full ${auction.status === 'active' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
        auction.status === 'pending' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
          'bg-gray-200'
        }`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 mr-3">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
              {auction.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2 h-10">
              {auction.description || 'No description provided'}
            </p>
          </div>
          <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-full border ${statusStyles[auction.status] ?? 'bg-gray-100 text-gray-700'}`}>
            {statusLabels[auction.status] ?? auction.status}
          </span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="flex items-center text-gray-400 mb-1">
              <DollarSign className="w-3.5 h-3.5 mr-1" />
              <span className="text-xs font-medium uppercase">Price</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              ${auction.currentPrice.toLocaleString()}
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="flex items-center text-gray-400 mb-1">
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span className="text-xs font-medium uppercase">
                {auction.status === 'completed' ? 'Ended' : 'Time Left'}
              </span>
            </div>
            <div className={`text-lg font-bold ${auction.status === 'active' ? 'text-orange-600' : 'text-gray-900'}`}>
              {auction.status === 'completed'
                ? new Date(auction.endTime).toLocaleDateString()
                : timeRemaining}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
          <div className="flex items-center">
            <TrendingUp className="w-4 h-4 mr-1.5 text-blue-500" />
            <span className="font-medium text-gray-700">{auction.bids?.length || 0}</span>
            <span className="ml-1">Bids</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1.5 text-purple-500" />
            <span className="font-medium text-gray-700">{auction.participants?.length || 0}</span>
            <span className="ml-1">Active</span>
          </div>
        </div>
      </div>

      {/* Hover Action Overlay */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
    </div>
  );
}
