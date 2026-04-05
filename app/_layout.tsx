import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InvoiceEditNotifier } from "@/components/InvoiceEditNotifier";
import { MessageNotifier } from "@/components/MessageNotifier";
import { PriceApprovalNotifier } from "@/components/PriceApprovalNotifier";
import { AppProvider } from "@/context/AppContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureDirection: "horizontal",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="new-invoice" options={{ headerShown: false }} />
      <Stack.Screen name="invoices" options={{ headerShown: false }} />
      <Stack.Screen name="invoice-detail" options={{ headerShown: false }} />
      <Stack.Screen name="transfer" options={{ headerShown: false }} />
      <Stack.Screen name="cash" options={{ headerShown: false }} />
      <Stack.Screen name="expenses" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="special-prices" options={{ headerShown: false }} />
      <Stack.Screen name="print-invoice" options={{ headerShown: false }} />
      <Stack.Screen name="manage-users" options={{ headerShown: false }} />
      <Stack.Screen name="price-approvals" options={{ headerShown: false }} />
      <Stack.Screen name="edit-invoice" options={{ headerShown: false }} />
      <Stack.Screen name="daily-close" options={{ headerShown: false }} />
      <Stack.Screen name="receivables" options={{ headerShown: false }} />
      <Stack.Screen name="warehouse-sale" options={{ headerShown: false }} />
      <Stack.Screen name="company-settings" options={{ headerShown: false }} />
      <Stack.Screen name="saved-reports" options={{ headerShown: false }} />
      <Stack.Screen name="suppliers" options={{ headerShown: false }} />
      <Stack.Screen name="driver-report" options={{ headerShown: false }} />
      <Stack.Screen name="van-transfer" options={{ headerShown: false }} />
      <Stack.Screen name="transfer-approvals" options={{ headerShown: false }} />
      <Stack.Screen name="transfer-report" options={{ headerShown: false }} />
      <Stack.Screen name="messages" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AppProvider>
                <RootLayoutNav />
                <PriceApprovalNotifier />
                <InvoiceEditNotifier />
                <MessageNotifier />
              </AppProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
