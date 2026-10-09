import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../theme';
import { getExerciseById, isExerciseInUse, deleteExercise } from '../database';
import ExerciseHistoryList from '../components/ExerciseHistoryList';
import ExerciseFormModal from '../components/ExerciseFormModal';
import { parseMuscles } from '../utils/format';
import type { Exercise } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteP = RouteProp<RootStackParamList, 'ExerciseDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ExerciseDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteP>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

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

  const isCustom = exercise.id.startsWith('custom_');
  const primary = parseMuscles(exercise.primaryMuscles);
  const secondary = parseMuscles(exercise.secondaryMuscles);
  const instructions = exercise.instructions
    ? exercise.instructions.split(';').map(i => i.trim()).filter(Boolean)
    : [];

  async function handleDelete() {
    if (!exercise) return;
    if (await isExerciseInUse(exercise.id)) {
      Alert.alert(
        'Kan inte ta bort',
        'Övningen finns i ett sparat pass eller i din historik. Ta bort den från passen först – historiken behålls alltid.'
      );
      return;
    }
    Alert.alert('Ta bort övning', `Ta bort "${exercise.name}"?`, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: async () => {
          await deleteExercise(exercise.id);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {isCustom && (
          <>
            <TouchableOpacity onPress={() => setEditing(true)} style={s.iconBtn} hitSlop={8}>
              <Ionicons name="create-outline" size={19} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={s.iconBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {exercise.gifUrl ? (
          <Image source={{ uri: exercise.gifUrl }} style={s.gif} resizeMode="contain" />
        ) : null}

        <Text style={s.name}>{exercise.name}</Text>
        <View style={s.tagRow}>
          {isCustom && <Tag label="Egen övning" color={COLORS.green} />}
          {exercise.bodyPart ? <Tag label={exercise.bodyPart} color={COLORS.accent} /> : null}
          {exercise.equipment ? <Tag label={exercise.equipment} /> : null}
          {exercise.difficulty ? <Tag label={exercise.difficulty} /> : null}
        </View>

        <InfoBlock title="Din historik">
          <ExerciseHistoryList exerciseId={exercise.id} />
        </InfoBlock>

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

      <ExerciseFormModal
        visible={editing}
        exercise={exercise}
        onClose={() => setEditing(false)}
        onSaved={ex => {
          setEditing(false);
          setExercise(ex);
        }}
      />
    </SafeAreaView>
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
  safe: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.textMuted },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 16, paddingTop: 4, paddingBottom: 40 },
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
