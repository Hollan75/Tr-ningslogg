import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS, RADIUS } from '../theme';
import { getSessions, cancelSession, getSessionSets } from '../database';
import type { WorkoutSession, SessionSet } from '../types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function msToHuman(start: string, end: string): string {
  const m = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000
  );
  if (m < 1) return '< 1 min';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtVolume(vol: number): string {
  if (vol === 0) return '0 kg';
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)} t`;
  return `${Math.round(vol)} kg`;
}

interface ExerciseGroup {
  exerciseId: string;
  name: string;
  sets: SessionSet[];
  volume: number;
}

function groupSets(sets: SessionSet[]): ExerciseGroup[] {
  const map = new Map<string, ExerciseGroup>();
  for (const set of sets) {
    if (!map.has(set.exercise_id)) {
      map.set(set.exercise_id, {
        exerciseId: set.exercise_id,
        name: set.exercise_name ?? set.exercise_id,
        sets: [],
        volume: 0,
      });
    }
    const g = map.get(set.exercise_id)!;
    g.sets.push(set);
    g.volume += (set.reps ?? 0) * (set.weight_kg ?? 0);
  }
  return [...map.values()];
}

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [detailSets, setDetailSets] = useState<Record<number, SessionSet[]>>({});
  const [loadingDetail, setLoadingDetail] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      getSessions().then(setSessions);
    }, [])
  );

  async function toggleExpand(sessionId: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (expanded.has(sessionId)) {
      setExpanded(prev => { const n = new Set(prev); n.delete(sessionId); return n; });
      return;
    }

    setExpanded(prev => new Set([...prev, sessionId]));

    if (!detailSets[sessionId]) {
      setLoadingDetail(prev => new Set([...prev, sessionId]));
      const sets = await getSessionSets(sessionId);
      setDetailSets(prev => ({ ...prev, [sessionId]: sets }));
      setLoadingDetail(prev => { const n = new Set(prev); n.delete(sessionId); return n; });
    }
  }

  function handleDelete(session: WorkoutSession) {
    Alert.alert('Ta bort pass', `Ta bort passet från ${fmtDate(session.started_at)}?`, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: async () => {
          await cancelSession(session.id);
          setSessions(prev => prev.filter(s => s.id !== session.id));
          setExpanded(prev => { const n = new Set(prev); n.delete(session.id); return n; });
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Historik</Text>
        {sessions.length > 0 && <Text style={s.count}>{sessions.length} pass</Text>}
      </View>

      {sessions.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📅</Text>
          <Text style={s.emptyTitle}>Ingen träningshistorik</Text>
          <Text style={s.emptyHint}>Slutförda pass visas här</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const isOpen = expanded.has(item.id);
            const isLoading = loadingDetail.has(item.id);
            const groups = isOpen && detailSets[item.id]
              ? groupSets(detailSets[item.id])
              : [];
            const vol = item.total_volume ?? 0;

            return (
              <View style={s.card}>
                {/* Summary row */}
                <TouchableOpacity style={s.cardHeader} onPress={() => toggleExpand(item.id)}>
                  <View style={s.cardLeft}>
                    <Text style={s.cardName}>{item.template_name ?? 'Fritt pass'}</Text>
                    <Text style={s.cardDate}>{fmtDate(item.started_at)}</Text>
                    {/* Stats chips */}
                    <View style={s.chips}>
                      <Chip icon="barbell-outline" label={`${item.set_count ?? 0} set`} />
                      <Chip icon="body-outline" label={`${item.exercise_count ?? 0} övn`} />
                      {item.completed_at && (
                        <Chip icon="time-outline" label={msToHuman(item.started_at, item.completed_at)} />
                      )}
                      {vol > 0 && (
                        <Chip icon="trending-up-outline" label={fmtVolume(vol)} highlight />
                      )}
                    </View>
                  </View>
                  <View style={s.cardRight}>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={s.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={COLORS.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {/* Expandable detail */}
                {isOpen && (
                  <View style={s.detail}>
                    {isLoading ? (
                      <View style={s.detailLoading}>
                        <ActivityIndicator size="small" color={COLORS.accent} />
                      </View>
                    ) : groups.length === 0 ? (
                      <Text style={s.detailEmpty}>Inga set loggades</Text>
                    ) : (
                      groups.map(group => (
                        <View key={group.exerciseId} style={s.exGroup}>
                          <View style={s.exGroupHeader}>
                            <Text style={s.exGroupName}>{group.name}</Text>
                            {group.volume > 0 && (
                              <Text style={s.exGroupVol}>{fmtVolume(group.volume)}</Text>
                            )}
                          </View>
                          <View style={s.setsRow}>
                            {group.sets.map(set => (
                              <View key={set.id} style={s.setPill}>
                                <Text style={s.setPillText}>
                                  {set.reps ?? '—'} × {set.weight_kg != null ? `${set.weight_kg} kg` : '—'}
                                </Text>
                                {set.is_warmup ? (
                                  <Text style={s.warmupTag}>wu</Text>
                                ) : null}
                              </View>
                            ))}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </SafeAreaView>
  );
}

function Chip({
  icon,
  label,
  highlight = false,
}: {
  icon: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <View style={[s.chip, highlight && s.chipHL]}>
      <Ionicons name={icon as any} size={11} color={highlight ? COLORS.green : COLORS.textMuted} />
      <Text style={[s.chipText, highlight && s.chipTextHL]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  count: { color: COLORS.textMuted, fontSize: 14 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: COLORS.textMuted, fontSize: 13, marginTop: 6 },

  list: { paddingHorizontal: 12, paddingVertical: 4, paddingBottom: 24 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
  },
  cardLeft: { flex: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 },
  cardName: { color: COLORS.text, fontWeight: '600', fontSize: 15, marginBottom: 2 },
  cardDate: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8 },
  deleteBtn: { padding: 2 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipHL: { backgroundColor: COLORS.greenDim, borderColor: COLORS.green + '44' },
  chipText: { color: COLORS.textMuted, fontSize: 11 },
  chipTextHL: { color: COLORS.green, fontWeight: '600' },

  detail: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 12,
    backgroundColor: COLORS.surface2,
  },
  detailLoading: { alignItems: 'center', paddingVertical: 12 },
  detailEmpty: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 8 },

  exGroup: { marginBottom: 12 },
  exGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  exGroupName: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  exGroupVol: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },

  setsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  setPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
    gap: 4,
  },
  setPillText: { color: COLORS.text, fontSize: 12 },
  warmupTag: {
    color: COLORS.warning,
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: COLORS.warning + '22',
    borderRadius: 3,
    paddingHorizontal: 3,
  },
});
