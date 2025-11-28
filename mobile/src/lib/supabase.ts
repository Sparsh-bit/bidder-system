import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase URL and Key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://elfpiesdksdzbmmixxxa.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZnBpZXNka3NkemJtbWl4eHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MjA0MTAsImV4cCI6MjA3NTQ5NjQxMH0.LPQvnGVPI9S1ks2-_gcRAkxXBRWR-qQpvuUsX8nZRw4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
