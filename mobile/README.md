# AI Auction Mobile App (React Native)

This is a full **React Native** port of the AI Auction platform, designed for high performance and native feel.

## 📂 Project Structure

- `App.tsx`: Main entry point with Navigation.
- `src/screens`: Full screen components (Dashboard, Room, Auth, etc.).
- `src/components`: Reusable UI components (AuctionCard, AIAgentPanel).
- `src/context`: Authentication state management.
- `src/hooks`: Business logic (fetching auctions, bidding).
- `src/lib`: Supabase and Socket.io configuration.

## 🚀 Setup & Installation

1.  **Navigate to the mobile directory:**
    ```bash
    cd mobile
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Start the Metro Bundler:**
    ```bash
    npx expo start
    ```

## 📱 Running on Android

### Option 1: Expo Go (Easiest)
1.  Download **Expo Go** from the Google Play Store on your phone.
2.  Run `npx expo start`.
3.  Scan the QR code with the app.

### Option 2: Android Emulator (Native Build)
1.  Ensure you have **Android Studio** installed and an emulator running.
2.  Run:
    ```bash
    npx expo run:android
    ```

## 🔧 Configuration

- **Supabase**: Update `src/lib/supabase.ts` with your URL and Anon Key.
- **Socket.io**: Update `src/lib/socket.ts`.
    - For Emulator: `http://10.0.2.2:5000`
    - For Physical Device: Use your PC's LAN IP (e.g., `http://192.168.1.5:5000`).

## 📦 Building for Production (APK/AAB)

To generate a release build for the Play Store:

1.  **Install EAS CLI:**
    ```bash
    npm install -g eas-cli
    ```

2.  **Login to Expo:**
    ```bash
    eas login
    ```

3.  **Configure Build:**
    ```bash
    eas build:configure
    ```

4.  **Build for Android:**
    ```bash
    eas build --platform android
    ```

## ❓ Why React Native instead of Capacitor?
You requested a conversion to **React Native components** (`View`, `Text`). This project uses **Expo** (the standard framework for React Native) to provide a true native experience. 

If you strictly wanted to wrap your *existing web website* without rewriting code, you would use Capacitor on the `frontend` folder. However, this `mobile` folder contains a **native rewrite** as per your instructions to replace HTML tags with Native equivalents.
