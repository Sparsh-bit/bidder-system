import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthWrapper } from './components/AuthWrapper';
import { AuctionDashboard } from './components/AuctionDashboard';
import { AuctionCreator } from './components/AuctionCreator';
import { AuctionRoom } from './components/AuctionRoom';
import { AIAgentPanel } from './components/AIAgentPanel';
import { useAuction } from './hooks/useAuction';
import { Auction } from './types/auction.types';
import { Gavel, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function AuctionApp() {
  const { profile, signOut } = useAuth();
  const { aiAgents } = useAuction();
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden text-gray-900 font-sans">
      {/* Background Video / Animation Layer */}
      <div className="absolute inset-0 -z-10">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-30"
          src="https://cdn.pixabay.com/video/2020/04/18/36465-410668940_large.mp4"
        />

        {/* Overlay Gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/50 to-white/80 backdrop-blur-[2px]"></div>

        {/* Fallback Animated Gradient (visible if video fails or loads slow) */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 animate-gradient-xy -z-20"></div>
      </div>

      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md sticky top-0 z-30 border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-600/20"
              >
                <Gavel className="h-6 w-6 text-white" />
              </motion.div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight">
                AI Auction Platform
              </h1>
            </div>

            <div className="flex items-center space-x-6">
              <div className="hidden md:block text-sm text-gray-600 bg-white/50 px-3 py-1 rounded-full border border-white/50 backdrop-blur-sm">
                Welcome, <span className="font-semibold text-gray-900">{profile?.display_name}</span>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="px-4 py-1.5 bg-green-50/80 text-green-700 text-sm font-bold rounded-full border border-green-200 shadow-sm backdrop-blur-sm"
              >
                ${profile?.balance.toFixed(2)}
              </motion.div>
              <button
                onClick={() => signOut()}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Column - Auctions */}
          <div className="lg:col-span-8 space-y-6">
            <AuctionDashboard
              onSelectAuction={setSelectedAuction}
              onCreateNew={() => setIsCreating(true)}
            />
          </div>

          {/* Right Column - AI Agents */}
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <AIAgentPanel agents={aiAgents} />
            </div>
          </div>
        </div>
      </main>

      {/* Create Auction Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/20"
            >
              <AuctionCreator onClose={() => setIsCreating(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auction Room Modal */}
      <AnimatePresence>
        {selectedAuction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto border border-white/20"
            >
              <AuctionRoom
                auction={selectedAuction}
                onClose={() => setSelectedAuction(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthWrapper>
        <AuctionApp />
      </AuthWrapper>
    </AuthProvider>
  );
}