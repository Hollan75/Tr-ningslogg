import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { getDb, getSetting, setSetting, insertExercisesBatch } from './src/database';
import { fetchAllExercises } from './src/api/workoutx';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/theme';

type InitState = 'loading' | 'syncing' | 'ready' | 'error';

export default function App() {
  const [initState, setInitState] = useState<InitState>('loading');
  const [syncProgress, setSyncProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      await getDb();
      const synced = await getSetting('exercises_synced');
      if (synced === 'true') {
        setInitState('ready');
        return;
      }

      setInitState('syncing');
      setSyncProgress(0);

      try {
        const exercises = await fetchAllExercises((count) => setSyncProgress(count));
        if (exercises.length > 0) {
          await insertExercisesBatch(exercises);
          await setSetting('exercises_synced', 'true');
        } else {
          // No exercises returned – mark sync as attempted so we don't retry on every launch
          await setSetting('exercises_synced', 'empty');
        }
      } catch (syncErr) {
        // Sync failed; app still works, user can retry in Settings
        console.warn('Exercise sync failed:', syncErr);
      }

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
          <Text style={styles.splashSub}>
            Hämtar övningar{syncProgress > 0 ? ` (${syncProgress})` : '…'}
          </Text>
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
      <NavigationContainer
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
