import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADIUS } from '../theme';
import { getExerciseHistory } from '../database';
import type { ExerciseHistoryEntry } from '../database';
import { fmtKg, fmtRelativeDate, fmtSet } from '../utils/format';

interface Props {
  exerciseId: string;
  limit?: number;
}

// Shows personal bests and every completed session where the exercise was done
export default function ExerciseHistoryList({ exerciseId, limit = 20 }: Props) {
  const [history, setHistory] = useState<ExerciseHistoryEntry[] | null>(null);

  useEffect(() => {
    setHistory(null);
    getExerciseHistory(exerciseId, limit).then(setHistory).catch(() => setHistory([]));
  }, [exerciseId, limit]);

  if (!history) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={s.empty}>
        <Ionicons name="time-outline" size={22} color={COLORS.textMuted} />
        <Text style={s.emptyText}>Ingen historik än – logga övningen i ett pass.</Text>
      </View>
    );
  }

  const allSets = history.flatMap(h => h.sets);
  const maxWeight = Math.max(0, ...allSets.map(x => x.weight_kg ?? 0));
  const maxReps = Math.max(0, ...allSets.map(x => x.reps ?? 0));
  // Epley estimate of one-rep max
  const est1rm = Math.max(
    0,
    ...allSets.map(x => (x.weight_kg && x.reps ? x.weight_kg * (1 + x.reps / 30) : 0))
  );

  return (
    <View>
      <View style={s.prRow}>
        {maxWeight > 0 && <Pr label="Tyngsta" value={`${fmtKg(maxWeight)} kg`} />}
        {est1rm > 0 && <Pr label="Uppsk. 1RM" value={`${Math.round(est1rm)} kg`} />}
        {maxWeight === 0 && maxReps > 0 && <Pr label="Flest reps" value={String(maxReps)} />}
        <Pr label="Antal pass" value={String(history.length)} />
      </View>

      {history.map(entry => {
        const top = entry.sets.reduce(
          (best, x) => ((x.weight_kg ?? 0) > (best.weight_kg ?? 0) ? x : best),
          entry.sets[0]
        );
        return (
          <View key={entry.sessionId} style={s.entry}>
            <View style={s.entryHead}>
              <Text style={s.entryDate}>{fmtRelativeDate(entry.startedAt)}</Text>
              <Text style={s.entryName} numberOfLines={1}>
                {entry.sessionName ?? 'Fritt pass'}
              </Text>
            </View>
            <View style={s.sets}>
              {entry.sets.map(set => (
                <View key={set.id} style={[s.setPill, set.id === top.id && top.weight_kg ? s.setPillTop : null]}>
                  <Text style={[s.setText, set.id === top.id && top.weight_kg ? s.setTextTop : null]}>
                    {fmtSet(set)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Pr({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.pr}>
      <Text style={s.prValue}>{value}</Text>
      <Text style={s.prLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { padding: 24, alignItems: 'center' },
  empty: { alignItems: 'center', gap: 8, padding: 20 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  prRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pr: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  prValue: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  prLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  entry: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  entryHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  entryDate: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  entryName: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
  sets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  setPill: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  setPillTop: { backgroundColor: COLORS.accentDim },
  setText: { color: COLORS.text, fontSize: 12, fontWeight: '500' },
  setTextTop: { color: COLORS.accent, fontWeight: '700' },
});
