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
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

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
  const [bp, setBp] = useState('');
  const [eq, setEq] = useState('');
  const [instr, setInstr] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    setName(exercise?.name ?? initialName ?? '');
    setBp(exercise ? exercise.bodyPart ?? parseMuscles(exercise.primaryMuscles)[0] ?? '' : '');
    setEq(exercise?.equipment ?? '');
    setInstr(exercise?.instructions ?? '');
    setSuggestions(MUSCLE_GROUPS);
  }, [visible, exercise, initialName]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Namn krävs', 'Ange ett namn för övningen.');
      return;
    }
    setSaving(true);
    try {
      const group = toGroup(bp.trim() || null);
      const muscles = group ? [group] : [];
      const saved: Exercise = {
        id: exercise?.id ?? `custom_${Date.now()}`,
        name: name.trim(),
        category: 'custom',
        primaryMuscles: JSON.stringify(muscles),
        secondaryMuscles: exercise?.secondaryMuscles ?? '[]',
        equipment: toEquipment(eq.trim() || null),
        bodyPart: group,
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

  const filteredSuggestions = suggestions;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider>
        <KeyboardAvoidingView style={m.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

            <ScrollView contentContainerStyle={m.content} keyboardShouldPersistTaps="handled">
              <Field label="Namn *" placeholder="t.ex. Hantelcurl" value={name} onChangeText={setName} autoFocus={!exercise} />
              <View style={m.field}>
                <Field label="Muskelgrupp" placeholder="Välj nedan eller skriv egen" value={bp} onChangeText={setBp} />
                {filteredSuggestions.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={m.chips} keyboardShouldPersistTaps="handled">
                    {filteredSuggestions.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[m.chip, bp === s && m.chipActive]}
                        onPress={() => setBp(s)}
                      >
                        <Text style={[m.chipText, bp === s && m.chipTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
              <Field label="Utrustning" placeholder="t.ex. hantel, kabel, kroppsvikt" value={eq} onChangeText={setEq} />
              <Field
                label="Instruktioner (valfritt)"
                placeholder="Beskriv hur övningen utförs. Separera steg med semikolon."
                value={instr}
                onChangeText={setInstr}
                multiline
              />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
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
  chips: { gap: 6, paddingVertical: 2 },
  chip: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.accentDim, borderColor: COLORS.accent },
  chipText: { color: COLORS.textMuted, fontSize: 13 },
  chipTextActive: { color: COLORS.accent, fontWeight: '600' },
});
