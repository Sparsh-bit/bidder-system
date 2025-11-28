import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Gavel, LogIn, UserPlus } from 'lucide-react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSafeAreaView = styled(SafeAreaView);

export default function AuthScreen() {
    const { signIn, signUp } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (isSignUp) {
                if (!displayName.trim()) {
                    Alert.alert('Error', 'Display name is required');
                    setLoading(false);
                    return;
                }
                const { error } = await signUp(email, password, displayName);
                if (error) Alert.alert('Sign Up Failed', error.message);
            } else {
                const { error } = await signIn(email, password);
                if (error) Alert.alert('Sign In Failed', error.message);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <StyledSafeAreaView className="flex-1 bg-blue-50">
            <StyledView className="flex-1 justify-center px-6">
                <StyledView className="items-center mb-10">
                    <Gavel size={64} color="#2563EB" />
                    <StyledText className="text-3xl font-bold text-gray-900 mt-4">AI Auction</StyledText>
                    <StyledText className="text-gray-600 mt-2">
                        {isSignUp ? 'Create an account to start bidding' : 'Sign in to your account'}
                    </StyledText>
                </StyledView>

                <StyledView className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                    {isSignUp && (
                        <StyledView className="mb-4">
                            <StyledText className="text-sm font-medium text-gray-700 mb-1">Display Name</StyledText>
                            <StyledTextInput
                                value={displayName}
                                onChangeText={setDisplayName}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                                placeholder="Enter your display name"
                            />
                        </StyledView>
                    )}

                    <StyledView className="mb-4">
                        <StyledText className="text-sm font-medium text-gray-700 mb-1">Email</StyledText>
                        <StyledTextInput
                            value={email}
                            onChangeText={setEmail}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                            placeholder="you@example.com"
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </StyledView>

                    <StyledView className="mb-6">
                        <StyledText className="text-sm font-medium text-gray-700 mb-1">Password</StyledText>
                        <StyledTextInput
                            value={password}
                            onChangeText={setPassword}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                            placeholder="Enter your password"
                            secureTextEntry
                        />
                    </StyledView>

                    <StyledTouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        className="w-full bg-blue-600 py-4 rounded-xl flex-row justify-center items-center"
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                {isSignUp ? <UserPlus size={20} color="white" /> : <LogIn size={20} color="white" />}
                                <StyledText className="text-white font-bold ml-2 text-lg">
                                    {isSignUp ? 'Sign Up' : 'Sign In'}
                                </StyledText>
                            </>
                        )}
                    </StyledTouchableOpacity>

                    <StyledTouchableOpacity
                        onPress={() => setIsSignUp(!isSignUp)}
                        className="mt-4 items-center"
                    >
                        <StyledText className="text-blue-600 font-medium">
                            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                        </StyledText>
                    </StyledTouchableOpacity>
                </StyledView>
            </StyledView>
        </StyledSafeAreaView>
    );
}
