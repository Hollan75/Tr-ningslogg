import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../theme';
import {
  addSessionSet,
  removeSessionSet,
  completeSession,
  cancelSession,
  getTemplateExercises,
} from '../database';
import ExercisePicker from '../components/ExercisePicker';
import type { WorkoutExercise, WorkoutSet, Exercise } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteP = RouteProp<RootStackParamList, 'ActiveWorkout'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

function useTimer(startedAt: number): string {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(iv);
  }, [startedAt]);
  const s = Math.floor(elapsed / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function ActiveWorkoutScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteP>();
  const { sessionId, sessionName } = params;

  const startTime = useRef(Date.now());
  const timer = useTimer(startTime.current);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  // Input state per exercise (keyed by exerciseId)
  const [inputs, setInputs] = useState<
    Record<string, { reps: string; weight: string; isWarmup: boolean }>
  >({});

  // Load template exercises if applicable
  useEffect(() => {
    async function loadTemplate() {
      const session = await import('../database').then(db =>
        db.getSessionById(sessionId)
      );
      if (session?.template_id) {
        const templateExercises = await getTemplateExercises(session.template_id);
        const exs: WorkoutExercise[] = templateExercises.map(te => ({
          exerciseId: te.exercise_id,
          name: te.exercise_name ?? '',
          bodyPart: te.bodyPart ?? null,
          sets: [],
        }));
        setExercises(exs);
      }
    }
    loadTemplate();
  }, [sessionId]);

  function getInput(exerciseId: string) {
    return inputs[exerciseId] ?? { reps: '', weight: '', isWarmup: false };
  }

  function setInput(exerciseId: string, field: 'reps' | 'weight' | 'isWarmup', value: string | boolean) {
    setInputs(prev => ({
      ...prev,
      [exerciseId]: { ...getInput(exerciseId), [field]: value },
    }));
  }

  async function handleAddSet(exercise: WorkoutExercise) {
    const inp = getInput(exercise.exerciseId);
    const reps = parseInt(inp.reps) || null;
    const weight = parseFloat(inp.weight) || null;
    const setNumber = exercise.sets.length + 1;

    const dbId = await addSessionSet(
      sessionId,
      exercise.exerciseId,
      setNumber,
      reps,
      weight,
      inp.isWarmup
    );

    const newSet: WorkoutSet = {
      dbId,
      setNumber,
      reps: inp.reps,
      weightKg: inp.weight,
      isWarmup: inp.isWarmup,
    };

    setExercises(prev =>
      prev.map(ex =>
        ex.exerciseId === exercise.exerciseId
          ? { ...ex, sets: [...ex.sets, newSet] }
          : ex
      )
    );
    // Clear reps input, keep weight for convenience
    setInputs(prev => ({
      ...prev,
      [exercise.exerciseId]: { ...getInput(exercise.exerciseId), reps: '' },
    }));
  }

  async function handleRemoveSet(exerciseId: string, set: WorkoutSet) {
    await removeSessionSet(set.dbId);
    setExercises(prev =>
      prev.map(ex =>
        ex.exerciseId === exerciseId
          ? { ...ex, sets: ex.sets.filter(s => s.dbId !== set.dbId) }
          : ex
      )
    );
  }

  function handleAddExercise(exercise: Exercise) {
    if (exercises.some(e => e.exerciseId === exercise.id)) {
      setShowPicker(false);
      return;
    }
    setExercises(prev => [
      ...prev,
      { exerciseId: exercise.id, name: exercise.name, bodyPart: exercise.bodyPart, sets: [] },
    ]);
    setShowPicker(false);
  }

  function handleRemoveExercise(exerciseId: string) {
    Alert.alert('Ta bort övning', 'Vill du ta bort övningen och alla loggade set?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: async () => {
          const ex = exercises.find(e => e.exerciseId === exerciseId);
          if (ex) {
            for (const set of ex.sets) {
              await removeSessionSet(set.dbId);
            }
          }
          setExercises(prev => prev.filter(e => e.exerciseId !== exerciseId));
        },
      },
    ]);
  }

  async function handleComplete() {
    const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);
    if (totalSets === 0) {
      Alert.alert('Inga set loggade', 'Logga minst ett set innan du avslutar passet.');
      return;
    }
    await completeSession(sessionId);
    navigation.navigate('SessionDetail', { sessionId });
  }

  async function handleCancel() {
    const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);
    Alert.alert(
      'Avbryt pass',
      totalSets > 0
        ? 'Vill du avbryta passet? Loggade set sparas inte.'
        : 'Vill du avbryta passet?',
      [
        { text: 'Fortsätt träna', style: 'cancel' },
        {
          text: 'Avbryt pass',
          style: 'destructive',
          onPress: async () => {
            await cancelSession(sessionId);
            navigation.goBack();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.sessionName}>{sessionName}</Text>
          <Text style={s.timer}>{timer}</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
            <Text style={s.cancelText}>Avbryt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.doneBtn} onPress={handleComplete}>
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={s.doneText}>Avsluta</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {exercises.length === 0 ? (
            <View style={s.emptyWorkout}>
              <Text style={s.emptyIcon}>💪</Text>
              <Text style={s.emptyTitle}>Inga övningar än</Text>
              <Text style={s.emptyHint}>Lägg till en övning för att börja logga</Text>
            </View>
          ) : (
            exercises.map(exercise => {
              const inp = getInput(exercise.exerciseId);
              return (
                <View key={exercise.exerciseId} style={s.exCard}>
                  {/* Exercise header */}
                  <View style={s.exHeader}>
                    <View style={s.exHeaderInfo}>
                      <Text style={s.exName}>{exercise.name}</Text>
                      {exercise.bodyPart ? (
                        <Text style={s.exMeta}>{exercise.bodyPart}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveExercise(exercise.exerciseId)}
                    >
                      <Ionicons name="close-circle-outline" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>

                  {/* Logged sets */}
                  {exercise.sets.length > 0 && (
                    <View style={s.setsTable}>
                      <View style={s.setsHeader}>
                        <Text style={[s.setsCol, s.setsColNum]}>Set</Text>
                        <Text style={[s.setsCol, s.setsColVal]}>Reps</Text>
                        <Text style={[s.setsCol, s.setsColVal]}>Kg</Text>
                        <Text style={[s.setsCol, s.setsColTag]}>Typ</Text>
                        <View style={{ width: 24 }} />
                      </View>
                      {exercise.sets.map(set => (
                        <View key={set.dbId} style={s.setRow}>
                          <Text style={[s.setsCol, s.setsColNum, s.setVal]}>{set.setNumber}</Text>
                          <Text style={[s.setsCol, s.setsColVal, s.setVal]}>
                            {set.reps || '—'}
                          </Text>
                          <Text style={[s.setsCol, s.setsColVal, s.setVal]}>
                            {set.weightKg || '—'}
                          </Text>
                          <Text style={[s.setsCol, s.setsColTag, s.setVal]}>
                            {set.isWarmup ? '🔥 WU' : '✓'}
                          </Text>
                          <TouchableOpacity onPress={() => handleRemoveSet(exercise.exerciseId, set)}>
                            <Ionicons name="close" size={16} color={COLORS.danger} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Add set row */}
                  <View style={s.addSetRow}>
                    <TextInput
                      style={s.setInput}
                      placeholder="Reps"
                      placeholderTextColor={COLORS.textMuted}
                      value={inp.reps}
                      onChangeText={v => setInput(exercise.exerciseId, 'reps', v)}
                      keyboardType="numeric"
                      returnKeyType="next"
                    />
                    <TextInput
                      style={s.setInput}
                      placeholder="Kg"
                      placeholderTextColor={COLORS.textMuted}
                      value={inp.weight}
                      onChangeText={v => setInput(exercise.exerciseId, 'weight', v)}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={() => handleAddSet(exercise)}
                    />
                    <View style={s.warmupRow}>
                      <Text style={s.warmupLabel}>WU</Text>
                      <Switch
                        value={inp.isWarmup}
                        onValueChange={v => setInput(exercise.exerciseId, 'isWarmup', v)}
                        trackColor={{ false: COLORS.border, true: COLORS.accentBorder }}
                        thumbColor={inp.isWarmup ? COLORS.accent : COLORS.textMuted}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                    </View>
                    <TouchableOpacity
                      style={s.logBtn}
                      onPress={() => handleAddSet(exercise)}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                      <Text style={s.logBtnText}>Set</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {/* Add exercise button */}
          <TouchableOpacity style={s.addExBtn} onPress={() => setShowPicker(true)}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.accent} />
            <Text style={s.addExText}>Lägg till övning</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ExercisePicker
        visible={showPicker}
        onSelect={handleAddExercise}
        onClose={() => setShowPicker(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  sessionName: { color: COLORS.text, fontWeight: '700', fontSize: 17 },
  timer: { color: COLORS.accent, fontSize: 13, marginTop: 2, fontVariant: ['tabular-nums'] },
  headerActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
  doneBtn: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doneText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  content: { padding: 12, paddingBottom: 40 },

  emptyWorkout: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: COLORS.text, fontWeight: '600', fontSize: 17 },
  emptyHint: { color: COLORS.textMuted, fontSize: 13, marginTop: 6 },

  exCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  exHeaderInfo: { flex: 1 },
  exName: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
  exMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  setsTable: { marginBottom: 10 },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 4,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  setsCol: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  setsColNum: { width: 32 },
  setsColVal: { width: 48 },
  setsColTag: { flex: 1 },
  setVal: { color: COLORS.text, fontSize: 13 },

  addSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setInput: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    fontSize: 14,
    padding: 8,
    textAlign: 'center',
    width: 60,
  },
  warmupRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  warmupLabel: { color: COLORS.textMuted, fontSize: 11 },
  logBtn: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    gap: 4,
  },
  logBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    padding: 14,
    marginTop: 4,
  },
  addExText: { color: COLORS.accent, fontWeight: '600', fontSize: 15 },
});
