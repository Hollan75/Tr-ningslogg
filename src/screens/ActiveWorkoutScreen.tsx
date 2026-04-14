import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Vibration,
  Animated,
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
  getSessionById,
  getPreviousPerformance,
} from '../database';
import ExercisePicker from '../components/ExercisePicker';
import type { WorkoutExercise, WorkoutSet, SessionSet, Exercise } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteP = RouteProp<RootStackParamList, 'ActiveWorkout'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Timer hook ──────────────────────────────────────────────────────────────
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

// ─── Rest timer hook ──────────────────────────────────────────────────────────
interface RestState { remaining: number; total: number }

function useRestTimer(onDone: () => void) {
  const [rest, setRest] = useState<RestState | null>(null);
  const iv = useRef<ReturnType<typeof setInterval> | null>(null);

  function start(seconds: number) {
    if (iv.current) clearInterval(iv.current);
    setRest({ remaining: seconds, total: seconds });
    iv.current = setInterval(() => {
      setRest(prev => {
        if (!prev || prev.remaining <= 1) {
          clearInterval(iv.current!);
          onDone();
          return null;
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
  }

  function skip() {
    if (iv.current) clearInterval(iv.current);
    setRest(null);
  }

  useEffect(() => () => { if (iv.current) clearInterval(iv.current); }, []);

  return { rest, start, skip };
}

export default function ActiveWorkoutScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteP>();
  const { sessionId, sessionName } = params;

  const startTime = useRef(Date.now());
  const timer = useTimer(startTime.current);
  const scrollRef = useRef<ScrollView>(null);

  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [prevPerf, setPrevPerf] = useState<Record<string, SessionSet[]>>({});
  const [inputs, setInputs] = useState<Record<string, { reps: string; weight: string }>>({});
  const [done, setDone] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);

  // Rest timer
  const { rest, start: startRest, skip: skipRest } = useRestTimer(() => {
    Vibration.vibrate([0, 300, 100, 300, 100, 300]);
  });

  // Load template exercises on mount; auto-open picker for free workouts
  useEffect(() => {
    async function load() {
      const session = await getSessionById(sessionId);
      if (!session?.template_id) {
        setShowPicker(true); // free workout – let user pick first exercise
        return;
      }
      const tes = await getTemplateExercises(session.template_id);
      const exs: WorkoutExercise[] = tes.map(te => ({
        exerciseId: te.exercise_id,
        name: te.exercise_name ?? '',
        bodyPart: te.bodyPart ?? null,
        restSeconds: te.rest_seconds,
        sets: [],
      }));
      setExercises(exs);
      loadPrevPerf(exs.map(e => e.exerciseId));
    }
    load();
  }, [sessionId]);

  async function loadPrevPerf(exerciseIds: string[]) {
    const entries = await Promise.all(
      exerciseIds.map(async id => {
        const sets = await getPreviousPerformance(id, sessionId);
        return [id, sets] as [string, SessionSet[]];
      })
    );
    setPrevPerf(Object.fromEntries(entries));
  }

  function inp(id: string) {
    return inputs[id] ?? { reps: '', weight: '' };
  }

  function setInp(id: string, field: 'reps' | 'weight', v: string) {
    setInputs(prev => ({ ...prev, [id]: { ...inp(id), [field]: v } }));
  }

  async function handleLogSet(exercise: WorkoutExercise) {
    const i = inp(exercise.exerciseId);
    const reps = parseInt(i.reps) || null;
    const weight = parseFloat(i.weight) || null;
    const setNumber = exercise.sets.length + 1;

    const dbId = await addSessionSet(sessionId, exercise.exerciseId, setNumber, reps, weight, false);

    const newSet: WorkoutSet = {
      dbId,
      setNumber,
      reps: i.reps,
      weightKg: i.weight,
      isWarmup: false,
    };

    setExercises(prev =>
      prev.map(ex =>
        ex.exerciseId === exercise.exerciseId ? { ...ex, sets: [...ex.sets, newSet] } : ex
      )
    );

    // Clear reps only, keep weight
    setInputs(prev => ({ ...prev, [exercise.exerciseId]: { ...inp(exercise.exerciseId), reps: '' } }));

    // Start rest timer
    if (exercise.restSeconds > 0) startRest(exercise.restSeconds);
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

  function handleMarkDone(exerciseId: string) {
    setDone(prev => new Set([...prev, exerciseId]));
    const nextIdx = exercises.findIndex((e, i) => i > currentIdx && !done.has(e.exerciseId));
    if (nextIdx !== -1) {
      setCurrentIdx(nextIdx);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: nextIdx * 280, animated: true });
      }, 100);
    }
  }

  function handleAddExercise(exercise: Exercise) {
    if (exercises.some(e => e.exerciseId === exercise.id)) {
      setShowPicker(false);
      return;
    }
    const newEx: WorkoutExercise = {
      exerciseId: exercise.id,
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      restSeconds: 60,
      sets: [],
    };
    setExercises(prev => [...prev, newEx]);
    loadPrevPerf([exercise.id]);
    setShowPicker(false);
  }

  async function handleRemoveExercise(exerciseId: string) {
    Alert.alert('Ta bort övning', 'Ta bort övningen och alla loggade set?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: async () => {
          const ex = exercises.find(e => e.exerciseId === exerciseId);
          if (ex) for (const set of ex.sets) await removeSessionSet(set.dbId);
          setExercises(prev => prev.filter(e => e.exerciseId !== exerciseId));
          setDone(prev => { const n = new Set(prev); n.delete(exerciseId); return n; });
        },
      },
    ]);
  }

  async function handleComplete() {
    const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0);
    if (totalSets === 0) {
      Alert.alert('Inga set loggade', 'Logga minst ett set innan du avslutar.');
      return;
    }
    await completeSession(sessionId);
    navigation.navigate('SessionDetail', { sessionId });
  }

  async function handleCancel() {
    Alert.alert('Avbryt pass', 'Passet och alla loggade set tas bort.', [
      { text: 'Fortsätt träna', style: 'cancel' },
      {
        text: 'Avbryt pass',
        style: 'destructive',
        onPress: async () => { await cancelSession(sessionId); navigation.goBack(); },
      },
    ]);
  }

  const remaining = exercises.filter(e => !done.has(e.exerciseId));
  const completedCount = done.size;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* ── Session header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.sessionName}>{sessionName}</Text>
          <Text style={s.timer}>{timer}</Text>
        </View>
        <View style={s.progress}>
          <Text style={s.progressText}>{completedCount}/{exercises.length} övn</Text>
        </View>
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
            <Text style={s.cancelText}>Avbryt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.finishBtn} onPress={handleComplete}>
            <Ionicons name="checkmark" size={15} color="#fff" />
            <Text style={s.finishText}>Avsluta</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {exercises.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>💪</Text>
              <Text style={s.emptyTitle}>Inga övningar än</Text>
              <Text style={s.emptyHint}>Lägg till en övning nedan</Text>
            </View>
          ) : (
            exercises.map((exercise, idx) => {
              const isDone = done.has(exercise.exerciseId);
              const isCurrent = idx === currentIdx && !isDone;
              const prev = prevPerf[exercise.exerciseId] ?? [];
              const i = inp(exercise.exerciseId);

              return (
                <View
                  key={exercise.exerciseId}
                  style={[
                    s.exCard,
                    isCurrent && s.exCardActive,
                    isDone && s.exCardDone,
                  ]}
                >
                  {/* Exercise header */}
                  <View style={s.exHeader}>
                    <View style={s.exHeaderLeft}>
                      <Text style={s.exName}>{exercise.name}</Text>
                      {exercise.bodyPart ? (
                        <Text style={s.exMeta}>{exercise.bodyPart}</Text>
                      ) : null}
                    </View>
                    <View style={s.exHeaderRight}>
                      {isDone && (
                        <View style={s.doneBadge}>
                          <Ionicons name="checkmark-circle" size={14} color={COLORS.green} />
                          <Text style={s.doneBadgeText}>Klar</Text>
                        </View>
                      )}
                      <TouchableOpacity onPress={() => handleRemoveExercise(exercise.exerciseId)}>
                        <Ionicons name="close-circle-outline" size={20} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Previous performance */}
                  {prev.length > 0 && (
                    <View style={s.prevWrap}>
                      <Text style={s.prevLabel}>Förra gången:</Text>
                      <Text style={s.prevData}>
                        {prev
                          .map(
                            p =>
                              `Set ${p.set_number}: ${p.reps ?? '—'} reps${
                                p.weight_kg ? ` @ ${p.weight_kg} kg` : ''
                              }`
                          )
                          .join('  ·  ')}
                      </Text>
                    </View>
                  )}

                  {/* Logged sets */}
                  {exercise.sets.length > 0 && (
                    <View style={s.setsTable}>
                      <View style={s.setsHead}>
                        <Text style={[s.col, s.colSet]}>Set</Text>
                        <Text style={[s.col, s.colVal]}>Reps</Text>
                        <Text style={[s.col, s.colVal]}>Kg</Text>
                        <View style={{ width: 24 }} />
                      </View>
                      {exercise.sets.map(set => (
                        <View key={set.dbId} style={s.setRow}>
                          <Text style={[s.col, s.colSet, s.setTxt]}>{set.setNumber}</Text>
                          <Text style={[s.col, s.colVal, s.setTxt]}>{set.reps || '—'}</Text>
                          <Text style={[s.col, s.colVal, s.setTxt]}>{set.weightKg || '—'}</Text>
                          <TouchableOpacity onPress={() => handleRemoveSet(exercise.exerciseId, set)}>
                            <Ionicons name="close" size={15} color={COLORS.danger} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Input row */}
                  {!isDone && (
                    <View style={s.inputRow}>
                      <TextInput
                        style={s.setInput}
                        placeholder={`Set ${exercise.sets.length + 1}`}
                        placeholderTextColor={COLORS.textMuted}
                        value={i.reps}
                        onChangeText={v => setInp(exercise.exerciseId, 'reps', v)}
                        keyboardType="number-pad"
                        returnKeyType="next"
                      />
                      <Text style={s.inputSep}>reps</Text>
                      <TextInput
                        style={s.setInput}
                        placeholder="0"
                        placeholderTextColor={COLORS.textMuted}
                        value={i.weight}
                        onChangeText={v => setInp(exercise.exerciseId, 'weight', v)}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        onSubmitEditing={() => handleLogSet(exercise)}
                      />
                      <Text style={s.inputSep}>kg</Text>
                      <TouchableOpacity
                        style={s.logBtn}
                        onPress={() => handleLogSet(exercise)}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={s.logBtnText}>Avsluta set</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Mark done / next */}
                  {!isDone && exercise.sets.length > 0 && (
                    <TouchableOpacity
                      style={s.markDoneBtn}
                      onPress={() => handleMarkDone(exercise.exerciseId)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.green} />
                      <Text style={s.markDoneText}>
                        Övning klar → nästa övning
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}

          {/* Add exercise */}
          <TouchableOpacity style={s.addExBtn} onPress={() => setShowPicker(true)}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.accent} />
            <Text style={s.addExText}>Lägg till övning</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Rest timer bar ── */}
      {rest && (
        <View style={s.restBar}>
          <View style={s.restInfo}>
            <Ionicons name="timer-outline" size={18} color={COLORS.green} />
            <Text style={s.restLabel}>Vila</Text>
            <Text style={[s.restCountdown, rest.remaining <= 5 && s.restCountdownUrgent]}>
              {rest.remaining}s
            </Text>
          </View>
          {/* Progress */}
          <View style={s.restTrack}>
            <View
              style={[
                s.restFill,
                {
                  width: `${Math.round((rest.remaining / rest.total) * 100)}%` as any,
                  backgroundColor: rest.remaining <= 5 ? COLORS.danger : COLORS.green,
                },
              ]}
            />
          </View>
          <TouchableOpacity style={s.skipBtn} onPress={skipRest}>
            <Text style={s.skipText}>Hoppa över</Text>
          </TouchableOpacity>
        </View>
      )}

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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 10,
  },
  sessionName: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
  timer: { color: COLORS.accent, fontSize: 13, marginTop: 1, fontVariant: ['tabular-nums'] },
  progress: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  headerBtns: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: { color: COLORS.textMuted, fontSize: 13 },
  finishBtn: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  finishText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  content: { padding: 12, paddingBottom: 24 },

  emptyWrap: { alignItems: 'center', paddingVertical: 64 },
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
  exCardActive: { borderColor: COLORS.accent, borderWidth: 1.5 },
  exCardDone: { opacity: 0.55 },

  exHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  exHeaderLeft: { flex: 1 },
  exHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exName: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  exMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  doneBadgeText: { color: COLORS.green, fontSize: 12, fontWeight: '600' },

  prevWrap: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.sm,
    padding: 8,
    marginBottom: 8,
  },
  prevLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  prevData: { color: COLORS.text, fontSize: 12, lineHeight: 18 },

  setsTable: { marginBottom: 8 },
  setsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 2,
  },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  col: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  colSet: { width: 36 },
  colVal: { width: 56 },
  setTxt: { color: COLORS.text, fontSize: 13 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  setInput: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    padding: 8,
    textAlign: 'center',
    width: 58,
  },
  inputSep: { color: COLORS.textMuted, fontSize: 12 },
  logBtn: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  logBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  markDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  markDoneText: { color: COLORS.green, fontSize: 13, fontWeight: '500' },

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

  // Rest timer bar
  restBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.green + '55',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  restLabel: { color: COLORS.textMuted, fontSize: 13 },
  restCountdown: {
    color: COLORS.green,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 36,
  },
  restCountdownUrgent: { color: COLORS.danger },
  restTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  restFill: { height: '100%', borderRadius: 2 },
  skipBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
});
