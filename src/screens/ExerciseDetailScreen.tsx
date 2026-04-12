import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../theme';
import { getExerciseById } from '../database';
import type { Exercise } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteP = RouteProp<RootStackParamList, 'ExerciseDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

function parseMuscles(json: string | null): string[] {
  try {
    const arr = JSON.parse(json ?? '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function ExerciseDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteP>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExerciseById(params.exerciseId)
      .then(setExercise)
      .finally(() => setLoading(false));
  }, [params.exerciseId]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Övning hittades inte</Text>
      </View>
    );
  }

  const primary = parseMuscles(exercise.primaryMuscles);
  const secondary = parseMuscles(exercise.secondaryMuscles);
  const instructions = exercise.instructions
    ? exercise.instructions.split(';').map(i => i.trim()).filter(Boolean)
    : [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Nav bar */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          <Text style={s.backText}>Tillbaka</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* GIF */}
        {exercise.gifUrl ? (
          <Image
            source={{ uri: exercise.gifUrl }}
            style={s.gif}
            resizeMode="contain"
          />
        ) : (
          <View style={s.gifPlaceholder}>
            <Ionicons name="barbell-outline" size={48} color={COLORS.textMuted} />
          </View>
        )}

        {/* Title block */}
        <Text style={s.name}>{exercise.name}</Text>
        <View style={s.tagRow}>
          {exercise.bodyPart ? <Tag label={exercise.bodyPart} color={COLORS.accent} /> : null}
          {exercise.equipment ? <Tag label={exercise.equipment} /> : null}
          {exercise.category ? <Tag label={exercise.category} /> : null}
        </View>

        {/* Muscles */}
        {primary.length > 0 && (
          <InfoBlock title="Primära muskler">
            <Text style={s.muscleText}>{primary.join(', ')}</Text>
          </InfoBlock>
        )}
        {secondary.length > 0 && (
          <InfoBlock title="Sekundära muskler">
            <Text style={s.muscleText}>{secondary.join(', ')}</Text>
          </InfoBlock>
        )}

        {/* Instructions */}
        {instructions.length > 0 && (
          <InfoBlock title="Instruktioner">
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
      </ScrollView>
    </SafeAreaView>
  );
}

function Tag({ label, color }: { label: string; color?: string }) {
  return (
    <View style={[s.tag, color ? { borderColor: color + '44', backgroundColor: color + '22' } : {}]}>
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
  gif: {
    width: '100%',
    height: 240,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2,
    marginBottom: 16,
  },
  gifPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tag: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: { color: COLORS.textMuted, fontSize: 12 },
  block: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },
  blockTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
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
