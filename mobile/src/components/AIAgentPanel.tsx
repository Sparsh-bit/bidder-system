import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AIAgent } from '../types/auction.types';
import { Bot, TrendingUp, DollarSign, Zap, Settings, Activity } from 'lucide-react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);

interface AIAgentPanelProps {
    agents: AIAgent[];
}

export function AIAgentPanel({ agents }: AIAgentPanelProps) {
    const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

    const getStrategyColor = (strategy?: string) => {
        switch (strategy) {
            case 'reinforcement_learning': return 'bg-purple-100 text-purple-800';
            case 'heuristic': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getBudgetUtilization = (agent: AIAgent) => {
        const total = agent?.budget || 0;
        const remaining = agent?.remainingBudget || 0;
        const utilized = total - remaining;
        const percentage = total > 0 ? (utilized / total) * 100 : 0;
        return { utilized, percentage };
    };

    if (!agents || agents.length === 0) {
        return (
            <StyledView className="bg-white rounded-lg shadow-sm p-6 mb-4">
                <StyledText className="text-xl font-bold text-gray-900 mb-4">AI Agents</StyledText>
                <StyledView className="items-center py-8">
                    <Bot size={48} color="#9CA3AF" />
                    <StyledText className="text-gray-500 mt-3">No AI agents available</StyledText>
                </StyledView>
            </StyledView>
        );
    }

    return (
        <StyledView className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <StyledView className="flex-row items-center mb-4">
                <Bot size={24} color="#1F2937" />
                <StyledText className="text-xl font-bold text-gray-900 ml-2">AI Agents ({agents.length})</StyledText>
            </StyledView>

            <ScrollView>
                {agents.map((agent) => {
                    if (!agent) return null;
                    const { percentage } = getBudgetUtilization(agent);
                    const isExpanded = expandedAgent === agent.id;
                    const safeName = agent.name || 'Unnamed Agent';

                    return (
                        <StyledView
                            key={agent.id}
                            className={`border rounded-lg mb-3 ${agent.isActive ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}
                        >
                            <TouchableOpacity
                                className="p-4"
                                onPress={() => setExpandedAgent(isExpanded ? null : agent.id)}
                            >
                                <StyledView className="flex-row justify-between items-center">
                                    <StyledView className="flex-row items-center flex-1">
                                        <StyledView className={`p-2 rounded-lg mr-3 ${agent.isActive ? 'bg-green-200' : 'bg-gray-200'}`}>
                                            <Bot size={20} color={agent.isActive ? '#15803D' : '#4B5563'} />
                                        </StyledView>
                                        <StyledView className="flex-1">
                                            <StyledText className="text-lg font-semibold text-gray-900" numberOfLines={1}>
                                                {safeName}
                                            </StyledText>
                                            <StyledView className="flex-row mt-1">
                                                <StyledText className={`text-xs px-2 py-0.5 rounded-full overflow-hidden ${getStrategyColor(agent.strategyType)}`}>
                                                    {agent.strategyType}
                                                </StyledText>
                                            </StyledView>
                                        </StyledView>
                                    </StyledView>

                                    <StyledView className="items-end ml-2">
                                        <StyledText className="text-lg font-bold text-gray-900">
                                            ${agent.remainingBudget?.toLocaleString() || '0'}
                                        </StyledText>
                                        <StyledText className="text-xs text-gray-500">
                                            of ${agent.budget?.toLocaleString() || '0'}
                                        </StyledText>
                                    </StyledView>
                                </StyledView>

                                {/* Progress Bar */}
                                <StyledView className="mt-3">
                                    <StyledView className="flex-row justify-between mb-1">
                                        <StyledText className="text-xs text-gray-600">Budget Utilized</StyledText>
                                        <StyledText className="text-xs text-gray-600">{percentage.toFixed(1)}%</StyledText>
                                    </StyledView>
                                    <StyledView className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <StyledView
                                            className={`h-2 rounded-full ${percentage > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </StyledView>
                                </StyledView>
                            </TouchableOpacity>

                            {isExpanded && (
                                <StyledView className="border-t border-gray-200 p-4 bg-gray-50">
                                    <StyledView className="flex-row flex-wrap justify-between">
                                        <StyledView className="items-center w-[45%] mb-4">
                                            <DollarSign size={20} color="#16A34A" />
                                            <StyledText className="font-bold text-gray-900 mt-1">${agent.totalSpent?.toLocaleString()}</StyledText>
                                            <StyledText className="text-xs text-gray-500">Spent</StyledText>
                                        </StyledView>
                                        <StyledView className="items-center w-[45%] mb-4">
                                            <TrendingUp size={20} color="#2563EB" />
                                            <StyledText className="font-bold text-gray-900 mt-1">${agent.valuationCap?.toLocaleString()}</StyledText>
                                            <StyledText className="text-xs text-gray-500">Valuation</StyledText>
                                        </StyledView>
                                        <StyledView className="items-center w-[45%]">
                                            <Zap size={20} color="#CA8A04" />
                                            <StyledText className="font-bold text-gray-900 mt-1">{(agent.aggressionLevel * 100).toFixed(0)}%</StyledText>
                                            <StyledText className="text-xs text-gray-500">Aggression</StyledText>
                                        </StyledView>
                                        <StyledView className="items-center w-[45%]">
                                            <Activity size={20} color="#9333EA" />
                                            <StyledText className="font-bold text-gray-900 mt-1">{agent.isActive ? 'ON' : 'OFF'}</StyledText>
                                            <StyledText className="text-xs text-gray-500">Status</StyledText>
                                        </StyledView>
                                    </StyledView>
                                </StyledView>
                            )}
                        </StyledView>
                    );
                })}
            </ScrollView>
        </StyledView>
    );
}
