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
import { getStats, getSessions, getTemplates, getActiveSession } from '../database';
import ResumeBanner from '../components/ResumeBanner';
import { openWorkout, startWorkout } from '../utils/workout';
import { durationMin, fmtRelativeDate } from '../utils/format';
import type { WorkoutSession, WorkoutTemplate } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 10) return 'God morgon';
  if (h < 17) return 'Hej';
  return 'God kväll';
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [stats, setStats] = useState({ totalSessions: 0, totalSets: 0, thisWeekSessions: 0 });
  const [recent, setRecent] = useState<WorkoutSession[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [active, setActive] = useState<WorkoutSession | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [st, sessions, tpls, act] = await Promise.all([
      getStats(),
      getSessions(),
      getTemplates(),
      getActiveSession(),
    ]);
    setStats(st);
    setRecent(sessions.slice(0, 5));
    // Most recently used templates first
    setTemplates(
      [...tpls]
        .sort((a, b) => (b.last_used ?? b.created_at).localeCompare(a.last_used ?? a.created_at))
        .slice(0, 4)
    );
    setActive(act);
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
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.sub}>{greeting()} 👋</Text>
            <Text style={s.title}>Träningslogg</Text>
          </View>
          <TouchableOpacity style={s.gear} onPress={() => navigation.navigate('Settings')} hitSlop={8}>
            <Ionicons name="settings-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {active && (
          <ResumeBanner
            session={active}
            onPress={() =>
              navigation.navigate('ActiveWorkout', {
                sessionId: active.id,
                sessionName: active.template_name ?? 'Fritt pass',
              })
            }
          />
        )}

        <View style={s.statsRow}>
          <StatCard icon="flame" value={stats.thisWeekSessions} label="Pass i veckan" highlight />
          <StatCard icon="trophy-outline" value={stats.totalSessions} label="Pass totalt" />
          <StatCard icon="layers-outline" value={stats.totalSets} label="Set totalt" />
        </View>

        <Text style={s.sectionTitle}>STARTA ETT PASS</Text>
        {templates.map(t => (
          <TouchableOpacity
            key={t.id}
            style={s.tplRow}
            onPress={() => openWorkout(navigation, t.id, t.name)}
            activeOpacity={0.85}
          >
            <View style={s.tplIcon}>
              <Ionicons name="barbell" size={18} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.tplName} numberOfLines={1}>{t.name}</Text>
              <Text style={s.tplMeta} numberOfLines={1}>
                {t.exercise_count ?? 0} övningar
                {t.last_used ? ` · senast ${fmtRelativeDate(t.last_used).toLowerCase()}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => startWorkout(navigation, t.id, t.name)} hitSlop={8}>
              <Ionicons name="play-circle" size={34} color={COLORS.accent} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        <View style={s.quickRow}>
          <TouchableOpacity
            style={[s.quickBtn, s.quickPrimary]}
            onPress={() => openWorkout(navigation, undefined, 'Fritt pass')}
          >
            <Ionicons name="flash" size={18} color="#fff" />
            <Text style={s.quickPrimaryText}>Tomt pass</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickBtn} onPress={() => navigation.navigate('CreateTemplate', {})}>
            <Ionicons name="add" size={18} color={COLORS.accent} />
            <Text style={s.quickText}>Skapa pass</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>SENASTE PASS</Text>
        {recent.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={32} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>Inga pass loggade ännu</Text>
            <Text style={s.emptyHint}>Starta ett pass ovan så dyker det upp här.</Text>
          </View>
        ) : (
          recent.map(session => (
            <TouchableOpacity
              key={session.id}
              style={s.card}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.cardName}>{session.template_name ?? 'Fritt pass'}</Text>
                <Text style={s.cardMeta}>
                  {fmtRelativeDate(session.started_at)}
                  {'  ·  '}{session.exercise_count ?? 0} övn
                  {'  ·  '}{session.set_count ?? 0} set
                  {session.completed_at ? `  ·  ${durationMin(session.started_at, session.completed_at)}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  value,
  label,
  highlight,
}: {
  icon: string;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <View style={[s.statCard, highlight && s.statCardHL]}>
      <Ionicons name={icon as any} size={18} color={highlight ? '#fff' : COLORS.accent} />
      <Text style={[s.statValue, highlight && { color: '#fff' }]}>{value}</Text>
      <Text style={[s.statLabel, highlight && { color: 'rgba(255,255,255,0.8)' }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sub: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '800', color: COLORS.text, letterSpacing: -0.6, marginTop: 2 },
  gear: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
  },
  statCardHL: { backgroundColor: COLORS.accent },
  statValue: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  tplRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 8,
  },
  tplIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tplName: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  tplMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accentDim,
  },
  quickPrimary: { backgroundColor: COLORS.accent },
  quickText: { color: COLORS.accent, fontWeight: '700', fontSize: 15 },
  quickPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  empty: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginTop: 4 },
  emptyHint: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardName: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  cardMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
});
