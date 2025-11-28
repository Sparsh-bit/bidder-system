// src/components/AuctionCreator.tsx
import React, { useState } from 'react';
import { useAuction } from '../hooks/useAuction';
import { Plus, Calendar, DollarSign, TrendingUp, Clock, X } from 'lucide-react';

interface AuctionCreatorProps {
  onClose?: () => void;
}

export function AuctionCreator({ onClose }: AuctionCreatorProps) {
  const { createAuction } = useAuction();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState(100);
  const [reservePrice, setReservePrice] = useState(50);
  const [increment, setIncrement] = useState(10);
  const [duration, setDuration] = useState(60); // Duration in seconds
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validation
    if (!title.trim()) {
      setError('Title is required');
      setLoading(false);
      return;
    }

    if (startingPrice <= 0) {
      setError('Starting price must be greater than 0');
      setLoading(false);
      return;
    }

    if (increment <= 0) {
      setError('Bid increment must be greater than 0');
      setLoading(false);
      return;
    }

    if (duration < 30) {
      setError('Auction duration must be at least 30 seconds');
      setLoading(false);
      return;
    }

    const now = Date.now();
    const auctionData = {
      id: `auction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      description: description.trim(),
      format: 'english' as const,
      startingPrice: Number(startingPrice),
      reservePrice: Number(reservePrice),
      increment: Number(increment),
      startTime: now,
      endTime: now + duration * 1000, // Convert seconds to milliseconds
      currentPrice: Number(startingPrice),
      status: 'pending' as const,
      participants: [],
    };

    try {
      const success = await createAuction(auctionData);

      if (success) {
        setSuccess(true);
        setTimeout(() => {
          if (onClose) onClose();
        }, 1500);
      } else {
        setError('Failed to create auction. Please try again.');
      }
    } catch (err) {
      console.error('Error creating auction:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Plus className="w-6 h-6 mr-2 text-blue-600" />
          Create New Auction
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center">
          <span className="mr-2">✅</span> Auction created successfully! Closing...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Vintage Rolex Submariner"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            required
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the item condition, history, etc..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Starting Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={startingPrice}
                onChange={(e) => setStartingPrice(Number(e.target.value))}
                min="0.01"
                step="0.01"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Reserve Price
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={reservePrice}
                onChange={(e) => setReservePrice(Number(e.target.value))}
                min="0"
                step="0.01"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Bid Increment <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <TrendingUp className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={increment}
                onChange={(e) => setIncrement(Number(e.target.value))}
                min="0.01"
                step="0.01"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Duration (sec) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="30"
                max="3600"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Auction...
              </>
            ) : (
              <>
                Create Auction
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
