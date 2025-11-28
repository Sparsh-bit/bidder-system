import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.example.app",
    appName: "Bidder System",
    webDir: "dist",
    server: {
        androidScheme: "http"
    }
};

export default config;
