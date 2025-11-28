import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.aiauction.mobile',
    appName: 'AI Auction',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        CapacitorHttp: {
            enabled: true,
        },
    },
};

export default config;
