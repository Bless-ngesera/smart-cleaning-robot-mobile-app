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
        const lower = url.toLowerCase();
        const isReset = lower.includes("reset-password") || lower.includes("type=recovery");

        // Suppress SIGNED_IN redirect BEFORE any async session work so the
        // AuthContext listener never fires a dashboard redirect for this flow.
        if (isReset) setSuppressNextSignedIn(true);

        // ── Path A: implicit grant — tokens arrive in the URL hash fragment.
        //    Produced by supabase.auth.admin.generateLink (used in Edge Function).
        //    Format: smartcleanerpro:///reset-password#access_token=xxx&refresh_token=xxx&type=recovery
        const hashIdx = url.indexOf("#");
        if (hashIdx !== -1) {
          const fragment = url.slice(hashIdx + 1);
          const params = new URLSearchParams(fragment);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const type = params.get("type") ?? "";

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error || !data?.session) return;

            if (type === "recovery" || isReset) {
              setTimeout(() => router.replace("/reset-password"), 150);
            } else {
              setTimeout(() => router.replace("/verified-account"), 150);
            }
            return;
          }
        }

        // ── Path B: PKCE — code arrives as a query parameter.
        //    Produced by Supabase magic-link / email confirmation flows.
        //    Format: smartcleanerpro:///verified-account?code=xxx
        const qIdx = url.indexOf("?");
        const queryStr = qIdx !== -1 ? url.slice(qIdx + 1).split("#")[0] : "";
        const qp = new URLSearchParams(queryStr);

        if (qp.get("code")) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(url);
          if (error || !data?.session) return;

          if (isReset) {
            setTimeout(() => router.replace("/reset-password"), 150);
          } else if (lower.includes("verified-account")) {
            setTimeout(() => router.replace("/verified-account"), 150);
          }
          return;
        }

        // ── Path C: App navigation deep links from email buttons ─────────────
        //    Format: smartcleanerpro://<route>?param=value
        //    These don't carry auth tokens — just navigate to the right screen.
        const pathPart = url.replace(/^[a-z]+:\/\//, "").split("?")[0].replace(/^\/+/, "");

        if (pathPart === "dashboard") {
          setTimeout(() => router.replace("/(tabs)"), 100);
        } else if (pathPart === "accept-invite") {
          const token    = qp.get("token") ?? "";
          const robotId  = qp.get("robot_id") ?? "";
          if (token) setTimeout(() => router.push(`/accept-invite?token=${token}&robot_id=${robotId}`), 100);
        } else if (pathPart === "robot-details") {
          const id = qp.get("id") ?? "";
          if (id) setTimeout(() => router.push(`/settings/robot?id=${id}`), 100);
        } else if (pathPart === "robot-control") {
          const id = qp.get("id") ?? "";
          if (id) setTimeout(() => router.push(`/(tabs)?robotId=${id}`), 100);
        } else if (pathPart === "session-details" || pathPart === "incidents") {
          setTimeout(() => router.push("/settings/history"), 100);
        } else if (pathPart === "schedule") {
          setTimeout(() => router.push("/(tabs)"), 100);
        } else if (pathPart === "robot-members" || pathPart === "robot-settings") {
          const id  = qp.get("id") ?? "";
          const tab = qp.get("tab") ?? "";
          setTimeout(() => router.push(`/settings/robot${id ? `?id=${id}` : ""}${tab ? `&tab=${tab}` : ""}`), 100);
        } else if (pathPart === "maintenance") {
          const robotId = qp.get("robot_id") ?? "";
          setTimeout(() => router.push(`/settings/robot${robotId ? `?id=${robotId}&tab=maintenance` : ""}`), 100);
        }
      } catch {
        // Not a navigable URL — ignore silently
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

  // ── Allow providers to settle before rendering ───────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setAppReady(true), 80);
    return () => clearTimeout(t);
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
        <Stack.Screen
          name="accept-invite"
          options={{ animation: "slide_from_bottom" }}
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
