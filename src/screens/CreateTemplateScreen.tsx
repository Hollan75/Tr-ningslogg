import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../theme';
import {
  createTemplate,
  renameTemplate,
  getTemplateExercises,
  addExerciseToTemplate,
  removeTemplateExercise,
  updateTemplateExercise,
} from '../database';
import ExercisePicker from '../components/ExercisePicker';
import type { TemplateExercise } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteP = RouteProp<RootStackParamList, 'CreateTemplate'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

interface EditableExercise extends TemplateExercise {
  sets_str: string;
  reps_str: string;
  weight_str: string;
}

export default function CreateTemplateScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteP>();
  const isEdit = !!params?.templateId;

  const [templateId, setTemplateId] = useState<number | null>(params?.templateId ?? null);
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (params?.templateId) loadExercises(params.templateId);
  }, [params?.templateId]);

  async function loadExercises(tid: number) {
    const exs = await getTemplateExercises(tid);
    setExercises(
      exs.map(e => ({
        ...e,
        sets_str: String(e.sets),
        reps_str: String(e.reps_min),
        weight_str: e.weight_kg != null ? String(e.weight_kg) : '0',
      }))
    );
  }

  async function ensureTemplate(): Promise<number> {
    if (templateId) return templateId;
    if (!name.trim()) {
      Alert.alert('Mallnamn krävs', 'Fyll i ett namn för mallen.');
      throw new Error('no name');
    }
    const id = await createTemplate(name.trim());
    setTemplateId(id);
    return id;
  }

  async function handleSaveName() {
    if (!name.trim()) return;
    if (templateId) await renameTemplate(templateId, name.trim());
    else {
      const id = await createTemplate(name.trim());
      setTemplateId(id);
    }
  }

  async function handleAddExercise(exercise: { id: string; name: string; bodyPart: string | null }) {
    try {
      const tid = await ensureTemplate();
      await addExerciseToTemplate(tid, exercise.id, 3, 10, 0, exercises.length);
      setShowPicker(false);
      loadExercises(tid);
    } catch {
      /* name validation already shown */
    }
  }

  async function handleRemoveExercise(id: number) {
    await removeTemplateExercise(id);
    setExercises(prev => prev.filter(e => e.id !== id));
  }

  function updateField(idx: number, field: 'sets_str' | 'reps_str' | 'weight_str', value: string) {
    setExercises(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  async function handleFieldBlur(idx: number) {
    const ex = exercises[idx];
    const sets = Math.max(1, parseInt(ex.sets_str) || 1);
    const reps = Math.max(1, parseInt(ex.reps_str) || 1);
    const weight = Math.max(0, parseFloat(ex.weight_str) || 0);

    await updateTemplateExercise(ex.id, sets, reps, weight);
    setExercises(prev => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        sets,
        reps_min: reps,
        reps_max: reps,
        weight_kg: weight,
        sets_str: String(sets),
        reps_str: String(reps),
        weight_str: String(weight),
      };
      return next;
    });
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Navbar */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          <Text style={s.backText}>Tillbaka</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>{isEdit ? 'Redigera mall' : 'Ny mall'}</Text>
        <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={s.doneBtnText}>Klar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Name */}
        <Text style={s.label}>MALLNAMN</Text>
        <TextInput
          style={s.nameInput}
          placeholder="t.ex. Bröst & triceps"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
          onBlur={handleSaveName}
          returnKeyType="done"
          onSubmitEditing={handleSaveName}
        />

        {/* Exercises header */}
        <View style={s.sectionHeader}>
          <Text style={s.label}>ÖVNINGAR  ({exercises.length})</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowPicker(true)}>
            <Ionicons name="add" size={16} color={COLORS.accent} />
            <Text style={s.addBtnText}>Lägg till</Text>
          </TouchableOpacity>
        </View>

        {exercises.length === 0 ? (
          <TouchableOpacity style={s.emptyCard} onPress={() => setShowPicker(true)}>
            <Ionicons name="add-circle-outline" size={32} color={COLORS.textMuted} />
            <Text style={s.emptyText}>Tryck för att lägga till övningar</Text>
          </TouchableOpacity>
        ) : (
          exercises.map((ex, idx) => (
            <View key={ex.id} style={s.exCard}>
              {/* Exercise header */}
              <View style={s.exHeader}>
                <View style={s.exIndex}>
                  <Text style={s.exIndexText}>{idx + 1}</Text>
                </View>
                <View style={s.exInfo}>
                  <Text style={s.exName}>{ex.exercise_name}</Text>
                  {ex.bodyPart ? <Text style={s.exMeta}>{ex.bodyPart}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => handleRemoveExercise(ex.id)} style={s.removeBtn}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>

              {/* Config row */}
              <View style={s.configRow}>
                <ConfigField
                  label="Set"
                  value={ex.sets_str}
                  onChange={v => updateField(idx, 'sets_str', v)}
                  onBlur={() => handleFieldBlur(idx)}
                />
                <ConfigField
                  label="Reps"
                  value={ex.reps_str}
                  onChange={v => updateField(idx, 'reps_str', v)}
                  onBlur={() => handleFieldBlur(idx)}
                />
                <ConfigField
                  label="Vikt (kg)"
                  value={ex.weight_str}
                  onChange={v => updateField(idx, 'weight_str', v)}
                  onBlur={() => handleFieldBlur(idx)}
                  decimal
                />
              </View>

              {/* Summary line */}
              <Text style={s.summary}>
                {ex.sets} × {ex.reps_min} reps
                {ex.weight_kg ? `  ·  ${ex.weight_kg} kg` : ''}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

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
  onBlur,
  decimal,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  decimal?: boolean;
}) {
  return (
    <View style={s.configField}>
      <Text style={s.configLabel}>{label}</Text>
      <TextInput
        style={s.configInput}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        maxLength={6}
        textAlign="center"
      />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 80 },
  backText: { color: COLORS.text, fontSize: 16 },
  navTitle: { color: COLORS.text, fontWeight: '600', fontSize: 16 },
  doneBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    minWidth: 80,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  content: { padding: 16, paddingBottom: 48 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    color: COLORS.text,
    fontSize: 16,
    padding: 12,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  addBtnText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },

  exCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  exIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  exIndexText: { color: COLORS.accent, fontWeight: '700', fontSize: 13 },
  exInfo: { flex: 1 },
  exName: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  exMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
  removeBtn: { padding: 4 },

  configRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  configField: { alignItems: 'center', flex: 1 },
  configLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  configInput: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    padding: 8,
    textAlign: 'center',
    width: '100%',
  },

  summary: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
});
