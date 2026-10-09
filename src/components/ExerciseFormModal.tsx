import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { COLORS, RADIUS } from '../theme';
import { insertExercise } from '../database';
import { parseMuscles } from '../utils/format';
import { MUSCLE_GROUPS, toGroup, toEquipment } from '../data/groups';
import type { Exercise } from '../types';

interface Props {
  visible: boolean;
  // When set, the modal edits this (custom) exercise instead of creating a new one
  exercise?: Exercise | null;
  initialName?: string;
  onClose: () => void;
  onSaved: (exercise: Exercise) => void;
}

export default function ExerciseFormModal({ visible, exercise, initialName, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const [eq, setEq] = useState('');
  const [instr, setInstr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(exercise?.name ?? initialName ?? '');
    // Groups are stored in primaryMuscles; bodyPart holds the first one
    const stored = exercise
      ? [exercise.bodyPart, ...parseMuscles(exercise.primaryMuscles)]
          .map(g => toGroup(g))
          .filter((g): g is string => !!g && MUSCLE_GROUPS.includes(g))
      : [];
    setGroups([...new Set(stored)]);
    setEq(exercise?.equipment ?? '');
    setInstr(exercise?.instructions ?? '');
  }, [visible, exercise, initialName]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Namn krävs', 'Ange ett namn för övningen.');
      return;
    }
    setSaving(true);
    try {
      // Keep the fixed order so the "main" group is predictable
      const muscles = MUSCLE_GROUPS.filter(g => groups.includes(g));
      const saved: Exercise = {
        id: exercise?.id ?? `custom_${Date.now()}`,
        name: name.trim(),
        category: 'custom',
        primaryMuscles: JSON.stringify(muscles),
        secondaryMuscles: exercise?.secondaryMuscles ?? '[]',
        equipment: toEquipment(eq.trim() || null),
        bodyPart: muscles[0] ?? null,
        gifUrl: null,
        instructions: instr.trim() || null,
        difficulty: null,
      };
      await insertExercise(saved);
      onSaved(saved);
    } catch (err) {
      Alert.alert('Kunde inte spara', err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function toggleGroup(g: string) {
    setGroups(cur => (cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g]));
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider>
        <View style={m.wrap}>
          <SafeAreaView style={m.safe} edges={['top', 'bottom']}>
            <View style={m.header}>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Text style={m.cancel}>Avbryt</Text>
              </TouchableOpacity>
              <Text style={m.title}>{exercise ? 'Redigera övning' : 'Ny övning'}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={10}>
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.accent} />
                ) : (
                  <Text style={m.save}>Spara</Text>
                )}
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView
              contentContainerStyle={m.content}
              keyboardShouldPersistTaps="handled"
              bottomOffset={24}
            >
              <Field label="Namn *" placeholder="t.ex. Hantelcurl" value={name} onChangeText={setName} autoFocus={!exercise} />
              <View style={m.field}>
                <Text style={m.label}>Muskelgrupper (välj en eller flera)</Text>
                <View style={m.chips}>
                  {MUSCLE_GROUPS.map(g => {
                    const on = groups.includes(g);
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[m.chip, on && m.chipActive]}
                        onPress={() => toggleGroup(g)}
                      >
                        {on && <Ionicons name="checkmark" size={14} color={COLORS.accent} />}
                        <Text style={[m.chipText, on && m.chipTextActive]}>{g}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <Field label="Utrustning" placeholder="t.ex. hantel, kabel, kroppsvikt" value={eq} onChangeText={setEq} />
              <Field
                label="Instruktioner (valfritt)"
                placeholder="Beskriv hur övningen utförs. Separera steg med semikolon."
                value={instr}
                onChangeText={setInstr}
                multiline
              />
            </KeyboardAwareScrollView>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  multiline,
  autoFocus,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <View style={m.field}>
      <Text style={m.label}>{label}</Text>
      <TextInput
        style={[m.input, multiline && m.multiline]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        autoFocus={autoFocus}
        autoCorrect={false}
      />
    </View>
  );
}

const m = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  cancel: { fontSize: 16, color: COLORS.textMuted },
  save: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
  content: { padding: 16, gap: 18 },
  field: { gap: 8 },
  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.accentDim, borderColor: COLORS.accent },
  chipText: { color: COLORS.textMuted, fontSize: 13 },
  chipTextActive: { color: COLORS.accent, fontWeight: '600' },
});
