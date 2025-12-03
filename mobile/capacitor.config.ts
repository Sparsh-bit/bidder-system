import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.aiauction.mobile',
    appName: 'AI Auction',
    webDir: 'dist',
    server: {
        androidScheme: 'http',
        cleartext: true
    },
    plugins: {
        CapacitorHttp: {
            enabled: true,
        },
    },
};

export default config;
