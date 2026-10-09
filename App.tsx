import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StatusBar } from 'expo-status-bar';

import { getDb, getActiveSession } from './src/database';
import { setupNotifications } from './src/utils/notify';
import { ensureExerciseLibraries } from './src/data/seed';
import AppNavigator from './src/navigation/AppNavigator';
import type { RootStackParamList } from './src/navigation/AppNavigator';
import { COLORS } from './src/theme';

type InitState = 'loading' | 'syncing' | 'ready' | 'error';

const navigationRef = createNavigationContainerRef<RootStackParamList>();

// A tapped training reminder opens its workout (or the unfinished one, if any)
async function openFromReminder(data: Record<string, unknown>) {
  if (!navigationRef.isReady()) return;
  const active = await getActiveSession();
  if (active) {
    navigationRef.navigate('ActiveWorkout', {
      sessionId: active.id,
      sessionName: active.template_name ?? 'Fritt pass',
    });
    return;
  }
  const templateId = typeof data.templateId === 'number' ? data.templateId : undefined;
  navigationRef.navigate('ActiveWorkout', {
    templateId,
    sessionName: typeof data.templateName === 'string' ? data.templateName : 'Fritt pass',
  });
}

export default function App() {
  const [initState, setInitState] = useState<InitState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handledResponse = useRef<string | null>(null);
  const pendingReminder = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    init();
  }, []);

  // Handle taps on training reminders (also when the app was started by the tap)
  useEffect(() => {
    if (initState !== 'ready') return;
    const handle = (r: Notifications.NotificationResponse | null) => {
      if (!r || handledResponse.current === r.notification.request.identifier + r.notification.date) return;
      handledResponse.current = r.notification.request.identifier + r.notification.date;
      const data = (r.notification.request.content.data ?? {}) as Record<string, unknown>;
      if (data.kind !== 'reminder') return;
      if (navigationRef.isReady()) openFromReminder(data);
      else pendingReminder.current = data;
    };
    Notifications.getLastNotificationResponseAsync().then(handle);
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [initState]);

  async function init() {
    try {
      await getDb();
      setInitState('syncing');
      await ensureExerciseLibraries();
      await setupNotifications().catch(() => undefined);
      setInitState('ready');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setInitState('error');
    }
  }

  if (initState === 'loading' || initState === 'syncing') {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <Text style={styles.splashIcon}>🏋️</Text>
        <Text style={styles.splashTitle}>Träningslogg</Text>
        <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 32 }} />
        {initState === 'syncing' && (
          <Text style={styles.splashSub}>Laddar övningar…</Text>
        )}
      </View>
    );
  }

  if (initState === 'error') {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <Text style={styles.splashIcon}>⚠️</Text>
        <Text style={styles.splashTitle}>Startfel</Text>
        <Text style={styles.splashError}>{errorMessage}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setErrorMessage(null);
            setInitState('loading');
            init();
          }}
        >
          <Text style={styles.retryText}>Försök igen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
    <KeyboardProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          if (pendingReminder.current) {
            openFromReminder(pendingReminder.current);
            pendingReminder.current = null;
          }
        }}
        theme={{
          dark: true,
          colors: {
            primary: COLORS.accent,
            background: COLORS.bg,
            card: COLORS.surface,
            text: COLORS.text,
            border: COLORS.border,
            notification: COLORS.accent,
          },
        }}
      >
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </KeyboardProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  splashIcon: { fontSize: 72, marginBottom: 16 },
  splashTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  splashSub: {
    color: COLORS.textMuted,
    marginTop: 16,
    fontSize: 14,
  },
  splashError: {
    color: COLORS.danger,
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 28,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: COLORS.accent ? 10 : 10,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
