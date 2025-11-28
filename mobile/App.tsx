import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AuctionRoomScreen from './src/screens/AuctionRoomScreen';
import CreateAuctionScreen from './src/screens/CreateAuctionScreen';
import { View, ActivityIndicator } from 'react-native';

import { RootStackParamList } from './src/types/navigation.types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                <Stack.Screen name="Auth" component={AuthScreen} />
            ) : (
                <>
                    <Stack.Screen name="Dashboard" component={DashboardScreen} />
                    <Stack.Screen name="AuctionRoom" component={AuctionRoomScreen} />
                    <Stack.Screen
                        name="CreateAuction"
                        component={CreateAuctionScreen}
                        options={{ presentation: 'modal' }}
                    />
                </>
            )}
        </Stack.Navigator>
    );
}

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
    return (
        <SafeAreaProvider>
            <StatusBar style="light" backgroundColor="black" />
            <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
                <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
                    <NavigationContainer>
                        <AuthProvider>
                            <AppNavigator />
                        </AuthProvider>
                    </NavigationContainer>
                </View>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
