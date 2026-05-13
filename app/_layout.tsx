// app/_layout.tsx
//
// disableSystemFontScaling() runs at module-evaluation time — before React,
// before Expo Router, before any provider — so Text/TextInput are patched
// before the first component renders. Do NOT copy this call into screen files.

// ── STEP 1: patch Text/TextInput ─────────────────────────────────────────────
import { disableSystemFontScaling } from "@/src/utils/disableFontScaling";
disableSystemFontScaling();

// ── STEP 2: React & Expo ──────────────────────────────────────────────────────
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import * as NavigationBar from "expo-navigation-bar";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

// ── STEP 3: providers & services ─────────────────────────────────────────────
import ToastNotification from "@/src/components/ToastNotification";
import {
    AuthProvider,
    setSuppressNextSignedIn,
    useAuth,
} from "@/src/context/AuthContext";
import { ThemeProvider, useThemeContext } from "@/src/context/ThemeContext";
import { ToastProvider } from "@/src/context/ToastContext";
import { robotService } from "@/src/services/ProductionRobotService";
import { supabase } from "@/src/services/supabase";

SplashScreen.preventAutoHideAsync();

/* ─────────────────────────────────────────────────────────────────────────────
   ROOT LAYOUT
───────────────────────────────────────────────────────────────────────────── */
export default function RootLayout() {
  // ── Load all three SF Pro weights ────────────────────────────────────────
  // All three variants MUST be registered here so AppText can resolve
  // SF-Pro-Display-Bold / Semibold / Regular by name on Android.
  const [fontsLoaded, fontError] = useFonts({
    "SF-Pro-Display-Regular": require("../assets/fonts/SF-Pro-Display-Regular.otf"),
    "SF-Pro-Display-Semibold": require("../assets/fonts/SF-Pro-Display-Semibold.otf"),
    "SF-Pro-Display-Bold": require("../assets/fonts/SF-Pro-Display-Bold.otf"),
  });

  const [appReady, setAppReady] = useState(false);

  // ── Deep-link / email-link handler ───────────────────────────────────────
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(url);
        if (error || !data?.session) return;
        const lower = url.toLowerCase();
        if (lower.includes("reset-password") || lower.includes("recovery")) {
          setSuppressNextSignedIn(true);
          setTimeout(() => router.replace("/reset-password"), 100);
        } else if (lower.includes("verified-account")) {
          setTimeout(() => router.replace("/verified-account"), 100);
        }
      } catch {
        // URL carries no auth code — ignore silently
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    const sub = Linking.addEventListener("url", ({ url }) => {
      if (url) handleDeepLink(url);
    });
    return () => sub.remove();
  }, []);

  // ── Initialize robot service + allow providers to settle ────────────────
  useEffect(() => {
    const run = async () => {
      try {
        await Promise.all([
          robotService.initialize(),
          new Promise((r) => setTimeout(r, 80)),
        ]);
      } catch (e) {
        console.warn("[RootLayout] prepare:", e);
      } finally {
        setAppReady(true);
      }
    };
    run();
  }, []);

  // ── Hide splash only after fonts AND app are ready ───────────────────────
  const onLayout = useCallback(async () => {
    if ((fontsLoaded || fontError) && appReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, appReady]);

  // Keep splash while fonts load
  if ((!fontsLoaded && !fontError) || !appReady) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={s.root} onLayout={onLayout}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <RootContent />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROOT CONTENT — separate so it can consume ThemeContext + AuthContext
───────────────────────────────────────────────────────────────────────────── */
function RootContent() {
  const { colors, darkMode } = useThemeContext();
  const { isLoading } = useAuth();

  // Android nav-bar icon style — setBackgroundColorAsync is unsupported in edge-to-edge mode
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setButtonStyleAsync(darkMode ? "light" : "dark").catch(
        () => {},
      );
    }
  }, [darkMode]);

  if (isLoading) {
    return (
      <View style={[s.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <StatusBar style={darkMode ? "light" : "dark"} />

      {/*
              Root Stack — key fix for back-navigation:
              (tabs) is ONE entry in this stack. Settings screens push ON TOP of
              it, so router.back() from any settings screen returns to whichever
              tab was active — not the dashboard root.
            */}
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth screens */}
        <Stack.Screen name="index" options={{ animation: "fade" }} />
        <Stack.Screen name="LoginScreen" options={{ animation: "fade" }} />
        <Stack.Screen
          name="SignupScreen"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="ForgotPasswordScreen"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen name="reset-password" options={{ animation: "fade" }} />
        <Stack.Screen name="verified-account" options={{ animation: "fade" }} />

        {/* Tab navigator — single stack entry */}
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />

        {/* Settings — pushed on top of (tabs), back() returns to active tab */}
        <Stack.Screen
          name="settings/account"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="settings/robot"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="settings/history"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="settings/notifications"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="settings/support"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="settings/connection"
          options={{ animation: "slide_from_right" }}
        />
      </Stack>

      <ToastNotification />
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1 },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
});
