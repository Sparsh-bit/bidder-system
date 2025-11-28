import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView } from 'react-native';
import { useAuction } from '../hooks/useAuction';
import { useAuth } from '../context/AuthContext';
import { Auction } from '../types/auction.types';
import { Clock, X, Bot, User, DollarSign, Trophy, Play, Zap } from 'lucide-react-native';
import { styled } from 'nativewind';
import socket from '../lib/socket';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation.types';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledScrollView = styled(ScrollView);

type AuctionRoomScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AuctionRoom'>;
type AuctionRoomScreenRouteProp = RouteProp<RootStackParamList, 'AuctionRoom'>;

interface Props {
    route: AuctionRoomScreenRouteProp;
    navigation: AuctionRoomScreenNavigationProp;
}

export default function AuctionRoomScreen({ route, navigation }: Props) {
    const { auctionId } = route.params;
    const { auctions, aiAgents, startAuction, refreshAuctions, simulateBid } = useAuction();
    const { user } = useAuth();

    const initialAuction = auctions.find(a => a.id === auctionId);
    const [auction, setAuction] = useState<Auction | undefined>(initialAuction);
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [isWorking, setIsWorking] = useState(false);
    const [joined, setJoined] = useState(false);
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const found = auctions.find(a => a.id === auctionId);
        if (found) {
            setAuction(found);
            setStarted(found.status === 'active');
            setJoined(!!(found.participants && user && found.participants.includes(user.id)));
        }
    }, [auctions, auctionId, user]);

    useEffect(() => {
        if (!auctionId) return;
        socket.emit('join_auction', { auction_id: auctionId });
        return () => {
            socket.emit('leave_auction', { auction_id: auctionId });
        };
    }, [auctionId]);

    const handleStartAuction = async () => {
        if (!user) return Alert.alert('Error', 'Login required');
        if (!selectedAgentId) return Alert.alert('Error', 'Select an AI agent');
        setIsWorking(true);
        try {
            await startAuction(auctionId, [selectedAgentId]);
            setStarted(true);
            setJoined(true);
            await refreshAuctions();
        } catch (err) {
            Alert.alert('Error', 'Failed to start auction');
        } finally {
            setIsWorking(false);
        }
    };

    const handleJoinAuction = async () => {
        if (!user) return Alert.alert('Error', 'Login required');
        if (!selectedAgentId) return Alert.alert('Error', 'Select an AI agent'); // Optional: user might not need agent to join as spectator, but logic requires it
        setIsWorking(true);
        try {
            await startAuction(auctionId, [selectedAgentId]); // Reusing start logic for join as per web app
            setJoined(true);
            await refreshAuctions();
        } catch (err) {
            Alert.alert('Error', 'Failed to join auction');
        } finally {
            setIsWorking(false);
        }
    };

    if (!auction) return (
        <StyledSafeAreaView className="flex-1 items-center justify-center">
            <StyledText>Loading Auction...</StyledText>
        </StyledSafeAreaView>
    );

    return (
        <StyledSafeAreaView className="flex-1 bg-white">
            <StyledView className="flex-row items-center justify-between p-4 border-b border-gray-100">
                <StyledView className="flex-1">
                    <StyledText className="text-xl font-bold text-gray-900" numberOfLines={1}>{auction.title}</StyledText>
                    <StyledText className="text-gray-500 text-xs" numberOfLines={1}>{auction.description}</StyledText>
                </StyledView>
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
                    <X size={24} color="#9CA3AF" />
                </TouchableOpacity>
            </StyledView>

            <StyledScrollView className="flex-1 bg-gray-50">
                {/* Stats */}
                <StyledView className="p-4 flex-row justify-between">
                    <StyledView className="bg-white p-4 rounded-xl shadow-sm flex-1 mr-2 items-center">
                        <StyledText className="text-xs text-gray-500 mb-1">Current Price</StyledText>
                        <StyledText className="text-2xl font-bold text-green-600">${auction.currentPrice?.toFixed(2)}</StyledText>
                    </StyledView>
                    <StyledView className="bg-white p-4 rounded-xl shadow-sm flex-1 ml-2 items-center">
                        <StyledText className="text-xs text-gray-500 mb-1">Status</StyledText>
                        <StyledText className={`text-lg font-bold uppercase ${auction.status === 'active' ? 'text-orange-500' : 'text-gray-900'}`}>
                            {auction.status}
                        </StyledText>
                    </StyledView>
                </StyledView>

                {/* Winner Banner */}
                {auction.status === 'completed' && (
                    <StyledView className="mx-4 mb-4 bg-amber-50 border border-amber-200 p-4 rounded-xl items-center">
                        <Trophy size={32} color="#D97706" />
                        <StyledText className="text-lg font-bold text-amber-900 mt-2">Winner: {auction.winnerName || 'No Winner'}</StyledText>
                        <StyledText className="text-xl font-bold text-green-700 mt-1">${auction.winningPrice?.toFixed(2)}</StyledText>
                    </StyledView>
                )}

                {/* Controls */}
                {auction.status !== 'completed' && (
                    <StyledView className="mx-4 mb-4 bg-white p-4 rounded-xl shadow-sm">
                        <StyledText className="font-bold text-gray-900 mb-3">Select AI Agent</StyledText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                            {aiAgents.map((agent) => (
                                <TouchableOpacity
                                    key={agent.id}
                                    onPress={() => setSelectedAgentId(agent.id)}
                                    className={`mr-3 p-3 rounded-xl border w-40 ${selectedAgentId === agent.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
                                >
                                    <StyledText className="font-bold text-gray-900" numberOfLines={1}>{agent.name}</StyledText>
                                    <StyledText className="text-xs text-gray-500">{agent.strategyType}</StyledText>
                                    <StyledText className="text-xs font-bold text-green-600 mt-1">${agent.remainingBudget.toLocaleString()}</StyledText>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {!started && auction.status === 'pending' && (
                            <StyledTouchableOpacity
                                onPress={handleStartAuction}
                                disabled={isWorking || !selectedAgentId}
                                className={`w-full py-3 rounded-xl items-center flex-row justify-center ${!selectedAgentId ? 'bg-gray-300' : 'bg-blue-600'}`}
                            >
                                <Play size={20} color="white" />
                                <StyledText className="text-white font-bold ml-2">Start Auction</StyledText>
                            </StyledTouchableOpacity>
                        )}

                        {started && !joined && (
                            <StyledTouchableOpacity
                                onPress={handleJoinAuction}
                                disabled={isWorking || !selectedAgentId}
                                className={`w-full py-3 rounded-xl items-center flex-row justify-center ${!selectedAgentId ? 'bg-gray-300' : 'bg-green-600'}`}
                            >
                                <Zap size={20} color="white" />
                                <StyledText className="text-white font-bold ml-2">Join Auction</StyledText>
                            </StyledTouchableOpacity>
                        )}

                        {started && joined && (
                            <StyledView className="p-3 bg-green-50 rounded-xl items-center border border-green-200">
                                <StyledText className="text-green-700 font-bold">✅ You are participating</StyledText>
                            </StyledView>
                        )}
                    </StyledView>
                )}

                {/* Bid History */}
                <StyledView className="mx-4 mb-8">
                    <StyledText className="font-bold text-gray-900 mb-3">Live Bids ({auction.bids?.length || 0})</StyledText>
                    {auction.bids && auction.bids.length > 0 ? (
                        [...auction.bids].reverse().map((bid, idx) => (
                            <StyledView key={idx} className="bg-white p-3 rounded-xl border border-gray-100 mb-2 flex-row justify-between items-center">
                                <StyledView className="flex-row items-center">
                                    <StyledView className={`p-2 rounded-full mr-3 ${bid.bidderType === 'ai' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                                        {bid.bidderType === 'ai' ? <Bot size={16} color="#9333EA" /> : <User size={16} color="#2563EB" />}
                                    </StyledView>
                                    <StyledView>
                                        <StyledText className="font-bold text-gray-900">{bid.bidderName}</StyledText>
                                        <StyledText className="text-xs text-gray-500">{new Date(bid.timestamp).toLocaleTimeString()}</StyledText>
                                    </StyledView>
                                </StyledView>
                                <StyledText className="text-lg font-bold text-gray-900">${bid.amount.toLocaleString()}</StyledText>
                            </StyledView>
                        ))
                    ) : (
                        <StyledView className="items-center py-8">
                            <StyledText className="text-gray-400">No bids yet</StyledText>
                        </StyledView>
                    )}
                </StyledView>
            </StyledScrollView>
        </StyledSafeAreaView>
    );
}
