import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Vibration,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../theme';
import {
  addSessionSet,
  updateSessionSet,
  removeSessionSet,
  completeSession,
  cancelSession,
  getTemplateExercises,
  getSessionById,
  getSessionSets,
  getPreviousPerformance,
  getActiveSession,
  startSession,
} from '../database';
import ExercisePicker from '../components/ExercisePicker';
import ExerciseHistoryList from '../components/ExerciseHistoryList';
import { fmtKg, fmtSet, parseNum } from '../utils/format';
import type { SessionSet, Exercise } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteP = RouteProp<RootStackParamList, 'ActiveWorkout'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const DEFAULT_REST = 90;

interface Row {
  key: string;
  reps: string;
  weight: string;
  dbId: number | null; // non-null = logged (saved) set
}

interface ExState {
  key: string;
  exerciseId: string;
  name: string;
  bodyPart: string | null;
  restSeconds: number;
  targetSets: number | null;
  targetReps: number | null;
  targetWeight: number | null;
  prev: SessionSet[];
  rows: Row[];
}

let rowCounter = 0;
function newRow(partial: Partial<Row> = {}): Row {
  rowCounter += 1;
  return { key: `r${rowCounter}`, reps: '', weight: '', dbId: null, ...partial };
}

// ─── Timers ─────────────────────────────────────────────────────────────────
function useElapsed(startedAt: number | null): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  if (!startedAt) return '00:00';
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

// Rest timer based on an end timestamp so it stays correct if the app is backgrounded
function useRestTimer() {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!endAt) return;
    const iv = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt) {
        Vibration.vibrate([0, 300, 100, 300, 100, 300]);
        setEndAt(null);
      }
    }, 250);
    return () => clearInterval(iv);
  }, [endAt]);

  return {
    remaining: endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : 0,
    total,
    active: endAt != null,
    start(seconds: number) {
      setTotal(seconds);
      setNow(Date.now());
      setEndAt(Date.now() + seconds * 1000);
    },
    adjust(delta: number) {
      setEndAt(prev => (prev ? Math.max(Date.now() + 1000, prev + delta * 1000) : prev));
      setTotal(t => Math.max(1, t + delta));
    },
    skip() {
      setEndAt(null);
    },
  };
}

// ─── Screen ─────────────────────────────────────────────────────────────────
export default function ActiveWorkoutScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteP>();
  const { sessionName, templateId } = params;

  // null until the workout is started (opened via "open" instead of "start")
  const [sessionId, setSessionId] = useState<number | null>(params.sessionId ?? null);
  const sessionIdRef = useRef<number | null>(params.sessionId ?? null);
  const startingRef = useRef<Promise<number | null> | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const elapsed = useElapsed(startedAt);
  const rest = useRestTimer();

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<ExState[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [historyFor, setHistoryFor] = useState<ExState | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [includePending, setIncludePending] = useState(true);
  const busy = useRef<Set<string>>(new Set());
  const exercisesRef = useRef<ExState[]>([]);
  exercisesRef.current = exercises;

  // Load template + any sets already logged (resuming an unfinished session)
  useEffect(() => {
    async function load() {
      let tplId = templateId ?? null;
      let logged: SessionSet[] = [];
      if (params.sessionId) {
        const session = await getSessionById(params.sessionId);
        if (!session) {
          Alert.alert('Passet finns inte längre');
          navigation.goBack();
          return;
        }
        setStartedAt(new Date(session.started_at).getTime());
        tplId = session.template_id;
        logged = await getSessionSets(params.sessionId);
      }
      const tes = tplId ? await getTemplateExercises(tplId) : [];

      const list: ExState[] = tes.map((te, i) => ({
        key: `t${i}-${te.exercise_id}`,
        exerciseId: te.exercise_id,
        name: te.exercise_name ?? '',
        bodyPart: te.bodyPart ?? null,
        restSeconds: te.rest_seconds > 0 ? te.rest_seconds : DEFAULT_REST,
        targetSets: te.sets,
        targetReps: te.reps_min,
        targetWeight: te.weight_kg ?? null,
        prev: [],
        rows: [],
      }));

      // Attach logged sets; exercises not in the template are appended in logged order
      for (const set of logged) {
        let ex = list.find(e => e.exerciseId === set.exercise_id);
        if (!ex) {
          ex = {
            key: `l-${set.exercise_id}`,
            exerciseId: set.exercise_id,
            name: set.exercise_name ?? set.exercise_id,
            bodyPart: null,
            restSeconds: DEFAULT_REST,
            targetSets: null,
            targetReps: null,
            targetWeight: null,
            prev: [],
            rows: [],
          };
          list.push(ex);
        }
        ex.rows.push(
          newRow({
            dbId: set.id,
            reps: set.reps != null ? String(set.reps) : '',
            weight: set.weight_kg != null ? String(set.weight_kg) : '',
          })
        );
      }

      // Fill up to the planned number of sets
      for (const ex of list) {
        const planned = Math.max(ex.targetSets ?? 1, 1);
        while (ex.rows.length < planned) ex.rows.push(newRow());
      }

      // Previous performance for each exercise
      await Promise.all(
        list.map(async ex => {
          ex.prev = await getPreviousPerformance(ex.exerciseId, params.sessionId ?? -1);
          // Free exercises: plan as many sets as last time
          if (ex.targetSets == null && ex.prev.length > ex.rows.length) {
            while (ex.rows.length < ex.prev.length) ex.rows.push(newRow());
          }
        })
      );

      setExercises(list);
      setLoading(false);
      if (list.length === 0) setShowPicker(true);
    }
    load().catch(err => {
      setLoading(false);
      Alert.alert('Kunde inte ladda passet', err instanceof Error ? err.message : String(err));
    });
  }, []);

  // Creates the session the first time it is needed (Starta-button or first checked set)
  function ensureStarted(): Promise<number | null> {
    if (sessionIdRef.current) return Promise.resolve(sessionIdRef.current);
    if (!startingRef.current) {
      startingRef.current = (async () => {
        const active = await getActiveSession();
        if (active) {
          const discard = await new Promise<boolean>(resolve =>
            Alert.alert(
              'Pågående pass',
              `Du har redan ett oavslutat pass (${active.template_name ?? 'Fritt pass'}). Kasta det och starta det här?`,
              [
                { text: 'Avbryt', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Kasta & starta', style: 'destructive', onPress: () => resolve(true) },
              ],
              { cancelable: true, onDismiss: () => resolve(false) }
            )
          );
          if (!discard) return null;
          await cancelSession(active.id);
        }
        const id = await startSession(templateId);
        sessionIdRef.current = id;
        setSessionId(id);
        setStartedAt(Date.now());
        return id;
      })().finally(() => {
        startingRef.current = null;
      });
    }
    return startingRef.current;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  // Suggested values for a row: last time's matching set → template target → previous row
  function suggestion(ex: ExState, idx: number): { reps: string; weight: string } {
    const p = ex.prev[idx] ?? ex.prev[ex.prev.length - 1];
    if (p) {
      return {
        reps: p.reps != null ? String(p.reps) : '',
        weight: p.weight_kg != null ? String(p.weight_kg) : '',
      };
    }
    if (ex.targetReps != null || ex.targetWeight) {
      return {
        reps: ex.targetReps != null ? String(ex.targetReps) : '',
        weight: ex.targetWeight ? String(ex.targetWeight) : '',
      };
    }
    const before = ex.rows[idx - 1];
    return before ? { reps: before.reps, weight: before.weight } : { reps: '', weight: '' };
  }

  function updateEx(key: string, fn: (ex: ExState) => ExState) {
    setExercises(prev => prev.map(e => (e.key === key ? fn(e) : e)));
  }

  function setRowField(exKey: string, rowKey: string, field: 'reps' | 'weight', value: string) {
    updateEx(exKey, ex => ({
      ...ex,
      rows: ex.rows.map(r => (r.key === rowKey ? { ...r, [field]: value } : r)),
    }));
  }

  // Persist edits made to an already logged set
  async function persistRow(exKey: string, rowKey: string) {
    // Read the latest state – the render closure may be one keystroke behind
    const ex = exercisesRef.current.find(e => e.key === exKey);
    const row = ex?.rows.find(r => r.key === rowKey);
    if (!ex || !row?.dbId) return;
    const idx = ex.rows.findIndex(r => r.key === row.key);
    const sug = suggestion(ex, idx);
    const reps = parseNum(row.reps || sug.reps);
    const weight = parseNum(row.weight || sug.weight);
    await updateSessionSet(row.dbId, idx + 1, reps != null ? Math.round(reps) : null, weight);
  }

  async function toggleRow(ex: ExState, row: Row) {
    if (busy.current.has(row.key)) return;
    busy.current.add(row.key);
    try {
      const idx = ex.rows.findIndex(r => r.key === row.key);
      if (row.dbId) {
        await removeSessionSet(row.dbId);
        updateEx(ex.key, e => ({
          ...e,
          rows: e.rows.map(r => (r.key === row.key ? { ...r, dbId: null } : r)),
        }));
        return;
      }
      const sug = suggestion(ex, idx);
      const repsStr = row.reps || sug.reps;
      const weightStr = row.weight || sug.weight;
      const reps = parseNum(repsStr);
      const weight = parseNum(weightStr);
      if (reps == null) {
        Alert.alert('Ange reps', 'Fyll i antal repetitioner för setet.');
        return;
      }
      const sid = await ensureStarted();
      if (!sid) return;
      const dbId = await addSessionSet(
        sid,
        ex.exerciseId,
        idx + 1,
        Math.round(reps),
        weight,
        false
      );
      updateEx(ex.key, e => ({
        ...e,
        rows: e.rows.map(r =>
          r.key === row.key ? { ...r, dbId, reps: repsStr, weight: weightStr } : r
        ),
      }));
      rest.start(ex.restSeconds);
    } catch (err) {
      Alert.alert('Kunde inte spara setet', err instanceof Error ? err.message : String(err));
    } finally {
      busy.current.delete(row.key);
    }
  }

  function addRow(ex: ExState) {
    updateEx(ex.key, e => ({ ...e, rows: [...e.rows, newRow()] }));
  }

  async function removeRow(ex: ExState, row: Row) {
    if (row.dbId) await removeSessionSet(row.dbId);
    updateEx(ex.key, e => ({ ...e, rows: e.rows.filter(r => r.key !== row.key) }));
  }

  async function handleAddExercise(exercise: Exercise) {
    setShowPicker(false);
    const prev = await getPreviousPerformance(exercise.id, sessionIdRef.current ?? -1);
    const rowCount = Math.max(prev.length, 3);
    const ex: ExState = {
      key: `a${Date.now()}-${exercise.id}`,
      exerciseId: exercise.id,
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      restSeconds: DEFAULT_REST,
      targetSets: null,
      targetReps: null,
      targetWeight: null,
      prev,
      rows: Array.from({ length: rowCount }, () => newRow()),
    };
    setExercises(list => [...list, ex]);
  }

  function handleRemoveExercise(ex: ExState) {
    const logged = ex.rows.filter(r => r.dbId).length;
    Alert.alert(
      'Ta bort övning',
      logged > 0 ? `${ex.name} och ${logged} loggade set tas bort.` : `Ta bort ${ex.name} från passet?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            for (const r of ex.rows) if (r.dbId) await removeSessionSet(r.dbId);
            setExercises(list => list.filter(e => e.key !== ex.key));
          },
        },
      ]
    );
  }

  // ─── Finish / cancel ──────────────────────────────────────────────────────
  const loggedCount = exercises.reduce((a, e) => a + e.rows.filter(r => r.dbId).length, 0);
  const plannedCount = exercises.reduce((a, e) => a + e.rows.length, 0);
  const pendingFilled = exercises.reduce(
    (a, e) => a + e.rows.filter(r => !r.dbId && r.reps.trim() !== '').length,
    0
  );

  async function finish(logPending: boolean) {
    const sid = sessionIdRef.current;
    if (!sid) return;
    setFinishing(true);
    try {
      for (const ex of exercises) {
        let n = 0;
        for (let i = 0; i < ex.rows.length; i++) {
          const row = ex.rows[i];
          const sug = suggestion(ex, i);
          const reps = parseNum(row.reps || sug.reps);
          const weight = parseNum(row.weight || sug.weight);
          if (row.dbId) {
            n += 1;
            await updateSessionSet(row.dbId, n, reps != null ? Math.round(reps) : null, weight);
          } else if (logPending && row.reps.trim() !== '' && reps != null) {
            n += 1;
            await addSessionSet(sid, ex.exerciseId, n, Math.round(reps), weight, false);
          }
        }
      }
      await completeSession(sid);
      setShowFinish(false);
      navigation.replace('SessionDetail', { sessionId: sid });
    } catch (err) {
      setFinishing(false);
      Alert.alert('Kunde inte spara passet', err instanceof Error ? err.message : String(err));
    }
  }

  function handleDiscard() {
    Alert.alert('Avfärda passet', 'Passet och alla loggade set tas bort. Det går inte att ångra.', [
      { text: 'Tillbaka', style: 'cancel' },
      {
        text: 'Avfärda',
        style: 'destructive',
        onPress: async () => {
          if (sessionIdRef.current) await cancelSession(sessionIdRef.current);
          setShowFinish(false);
          navigation.goBack();
        },
      },
    ]);
  }

  const started = sessionId != null;
  const toSave = loggedCount + (includePending ? pendingFilled : 0);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-down" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.sessionName} numberOfLines={1}>{sessionName}</Text>
          <Text style={s.timer}>
            {started
              ? `${elapsed}  ·  ${loggedCount}/${plannedCount} set`
              : `Inte startat  ·  ${exercises.length} övningar`}
          </Text>
        </View>
        {started ? (
          <TouchableOpacity style={s.finishBtn} onPress={() => setShowFinish(true)}>
            <Text style={s.finishText}>Avsluta</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.startBtn} onPress={ensureStarted}>
            <Ionicons name="play" size={14} color="#fff" />
            <Text style={s.startText}>Starta</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={s.progressTrack}>
        <View
          style={[
            s.progressFill,
            { width: `${plannedCount ? Math.round((loggedCount / plannedCount) * 100) : 0}%` },
          ]}
        />
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={COLORS.accent} />
          </View>
        ) : (
          <KeyboardAwareScrollView
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
            bottomOffset={24}
          >
            {exercises.length === 0 && (
              <View style={s.emptyWrap}>
                <Ionicons name="barbell-outline" size={44} color={COLORS.textMuted} />
                <Text style={s.emptyTitle}>Inga övningar än</Text>
                <Text style={s.emptyHint}>Lägg till din första övning nedan</Text>
              </View>
            )}

            {exercises.map(ex => {
              const allDone = ex.rows.length > 0 && ex.rows.every(r => r.dbId);
              const targetText =
                ex.targetSets != null
                  ? `Mål ${ex.targetSets}×${ex.targetReps ?? '–'}${
                      ex.targetWeight ? ` · ${fmtKg(ex.targetWeight)} kg` : ''
                    }`
                  : null;
              return (
                <View key={ex.key} style={[s.exCard, allDone && s.exCardDone]}>
                  <View style={s.exHeader}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setHistoryFor(ex)}>
                      <Text style={s.exName}>{ex.name}</Text>
                      <Text style={s.exMeta}>
                        {[targetText, ex.prev.length ? `Förra: ${fmtSet(ex.prev[0])}` : 'Första gången']
                          .filter(Boolean)
                          .join('  ·  ')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.smallIcon} onPress={() => setHistoryFor(ex)} hitSlop={6}>
                      <Ionicons name="stats-chart" size={16} color={COLORS.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.smallIcon} onPress={() => handleRemoveExercise(ex)} hitSlop={6}>
                      <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <View style={s.tableHead}>
                    <Text style={[s.th, s.cSet]}>SET</Text>
                    <Text style={[s.th, s.cPrev]}>FÖRRA</Text>
                    <Text style={[s.th, s.cIn]}>KG</Text>
                    <Text style={[s.th, s.cIn]}>REPS</Text>
                    <View style={s.cCheck} />
                  </View>

                  {ex.rows.map((row, idx) => {
                    const sug = suggestion(ex, idx);
                    const p = ex.prev[idx];
                    const logged = row.dbId != null;
                    return (
                      <View key={row.key} style={[s.setRow, logged && s.setRowDone]}>
                        <TouchableOpacity
                          style={s.cSet}
                          onLongPress={() =>
                            Alert.alert('Ta bort set', `Ta bort set ${idx + 1}?`, [
                              { text: 'Avbryt', style: 'cancel' },
                              { text: 'Ta bort', style: 'destructive', onPress: () => removeRow(ex, row) },
                            ])
                          }
                        >
                          <Text style={[s.setNum, logged && s.setNumDone]}>{idx + 1}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.cPrev}
                          disabled={!p || logged}
                          onPress={() =>
                            p &&
                            updateEx(ex.key, e => ({
                              ...e,
                              rows: e.rows.map(r =>
                                r.key === row.key
                                  ? {
                                      ...r,
                                      weight: p.weight_kg != null ? String(p.weight_kg) : '',
                                      reps: p.reps != null ? String(p.reps) : '',
                                    }
                                  : r
                              ),
                            }))
                          }
                        >
                          <Text style={s.prevText} numberOfLines={1}>
                            {p ? `${p.weight_kg ? fmtKg(p.weight_kg) + '×' : ''}${p.reps ?? '–'}` : '–'}
                          </Text>
                        </TouchableOpacity>
                        <TextInput
                          style={[s.input, s.cIn, logged && s.inputDone]}
                          value={row.weight}
                          placeholder={sug.weight || '0'}
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="decimal-pad"
                          selectTextOnFocus
                          onChangeText={v => setRowField(ex.key, row.key, 'weight', v)}
                          onEndEditing={() => persistRow(ex.key, row.key)}
                        />
                        <TextInput
                          style={[s.input, s.cIn, logged && s.inputDone]}
                          value={row.reps}
                          placeholder={sug.reps || '0'}
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="number-pad"
                          selectTextOnFocus
                          onChangeText={v => setRowField(ex.key, row.key, 'reps', v)}
                          onEndEditing={() => persistRow(ex.key, row.key)}
                        />
                        <TouchableOpacity
                          style={[s.cCheck, s.checkBtn, logged && s.checkBtnDone]}
                          onPress={() => toggleRow(ex, row)}
                          hitSlop={6}
                        >
                          <Ionicons name="checkmark" size={20} color={logged ? '#fff' : COLORS.textMuted} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  <TouchableOpacity style={s.addSetBtn} onPress={() => addRow(ex)}>
                    <Ionicons name="add" size={16} color={COLORS.text} />
                    <Text style={s.addSetText}>Lägg till set</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <TouchableOpacity style={s.addExBtn} onPress={() => setShowPicker(true)}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.accent} />
              <Text style={s.addExText}>Lägg till övning</Text>
            </TouchableOpacity>

            {started ? (
              <TouchableOpacity style={s.bottomFinish} onPress={() => setShowFinish(true)}>
                <Text style={s.bottomFinishText}>Avsluta passet</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.bottomStart} onPress={ensureStarted}>
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={s.bottomStartText}>Starta passet</Text>
              </TouchableOpacity>
            )}
          </KeyboardAwareScrollView>
        )}
      </View>

      {rest.active && (
        <View style={s.restBar}>
          <View style={s.restTrack}>
            <View
              style={[
                s.restFill,
                { width: `${Math.round((rest.remaining / Math.max(rest.total, 1)) * 100)}%` },
              ]}
            />
          </View>
          <View style={s.restRow}>
            <TouchableOpacity style={s.restAdj} onPress={() => rest.adjust(-15)}>
              <Text style={s.restAdjText}>−15</Text>
            </TouchableOpacity>
            <View style={s.restCenter}>
              <Text style={s.restLabel}>Vila</Text>
              <Text style={s.restTime}>
                {Math.floor(rest.remaining / 60)}:{String(rest.remaining % 60).padStart(2, '0')}
              </Text>
            </View>
            <TouchableOpacity style={s.restAdj} onPress={() => rest.adjust(15)}>
              <Text style={s.restAdjText}>+15</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.skipBtn} onPress={rest.skip}>
              <Text style={s.skipText}>Hoppa över</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ExercisePicker
        visible={showPicker}
        onSelect={handleAddExercise}
        onClose={() => setShowPicker(false)}
      />

      <Modal
        visible={showFinish}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFinish(false)}
      >
        <View style={s.sheetBackdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Avsluta passet?</Text>
            <Text style={s.sheetSub}>
              {elapsed}  ·  {loggedCount} avbockade set
            </Text>

            {pendingFilled > 0 && (
              <TouchableOpacity style={s.pendingRow} onPress={() => setIncludePending(v => !v)}>
                <Ionicons
                  name={includePending ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={includePending ? COLORS.green : COLORS.textMuted}
                />
                <Text style={s.pendingText}>
                  Spara även {pendingFilled} ifyllda set som inte är avbockade
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[s.sheetSave, (toSave === 0 || finishing) && { opacity: 0.4 }]}
              disabled={toSave === 0 || finishing}
              onPress={() => finish(includePending)}
            >
              {finishing ? (
                <ActivityIndicator color="#06281d" />
              ) : (
                <Text style={s.sheetSaveText}>
                  {toSave === 0 ? 'Inga set att spara' : `Spara passet (${toSave} set)`}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetDiscard} onPress={handleDiscard} disabled={finishing}>
              <Text style={s.sheetDiscardText}>Avfärda passet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetCancel} onPress={() => setShowFinish(false)} disabled={finishing}>
              <Text style={s.sheetCancelText}>Fortsätt träna</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={historyFor != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHistoryFor(null)}
      >
        <SafeAreaProvider>
          <SafeAreaView style={s.modalSafe} edges={['top', 'bottom']}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle} numberOfLines={1}>{historyFor?.name}</Text>
              <TouchableOpacity style={s.iconBtn} onPress={() => setHistoryFor(null)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {historyFor && <ExerciseHistoryList exerciseId={historyFor.exerciseId} />}
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  sessionName: { color: COLORS.text, fontWeight: '800', fontSize: 17 },
  timer: { color: COLORS.textMuted, fontSize: 13, marginTop: 1, fontVariant: ['tabular-nums'] },
  finishBtn: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    minWidth: 84,
    alignItems: 'center',
  },
  finishText: { color: '#06281d', fontSize: 14, fontWeight: '800' },
  progressTrack: { height: 3, backgroundColor: COLORS.surface2 },
  progressFill: { height: 3, backgroundColor: COLORS.green },

  content: { padding: 12, paddingBottom: 40 },

  emptyWrap: { alignItems: 'center', paddingVertical: 56, gap: 6 },
  emptyTitle: { color: COLORS.text, fontWeight: '700', fontSize: 17, marginTop: 6 },
  emptyHint: { color: COLORS.textMuted, fontSize: 13 },

  exCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
  },
  exCardDone: { borderWidth: 1, borderColor: COLORS.green + '55' },
  exHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 10 },
  exName: { color: COLORS.accent, fontWeight: '800', fontSize: 16 },
  exMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  smallIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 4 },
  th: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  cSet: { width: 34, alignItems: 'center' },
  cPrev: { flex: 1.3, alignItems: 'center' },
  cIn: { flex: 1, marginHorizontal: 4 },
  cCheck: { width: 44, alignItems: 'center' },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: RADIUS.sm,
  },
  setRowDone: { backgroundColor: COLORS.greenDim },
  setNum: { color: COLORS.text, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  setNumDone: { color: COLORS.green },
  prevText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  input: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: Platform.OS === 'ios' ? 9 : 6,
    textAlign: 'center',
  },
  inputDone: { backgroundColor: 'transparent' },
  checkBtn: {
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface2,
    justifyContent: 'center',
  },
  checkBtnDone: { backgroundColor: COLORS.green },

  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface2,
  },
  addSetText: { color: COLORS.text, fontWeight: '600', fontSize: 13 },

  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.md,
    padding: 15,
    marginTop: 4,
  },
  addExText: { color: COLORS.accent, fontWeight: '700', fontSize: 15 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
  },
  startText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  bottomStart: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    padding: 16,
    marginTop: 14,
  },
  bottomStartText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  bottomFinish: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: 15,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.green + '88',
  },
  bottomFinishText: { color: COLORS.green, fontWeight: '700', fontSize: 15 },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: 20,
    paddingBottom: 32,
    gap: 10,
  },
  sheetTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  sheetSub: { color: COLORS.textMuted, fontSize: 14, marginBottom: 6 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  pendingText: { flex: 1, color: COLORS.text, fontSize: 14 },
  sheetSave: {
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.md,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  sheetSaveText: { color: '#06281d', fontWeight: '800', fontSize: 16 },
  sheetDiscard: {
    borderRadius: RADIUS.md,
    padding: 14,
    alignItems: 'center',
    backgroundColor: COLORS.dangerDim,
  },
  sheetDiscardText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
  sheetCancel: { padding: 12, alignItems: 'center' },
  sheetCancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 15 },

  restBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  restTrack: { height: 3, backgroundColor: COLORS.surface2 },
  restFill: { height: 3, backgroundColor: COLORS.accent },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  restAdj: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  restAdjText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  restCenter: { flex: 1, alignItems: 'center' },
  restLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  restTime: { color: COLORS.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  skipBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  skipText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  modalSafe: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { flex: 1, color: COLORS.text, fontWeight: '800', fontSize: 18 },
});
