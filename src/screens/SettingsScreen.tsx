import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { COLORS, RADIUS } from '../theme';
import {
  getExerciseCount,
  getSetting,
  setSetting,
  clearExercises,
  clearAllData,
} from '../database';
import { ensureExerciseLibraries } from '../data/seed';
import ImportTemplatesModal from '../components/ImportTemplatesModal';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [exerciseCount, setExerciseCount] = useState(0);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadInfo();
    }, [])
  );

  async function loadInfo() {
    const [count, synced] = await Promise.all([
      getExerciseCount(),
      getSetting('exercises_synced_at'),
    ]);
    setExerciseCount(count);
    setSyncedAt(synced);
  }

  async function handleSync() {
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      await clearExercises();
      await ensureExerciseLibraries(true);
      await setSetting('exercises_synced_at', new Date().toISOString());
      await loadInfo();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncError(msg);
      setSyncStatus('error');
    }
  }

  function handleClearAll() {
    Alert.alert(
      'Rensa all data',
      'Detta tar bort alla träningspass, sparade pass och egna övningar. Kan inte ångras.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Rensa allt',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            // Restore the built-in exercise library so the app stays usable
            await ensureExerciseLibraries(true);
            await loadInfo();
            Alert.alert('Klart', 'All data har rensats.');
          },
        },
      ]
    );
  }

  function fmtDate(iso: string | null): string {
    if (!iso) return 'Aldrig';
    return new Date(iso).toLocaleString('sv-SE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.topRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.title}>Inställningar</Text>
        </View>

        {/* Exercise sync section */}
        <Text style={s.sectionLabel}>ÖVNINGAR</Text>
        <View style={s.card}>
          <View style={s.infoRow}>
            <Ionicons name="barbell-outline" size={20} color={COLORS.accent} />
            <View style={s.infoText}>
              <Text style={s.infoTitle}>Övningar i databasen</Text>
              <Text style={s.infoSub}>{exerciseCount} övningar laddade</Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <Ionicons name="time-outline" size={20} color={COLORS.textMuted} />
            <View style={s.infoText}>
              <Text style={s.infoTitle}>Senaste synkronisering</Text>
              <Text style={s.infoSub}>{fmtDate(syncedAt)}</Text>
            </View>
          </View>
          <View style={s.divider} />

          {syncStatus === 'syncing' && (
            <View style={s.syncRow}>
              <ActivityIndicator color={COLORS.accent} size="small" />
              <Text style={s.syncText}>Laddar övningar…</Text>
            </View>
          )}
          {syncStatus === 'success' && (
            <View style={s.syncRow}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.green} />
              <Text style={[s.syncText, { color: COLORS.green }]}>
                Synkronisering klar! {exerciseCount} övningar.
              </Text>
            </View>
          )}
          {syncStatus === 'error' && (
            <View style={s.syncRow}>
              <Ionicons name="warning" size={18} color={COLORS.danger} />
              <Text style={[s.syncText, { color: COLORS.danger, flex: 1 }]}>{syncError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.syncBtn, syncStatus === 'syncing' && s.syncBtnDisabled]}
            onPress={handleSync}
            disabled={syncStatus === 'syncing'}
          >
            {syncStatus === 'syncing' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="refresh-outline" size={18} color="#fff" />
            )}
            <Text style={s.syncBtnText}>
              {exerciseCount === 0 ? 'Ladda övningar' : 'Ladda om övningar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={s.sectionLabel}>PÅMINNELSER</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.infoRow} onPress={() => navigation.navigate('Schedule' as never)}>
            <Ionicons name="alarm-outline" size={20} color={COLORS.accent} />
            <View style={s.infoText}>
              <Text style={s.infoTitle}>Träningsschema</Text>
              <Text style={s.infoSub}>Dagar, tider och pass med notiser</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={s.sectionLabel}>PASS FRÅN DATORN</Text>
        <View style={s.card}>
          <View style={s.infoRow}>
            <Ionicons name="cloud-download-outline" size={20} color={COLORS.accent} />
            <View style={s.infoText}>
              <Text style={s.infoTitle}>Importera pass</Text>
              <Text style={s.infoSub}>Klistra in pass skrivna på datorn (JSON-format)</Text>
            </View>
          </View>
          <TouchableOpacity style={s.syncBtn} onPress={() => setShowImport(true)}>
            <Ionicons name="clipboard-outline" size={18} color="#fff" />
            <Text style={s.syncBtnText}>Klistra in & importera</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionLabel}>OM APPEN</Text>
        <View style={s.card}>
          <View style={s.infoRow}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.textMuted} />
            <View style={s.infoText}>
              <Text style={s.infoTitle}>Träningslogg</Text>
              <Text style={s.infoSub}>Version 1.0.0 · Lokalt lagrad data</Text>
            </View>
          </View>
        </View>

        {/* Danger zone */}
        <Text style={s.sectionLabel}>FARLIG ZON</Text>
        <View style={[s.card, s.dangerCard]}>
          <TouchableOpacity style={s.dangerBtn} onPress={handleClearAll}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            <Text style={s.dangerText}>Rensa all data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ImportTemplatesModal visible={showImport} onClose={() => setShowImport(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 48 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  dangerCard: { borderColor: COLORS.dangerDim },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  infoText: { flex: 1 },
  infoTitle: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  infoSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border },

  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.surface2,
  },
  syncText: { color: COLORS.textMuted, fontSize: 13 },

  syncBtn: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
  },
  syncBtnDisabled: { opacity: 0.6 },
  syncBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  dangerText: { color: COLORS.danger, fontSize: 15, fontWeight: '500' },
});
