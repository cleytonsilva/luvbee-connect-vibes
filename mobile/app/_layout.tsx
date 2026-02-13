import { useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import '../src/i18n';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const onLayoutRootView = useCallback(async () => {
    // This tells the splash screen to hide immediately! If we do this after
    // `setAppIsReady`, then we may see a blank screen while the app is
    // loading its initial state and rendering its first pixels. So instead,
    // we hide the splash screen once we know the root view has already
    // performed layout.
    await SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="chat/[id]" />
          </Stack>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
