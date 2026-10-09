import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

import { COLORS, RADIUS } from '../theme';
import ExerciseHistoryList from './ExerciseHistoryList';
import { parseMuscles } from '../utils/format';
import type { Exercise } from '../types';

// Name, tags, instructions, muscles and the user's history for one exercise
export default function ExerciseInfo({ exercise }: { exercise: Exercise }) {
  const isCustom = exercise.id.startsWith('custom_');
  const isSwedish = exercise.id.startsWith('se_');
  const primary = parseMuscles(exercise.primaryMuscles);
  const secondary = parseMuscles(exercise.secondaryMuscles);
  const instructions = exercise.instructions
    ? exercise.instructions.split(';').map(i => i.trim()).filter(Boolean)
    : [];

  return (
    <View>
      {exercise.gifUrl ? (
        <Image source={{ uri: exercise.gifUrl }} style={s.gif} resizeMode="contain" />
      ) : null}

      <Text style={s.name}>{exercise.name}</Text>
      <View style={s.tagRow}>
        {isCustom && <Tag label="Egen övning" color={COLORS.green} />}
        {exercise.bodyPart ? <Tag label={exercise.bodyPart} color={COLORS.accent} /> : null}
        {exercise.equipment ? <Tag label={exercise.equipment} /> : null}
        {isSwedish && exercise.category ? <Tag label={exercise.category} /> : null}
        {exercise.difficulty ? <Tag label={exercise.difficulty} /> : null}
      </View>

      {instructions.length > 0 && (
        <InfoBlock title="Så gör du">
          {instructions.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepNum}>
                <Text style={s.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </InfoBlock>
      )}

      {(primary.length > 0 || secondary.length > 0) && (
        <InfoBlock title="Muskler">
          {primary.length > 0 && (
            <Text style={s.muscleText}>
              <Text style={s.muscleLabel}>Primära: </Text>
              {primary.join(', ')}
            </Text>
          )}
          {secondary.length > 0 && (
            <Text style={[s.muscleText, { marginTop: 4 }]}>
              <Text style={s.muscleLabel}>Sekundära: </Text>
              {secondary.join(', ')}
            </Text>
          )}
        </InfoBlock>
      )}

      <InfoBlock title="Din historik">
        <ExerciseHistoryList exerciseId={exercise.id} />
      </InfoBlock>
    </View>
  );
}

function Tag({ label, color }: { label: string; color?: string }) {
  return (
    <View style={[s.tag, color ? { backgroundColor: color + '22' } : {}]}>
      <Text style={[s.tagText, color ? { color } : {}]}>{label}</Text>
    </View>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.block}>
      <Text style={s.blockTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  gif: {
    width: '100%',
    height: 240,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface2,
    marginBottom: 16,
  },
  name: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.4, marginBottom: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 },
  tag: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  block: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
  },
  blockTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  muscleLabel: { color: COLORS.textMuted },
  muscleText: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumText: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  stepText: { flex: 1, color: COLORS.text, fontSize: 14, lineHeight: 20 },
});
