import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../theme';
import { getTemplateById, getTemplateExercises, saveTemplate, getPreviousPerformance } from '../database';
import ExercisePicker from '../components/ExercisePicker';
import { fmtSet, parseNum } from '../utils/format';
import type { Exercise } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteP = RouteProp<RootStackParamList, 'CreateTemplate'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

interface DraftExercise {
  key: string;
  exerciseId: string;
  name: string;
  bodyPart: string | null;
  sets: string;
  reps: string;
  weight: string;
  rest: string;
  lastTime: string | null;
}

let keyCounter = 0;
const nextKey = () => `d${++keyCounter}`;

export default function CreateTemplateScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteP>();
  const templateId = params?.templateId ?? null;

  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(!!templateId);
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);
  const saved = useRef(false);

  useEffect(() => {
    if (!templateId) return;
    (async () => {
      const [tpl, exs] = await Promise.all([
        getTemplateById(templateId),
        getTemplateExercises(templateId),
      ]);
      setName(tpl?.name ?? '');
      const drafts = await Promise.all(
        exs.map(async e => {
          const prev = await getPreviousPerformance(e.exercise_id, -1);
          return {
            key: nextKey(),
            exerciseId: e.exercise_id,
            name: e.exercise_name ?? '',
            bodyPart: e.bodyPart ?? null,
            sets: String(e.sets),
            reps: String(e.reps_min),
            weight: e.weight_kg ? String(e.weight_kg) : '',
            rest: String(e.rest_seconds || 90),
            lastTime: prev[0] ? fmtSet(prev[0]) : null,
          };
        })
      );
      setExercises(drafts);
      setLoading(false);
    })();
  }, [templateId]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    return navigation.addListener('beforeRemove', e => {
      if (!dirty.current || saved.current) return;
      e.preventDefault();
      Alert.alert('Osparade ändringar', 'Vill du spara mallen innan du lämnar?', [
        { text: 'Stanna kvar', style: 'cancel' },
        {
          text: 'Släng ändringar',
          style: 'destructive',
          onPress: () => navigation.dispatch(e.data.action),
        },
        { text: 'Spara', onPress: () => handleSave() },
      ]);
    });
  });

  function change(fn: (list: DraftExercise[]) => DraftExercise[]) {
    dirty.current = true;
    setExercises(fn);
  }

  async function handleAddExercise(exercise: Exercise) {
    setShowPicker(false);
    const prev = await getPreviousPerformance(exercise.id, -1);
    const p = prev[0];
    change(list => [
      ...list,
      {
        key: nextKey(),
        exerciseId: exercise.id,
        name: exercise.name,
        bodyPart: exercise.bodyPart,
        sets: String(Math.max(prev.length, 3)),
        reps: p?.reps ? String(p.reps) : '10',
        weight: p?.weight_kg ? String(p.weight_kg) : '',
        rest: '90',
        lastTime: p ? fmtSet(p) : null,
      },
    ]);
  }

  function updateField(key: string, field: 'sets' | 'reps' | 'weight' | 'rest', value: string) {
    change(list => list.map(e => (e.key === key ? { ...e, [field]: value } : e)));
  }

  function move(idx: number, dir: -1 | 1) {
    change(list => {
      const next = [...list];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return list;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Namn krävs', 'Ge passet ett namn, t.ex. "Överkropp A".');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('Inga övningar', 'Lägg till minst en övning i passet.');
      return;
    }
    setSaving(true);
    try {
      await saveTemplate(
        templateId,
        name.trim(),
        exercises.map(e => ({
          exerciseId: e.exerciseId,
          sets: Math.max(1, Math.round(parseNum(e.sets) ?? 3)),
          reps: Math.max(1, Math.round(parseNum(e.reps) ?? 10)),
          weightKg: Math.max(0, parseNum(e.weight) ?? 0),
          restSeconds: Math.max(0, Math.round(parseNum(e.rest) ?? 90)),
        }))
      );
      saved.current = true;
      navigation.goBack();
    } catch (err) {
      Alert.alert('Kunde inte spara', err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.navTitle}>{templateId ? 'Redigera pass' : 'Nytt pass'}</Text>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.saveText}>Spara</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
            <TextInput
              style={s.nameInput}
              placeholder="Namn på passet"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={v => {
                dirty.current = true;
                setName(v);
              }}
              returnKeyType="done"
            />

            <Text style={s.label}>ÖVNINGAR ({exercises.length})</Text>

            {exercises.map((ex, idx) => (
              <View key={ex.key} style={s.exCard}>
                <View style={s.exHeader}>
                  <View style={s.exIndex}>
                    <Text style={s.exIndexText}>{idx + 1}</Text>
                  </View>
                  <View style={s.exInfo}>
                    <Text style={s.exName}>{ex.name}</Text>
                    <Text style={s.exMeta}>
                      {ex.lastTime ? `Förra gången: ${ex.lastTime}` : ex.bodyPart ?? ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => move(idx, -1)} disabled={idx === 0} style={s.smallBtn}>
                    <Ionicons name="chevron-up" size={16} color={idx === 0 ? COLORS.border : COLORS.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => move(idx, 1)}
                    disabled={idx === exercises.length - 1}
                    style={s.smallBtn}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={idx === exercises.length - 1 ? COLORS.border : COLORS.textMuted}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => change(list => list.filter(e => e.key !== ex.key))}
                    style={s.smallBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>

                <View style={s.configRow}>
                  <ConfigField label="Set" value={ex.sets} onChange={v => updateField(ex.key, 'sets', v)} />
                  <ConfigField label="Reps" value={ex.reps} onChange={v => updateField(ex.key, 'reps', v)} />
                  <ConfigField label="Kg" value={ex.weight} placeholder="–" onChange={v => updateField(ex.key, 'weight', v)} decimal />
                  <ConfigField label="Vila s" value={ex.rest} onChange={v => updateField(ex.key, 'rest', v)} />
                </View>
              </View>
            ))}

            <TouchableOpacity style={s.addBtn} onPress={() => setShowPicker(true)}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.accent} />
              <Text style={s.addText}>Lägg till övning</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <ExercisePicker
        visible={showPicker}
        onSelect={handleAddExercise}
        onClose={() => setShowPicker(false)}
      />
    </SafeAreaView>
  );
}

function ConfigField({
  label,
  value,
  onChange,
  decimal,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  decimal?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={s.configField}>
      <Text style={s.configLabel}>{label}</Text>
      <TextInput
        style={s.configInput}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        onChangeText={onChange}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        selectTextOnFocus
        maxLength={6}
        textAlign="center"
      />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: { color: COLORS.text, fontWeight: '700', fontSize: 17 },
  saveBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    minWidth: 76,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  content: { padding: 16, paddingBottom: 48 },
  nameInput: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
    paddingVertical: 8,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  exCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  exIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  exIndexText: { color: COLORS.accent, fontWeight: '800', fontSize: 13 },
  exInfo: { flex: 1 },
  exName: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  exMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  smallBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  configRow: { flexDirection: 'row', gap: 8 },
  configField: { flex: 1 },
  configLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  configInput: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: Platform.OS === 'ios' ? 9 : 6,
    textAlign: 'center',
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.md,
    padding: 15,
    marginTop: 4,
  },
  addText: { color: COLORS.accent, fontWeight: '700', fontSize: 15 },
});
