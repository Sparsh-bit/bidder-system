import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, SafeAreaView } from 'react-native';
import { useAuction } from '../hooks/useAuction';
import { useAuth } from '../context/AuthContext';
import { AuctionCard } from '../components/AuctionCard';
import { AIAgentPanel } from '../components/AIAgentPanel';
import { Plus, LogOut, Wallet } from 'lucide-react-native';
import { styled } from 'nativewind';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSafeAreaView = styled(SafeAreaView);

type DashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Props {
    navigation: DashboardScreenNavigationProp;
}

export default function DashboardScreen({ navigation }: Props) {
    const { auctions, aiAgents, loading, refreshAuctions } = useAuction();
    const { profile, signOut } = useAuth();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshAuctions();
        setRefreshing(false);
    };

    const sortedAuctions = [...auctions].sort((a, b) => {
        const statusPriority: Record<string, number> = { active: 0, pending: 1, completed: 2, cancelled: 3 };
        const priorityDiff = (statusPriority[a.status] ?? 4) - (statusPriority[b.status] ?? 4);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });

    return (
        <StyledSafeAreaView className="flex-1 bg-gray-50">
            <StyledView className="flex-row justify-between items-center px-4 py-4 bg-white border-b border-gray-200">
                <StyledView>
                    <StyledText className="text-xl font-bold text-gray-900">Marketplace</StyledText>
                    <StyledText className="text-xs text-gray-500">Welcome, {profile?.display_name}</StyledText>
                </StyledView>
                <StyledView className="flex-row items-center">
                    <StyledView className="bg-green-50 px-3 py-1 rounded-full mr-3 flex-row items-center border border-green-100">
                        <Wallet size={14} color="#16A34A" />
                        <StyledText className="text-green-700 font-bold ml-1">${profile?.balance.toFixed(2)}</StyledText>
                    </StyledView>
                    <TouchableOpacity onPress={signOut}>
                        <LogOut size={20} color="#6B7280" />
                    </TouchableOpacity>
                </StyledView>
            </StyledView>

            <FlatList
                data={sortedAuctions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <AuctionCard
                        auction={item}
                        onPress={() => navigation.navigate('AuctionRoom', { auctionId: item.id })}
                    />
                )}
                contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListHeaderComponent={<AIAgentPanel agents={aiAgents} />}
                ListEmptyComponent={
                    <StyledView className="items-center py-10">
                        <StyledText className="text-gray-500">No auctions found</StyledText>
                    </StyledView>
                }
            />

            <StyledTouchableOpacity
                className="absolute bottom-6 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg elevation-5"
                onPress={() => navigation.navigate('CreateAuction')}
            >
                <Plus size={28} color="white" />
            </StyledTouchableOpacity>
        </StyledSafeAreaView>
    );
}
