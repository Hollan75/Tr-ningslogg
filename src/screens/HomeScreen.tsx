import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../theme';
import { getStats, getSessions } from '../database';
import type { WorkoutSession } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function msToHuman(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [stats, setStats] = useState({ totalSessions: 0, totalSets: 0, thisWeekSessions: 0 });
  const [recent, setRecent] = useState<WorkoutSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [s, sessions] = await Promise.all([getStats(), getSessions()]);
    setStats(s);
    setRecent(sessions.slice(0, 5));
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Träningslogg</Text>
          <Text style={s.sub}>Logga och förbättra din träning</Text>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <StatCard icon="trophy-outline" value={stats.totalSessions} label="Totalt" />
          <StatCard icon="flame-outline" value={stats.thisWeekSessions} label="Denna vecka" />
          <StatCard icon="barbell-outline" value={stats.totalSets} label="Set totalt" />
        </View>

        {/* Quick start */}
        <TouchableOpacity
          style={s.quickStart}
          onPress={() => navigation.navigate('Tabs', undefined as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="flash" size={20} color="#fff" />
          <Text style={s.quickStartText}>Starta nytt pass</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        {/* Recent sessions */}
        <Text style={s.sectionTitle}>SENASTE PASS</Text>

        {recent.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏋️</Text>
            <Text style={s.emptyTitle}>Inga pass loggade ännu</Text>
            <Text style={s.emptyHint}>Gå till "Pass"-fliken för att starta ett pass</Text>
          </View>
        ) : (
          recent.map(session => (
            <TouchableOpacity
              key={session.id}
              style={s.card}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
            >
              <View style={s.cardLeft}>
                <Text style={s.cardName}>{session.template_name ?? 'Fritt pass'}</Text>
                <Text style={s.cardMeta}>
                  {fmtDate(session.started_at)}
                  {'  ·  '}{session.exercise_count ?? 0} övn
                  {'  ·  '}{session.set_count ?? 0} set
                </Text>
              </View>
              <View style={s.cardRight}>
                {session.completed_at ? (
                  <Text style={s.cardDur}>
                    {msToHuman(session.started_at, session.completed_at)}
                  </Text>
                ) : null}
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={s.statCard}>
      <Ionicons name={icon as any} size={20} color={COLORS.accent} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  sub: { color: COLORS.textMuted, fontSize: 14, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 6 },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },

  quickStart: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
    marginBottom: 24,
  },
  quickStartText: { flex: 1, color: '#fff', fontWeight: '600', fontSize: 16 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: COLORS.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center' },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLeft: { flex: 1 },
  cardName: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
  cardMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDur: { color: COLORS.textMuted, fontSize: 12 },
});
