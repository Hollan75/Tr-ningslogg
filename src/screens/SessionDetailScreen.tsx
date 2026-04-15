import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../theme';
import { getSessionById, getSessionSets } from '../database';
import type { WorkoutSession, SessionSet } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteP = RouteProp<RootStackParamList, 'SessionDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

interface ExerciseGroup {
  exerciseId: string;
  name: string;
  sets: SessionSet[];
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function msToHuman(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function groupSets(sets: SessionSet[]): ExerciseGroup[] {
  const map = new Map<string, ExerciseGroup>();
  for (const set of sets) {
    if (!map.has(set.exercise_id)) {
      map.set(set.exercise_id, {
        exerciseId: set.exercise_id,
        name: set.exercise_name ?? set.exercise_id,
        sets: [],
      });
    }
    map.get(set.exercise_id)!.sets.push(set);
  }
  return [...map.values()];
}

export default function SessionDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteP>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, sets] = await Promise.all([
        getSessionById(params.sessionId),
        getSessionSets(params.sessionId),
      ]);
      setSession(s);
      setGroups(groupSets(sets));
      setLoading(false);
    }
    load();
  }, [params.sessionId]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Pass hittades inte</Text>
      </View>
    );
  }

  const totalSets = groups.reduce((acc, g) => acc + g.sets.length, 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Navbar */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          <Text style={s.backText}>Tillbaka</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Session header */}
        <Text style={s.title}>{session.template_name ?? 'Fritt pass'}</Text>
        <Text style={s.date}>{fmtDateTime(session.started_at)}</Text>

        {/* Stats bar */}
        <View style={s.statsRow}>
          <StatBadge icon="body-outline" value={String(groups.length)} label="Övningar" />
          <StatBadge icon="barbell-outline" value={String(totalSets)} label="Set" />
          {session.completed_at && (
            <StatBadge
              icon="time-outline"
              value={msToHuman(session.started_at, session.completed_at)}
              label="Tid"
            />
          )}
        </View>

        {/* Notes */}
        {session.notes ? (
          <View style={s.notesBlock}>
            <Text style={s.notesLabel}>Anteckningar</Text>
            <Text style={s.notesText}>{session.notes}</Text>
          </View>
        ) : null}

        {/* Exercise groups */}
        {groups.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Inga set loggades under detta pass</Text>
          </View>
        ) : (
          groups.map(group => (
            <View key={group.exerciseId} style={s.exBlock}>
              <Text style={s.exName}>{group.name}</Text>
              <View style={s.setsHeader}>
                <Text style={[s.col, s.colNum]}>Set</Text>
                <Text style={[s.col, s.colVal]}>Reps</Text>
                <Text style={[s.col, s.colVal]}>Vikt</Text>
                <Text style={[s.col, s.colTag]}>Typ</Text>
              </View>
              {group.sets.map(set => (
                <View key={set.id} style={s.setRow}>
                  <Text style={[s.col, s.colNum, s.rowText]}>{set.set_number}</Text>
                  <Text style={[s.col, s.colVal, s.rowText]}>
                    {set.reps != null ? `${set.reps}` : '—'}
                  </Text>
                  <Text style={[s.col, s.colVal, s.rowText]}>
                    {set.weight_kg != null ? `${set.weight_kg} kg` : '—'}
                  </Text>
                  <View style={s.colTag}>
                    {set.is_warmup ? (
                      <View style={s.wuBadge}>
                        <Text style={s.wuText}>Uppv.</Text>
                      </View>
                    ) : (
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.green} />
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBadge({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={s.statBadge}>
      <Ionicons name={icon as any} size={18} color={COLORS.accent} />
      <Text style={s.statBadgeVal}>{value}</Text>
      <Text style={s.statBadgeLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.textMuted },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: COLORS.text, fontSize: 16 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  date: { color: COLORS.textMuted, fontSize: 13, marginBottom: 16, textTransform: 'capitalize' },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBadge: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  statBadgeVal: { color: COLORS.text, fontWeight: '700', fontSize: 18 },
  statBadgeLabel: { color: COLORS.textMuted, fontSize: 10 },

  notesBlock: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 16,
  },
  notesLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  notesText: { color: COLORS.text, fontSize: 14, lineHeight: 20 },

  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },

  exBlock: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
  },
  exName: { color: COLORS.text, fontWeight: '700', fontSize: 15, marginBottom: 10 },
  setsHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 4,
  },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  col: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  colNum: { width: 36 },
  colVal: { width: 64 },
  colTag: { flex: 1 },
  rowText: { color: COLORS.text, fontSize: 13 },
  wuBadge: {
    backgroundColor: COLORS.warning + '33',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  wuText: { color: COLORS.warning, fontSize: 10, fontWeight: '600' },
});
