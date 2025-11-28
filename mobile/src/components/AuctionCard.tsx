import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Auction } from '../types/auction.types';
import { Clock, Users, TrendingUp, DollarSign } from 'lucide-react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);

interface AuctionCardProps {
    auction: Auction;
    onPress: () => void;
}

export function AuctionCard({ auction, onPress }: AuctionCardProps) {
    const formatTimeRemaining = (endTime: string | number) => {
        const end = new Date(endTime).getTime();
        const remaining = Math.max(0, end - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        if (remaining <= 0) return 'Ended';
        if (minutes === 0) return `${seconds}s`;
        return `${minutes}m ${seconds}s`;
    };

    const statusColor =
        auction.status === 'active' ? 'text-emerald-700 bg-emerald-100' :
            auction.status === 'pending' ? 'text-amber-700 bg-amber-100' :
                'text-slate-700 bg-slate-100';

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
            <StyledView className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
                <StyledView className={`h-1.5 w-full ${auction.status === 'active' ? 'bg-emerald-500' : auction.status === 'pending' ? 'bg-amber-500' : 'bg-gray-300'}`} />

                <StyledView className="p-4">
                    <StyledView className="flex-row justify-between items-start mb-3">
                        <StyledView className="flex-1 mr-2">
                            <StyledText className="text-lg font-bold text-gray-900" numberOfLines={1}>{auction.title}</StyledText>
                            <StyledText className="text-sm text-gray-500 mt-1" numberOfLines={2}>{auction.description}</StyledText>
                        </StyledView>
                        <StyledView className={`px-2 py-1 rounded-full ${statusColor}`}>
                            <StyledText className={`text-xs font-bold uppercase ${statusColor.split(' ')[0]}`}>
                                {auction.status}
                            </StyledText>
                        </StyledView>
                    </StyledView>

                    <StyledView className="flex-row justify-between mb-4">
                        <StyledView className="bg-gray-50 p-2 rounded-xl flex-1 mr-2">
                            <StyledView className="flex-row items-center mb-1">
                                <DollarSign size={12} color="#9CA3AF" />
                                <StyledText className="text-xs font-medium text-gray-400 uppercase ml-1">Price</StyledText>
                            </StyledView>
                            <StyledText className="text-lg font-bold text-gray-900">${auction.currentPrice.toLocaleString()}</StyledText>
                        </StyledView>

                        <StyledView className="bg-gray-50 p-2 rounded-xl flex-1 ml-2">
                            <StyledView className="flex-row items-center mb-1">
                                <Clock size={12} color="#9CA3AF" />
                                <StyledText className="text-xs font-medium text-gray-400 uppercase ml-1">Time</StyledText>
                            </StyledView>
                            <StyledText className={`text-lg font-bold ${auction.status === 'active' ? 'text-orange-600' : 'text-gray-900'}`}>
                                {formatTimeRemaining(auction.endTime)}
                            </StyledText>
                        </StyledView>
                    </StyledView>

                    <StyledView className="flex-row justify-between pt-3 border-t border-gray-100">
                        <StyledView className="flex-row items-center">
                            <TrendingUp size={14} color="#3B82F6" />
                            <StyledText className="text-sm font-medium text-gray-700 ml-1">{auction.bids?.length || 0} Bids</StyledText>
                        </StyledView>
                        <StyledView className="flex-row items-center">
                            <Users size={14} color="#A855F7" />
                            <StyledText className="text-sm font-medium text-gray-700 ml-1">{auction.participants?.length || 0} Active</StyledText>
                        </StyledView>
                    </StyledView>
                </StyledView>
            </StyledView>
        </TouchableOpacity>
    );
}
