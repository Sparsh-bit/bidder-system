import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, SafeAreaView } from 'react-native';
import { useAuction } from '../hooks/useAuction';
import { X } from 'lucide-react-native';
import { styled } from 'nativewind';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledScrollView = styled(ScrollView);

type CreateAuctionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateAuction'>;

interface Props {
    navigation: CreateAuctionScreenNavigationProp;
}

export default function CreateAuctionScreen({ navigation }: Props) {
    const { createAuction } = useAuction();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startingPrice, setStartingPrice] = useState('100');
    const [reservePrice, setReservePrice] = useState('50');
    const [increment, setIncrement] = useState('10');
    const [duration, setDuration] = useState('60');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim()) return Alert.alert('Error', 'Title is required');

        setLoading(true);
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
            endTime: now + Number(duration) * 1000,
            currentPrice: Number(startingPrice),
            status: 'pending' as const,
            participants: [],
        };

        const result = await createAuction(auctionData);
        setLoading(false);

        if (result.success) {
            Alert.alert('Success', 'Auction created!');
            navigation.goBack();
        } else {
            Alert.alert('Error', 'Failed to create auction');
        }
    };

    return (
        <StyledSafeAreaView className="flex-1 bg-white">
            <StyledView className="flex-row items-center justify-between p-4 border-b border-gray-100">
                <StyledText className="text-xl font-bold text-gray-900">Create Auction</StyledText>
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
                    <X size={24} color="#9CA3AF" />
                </TouchableOpacity>
            </StyledView>

            <StyledScrollView className="p-4">
                <StyledView className="mb-4">
                    <StyledText className="text-sm font-bold text-gray-700 mb-1">Title</StyledText>
                    <StyledTextInput
                        value={title}
                        onChangeText={setTitle}
                        className="border border-gray-300 rounded-xl p-3"
                        placeholder="Item Name"
                    />
                </StyledView>

                <StyledView className="mb-4">
                    <StyledText className="text-sm font-bold text-gray-700 mb-1">Description</StyledText>
                    <StyledTextInput
                        value={description}
                        onChangeText={setDescription}
                        className="border border-gray-300 rounded-xl p-3 h-24"
                        placeholder="Item Description"
                        multiline
                        textAlignVertical="top"
                    />
                </StyledView>

                <StyledView className="flex-row justify-between mb-4">
                    <StyledView className="flex-1 mr-2">
                        <StyledText className="text-sm font-bold text-gray-700 mb-1">Start Price ($)</StyledText>
                        <StyledTextInput
                            value={startingPrice}
                            onChangeText={setStartingPrice}
                            className="border border-gray-300 rounded-xl p-3"
                            keyboardType="numeric"
                        />
                    </StyledView>
                    <StyledView className="flex-1 ml-2">
                        <StyledText className="text-sm font-bold text-gray-700 mb-1">Reserve ($)</StyledText>
                        <StyledTextInput
                            value={reservePrice}
                            onChangeText={setReservePrice}
                            className="border border-gray-300 rounded-xl p-3"
                            keyboardType="numeric"
                        />
                    </StyledView>
                </StyledView>

                <StyledView className="flex-row justify-between mb-6">
                    <StyledView className="flex-1 mr-2">
                        <StyledText className="text-sm font-bold text-gray-700 mb-1">Increment ($)</StyledText>
                        <StyledTextInput
                            value={increment}
                            onChangeText={setIncrement}
                            className="border border-gray-300 rounded-xl p-3"
                            keyboardType="numeric"
                        />
                    </StyledView>
                    <StyledView className="flex-1 ml-2">
                        <StyledText className="text-sm font-bold text-gray-700 mb-1">Duration (s)</StyledText>
                        <StyledTextInput
                            value={duration}
                            onChangeText={setDuration}
                            className="border border-gray-300 rounded-xl p-3"
                            keyboardType="numeric"
                        />
                    </StyledView>
                </StyledView>

                <StyledTouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    className="bg-blue-600 py-4 rounded-xl items-center"
                >
                    <StyledText className="text-white font-bold text-lg">
                        {loading ? 'Creating...' : 'Create Auction'}
                    </StyledText>
                </StyledTouchableOpacity>
            </StyledScrollView>
        </StyledSafeAreaView>
    );
}
