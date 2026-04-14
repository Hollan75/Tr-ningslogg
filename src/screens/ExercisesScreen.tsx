import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../theme';
import { getExercises, getBodyParts, getEquipment, insertExercise } from '../database';
import type { Exercise } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function parseMuscles(json: string | null): string[] {
  try {
    const arr = JSON.parse(json ?? '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function ExercisesScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const [equip, setEquip] = useState<string | null>(null);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [equipments, setEquipments] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getBodyParts(), getEquipment()]).then(([bp, eq]) => {
        setBodyParts(bp);
        setEquipments(eq);
      });
    }, [])
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      getExercises(search || undefined, bodyPart ?? undefined, equip ?? undefined)
        .then(setExercises)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, bodyPart, equip]);

  async function handleCreateExercise(name: string, bp: string, eq: string, instr: string) {
    const id = `custom_${Date.now()}`;
    const muscles = bp.trim() ? [bp.trim()] : [];
    const exercise: Exercise = {
      id,
      name: name.trim(),
      category: 'custom',
      primaryMuscles: JSON.stringify(muscles),
      secondaryMuscles: '[]',
      equipment: eq.trim() || null,
      bodyPart: muscles[0] ?? null,
      gifUrl: null,
      instructions: instr.trim() || null,
      difficulty: null,
    };
    await insertExercise(exercise);
    // Refresh filter lists and exercise list
    const [bp2, eq2] = await Promise.all([getBodyParts(), getEquipment()]);
    setBodyParts(bp2);
    setEquipments(eq2);
    setLoading(true);
    getExercises(search || undefined, bodyPart ?? undefined, equip ?? undefined)
      .then(setExercises)
      .finally(() => setLoading(false));
    setShowCreateModal(false);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Övningar</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={18} color={COLORS.accent} />
          <Text style={s.addBtnText}>Ny övning</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Sök övning…"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={s.filtersWrap}>
        {bodyParts.length > 0 && (
          <FilterRow
            items={bodyParts}
            active={bodyPart}
            onSelect={v => setBodyPart(bodyPart === v ? null : v)}
            label="Muskel"
          />
        )}
        {equipments.length > 0 && (
          <FilterRow
            items={equipments}
            active={equip}
            onSelect={v => setEquip(equip === v ? null : v)}
            label="Utrustning"
          />
        )}
        {(bodyPart || equip) && (
          <TouchableOpacity style={s.clearRow} onPress={() => { setBodyPart(null); setEquip(null); }}>
            <Ionicons name="close-circle" size={13} color={COLORS.danger} />
            <Text style={s.clearText}>Rensa filter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : exercises.length === 0 ? (
        <View style={s.center}>
          <Text style={s.empty}>
            {search || bodyPart || equip
              ? 'Inga träffar – prova andra filter'
              : 'Inga övningar – synka i Inställningar'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => (
            <ExerciseRow
              exercise={item}
              onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
            />
          )}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      )}

      {/* Create exercise modal */}
      <CreateExerciseModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateExercise}
      />
    </SafeAreaView>
  );
}

// ─── Filter row ───────────────────────────────────────────────────────────────

function FilterRow({
  items,
  active,
  onSelect,
  label,
}: {
  items: string[];
  active: string | null;
  onSelect: (v: string) => void;
  label: string;
}) {
  return (
    <View style={s.filterRow}>
      <Text style={s.filterLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
      >
        {items.map(item => (
          <TouchableOpacity
            key={item}
            style={[s.chip, active === item && s.chipActive]}
            onPress={() => onSelect(item)}
          >
            <Text style={[s.chipText, active === item && s.chipTextActive]} numberOfLines={1}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Exercise row ─────────────────────────────────────────────────────────────

function ExerciseRow({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const muscles = parseMuscles(exercise.primaryMuscles);
  const isCustom = exercise.id.startsWith('custom_');
  return (
    <TouchableOpacity style={s.row} onPress={onPress}>
      <View style={s.rowInfo}>
        <View style={s.rowNameRow}>
          <Text style={s.rowName}>{exercise.name}</Text>
          {isCustom && (
            <View style={s.customBadge}>
              <Text style={s.customBadgeText}>Egen</Text>
            </View>
          )}
        </View>
        {(muscles.length > 0 || exercise.equipment) && (
          <View style={s.musclRow}>
            {muscles.map(m => (
              <View key={m} style={s.muscleChip}>
                <Text style={s.muscleChipText}>{m}</Text>
              </View>
            ))}
            {exercise.equipment ? (
              <View style={s.equipChip}>
                <Text style={s.equipChipText}>{exercise.equipment}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Create exercise modal ────────────────────────────────────────────────────

function CreateExerciseModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, bodyPart: string, equipment: string, instructions: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [bp, setBp] = useState('');
  const [eq, setEq] = useState('');
  const [instr, setInstr] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setName(''); setBp(''); setEq(''); setInstr('');
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Namn krävs', 'Ange ett namn för övningen.');
      return;
    }
    setSaving(true);
    try {
      await onCreate(name, bp, eq, instr);
      reset();
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={m.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={m.safe} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={m.header}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={m.cancel}>Avbryt</Text>
            </TouchableOpacity>
            <Text style={m.title}>Ny övning</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={COLORS.accent} />
                : <Text style={m.save}>Spara</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={m.content} keyboardShouldPersistTaps="handled">
            <Field label="Namn *" placeholder="t.ex. Hantelcurl" value={name} onChangeText={setName} />
            <Field label="Muskelgrupp" placeholder="t.ex. biceps" value={bp} onChangeText={setBp} />
            <Field label="Utrustning" placeholder="t.ex. hantel" value={eq} onChangeText={setEq} />
            <Field
              label="Instruktioner (valfritt)"
              placeholder="Beskriv hur övningen utförs…"
              value={instr}
              onChangeText={setInstr}
              multiline
              style={m.instrInput}
            />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  multiline,
  style: extraStyle,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  style?: object;
}) {
  return (
    <View style={m.field}>
      <Text style={m.label}>{label}</Text>
      <TextInput
        style={[m.input, extraStyle]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        autoCorrect={false}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  addBtnText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 10 },

  filtersWrap: { paddingBottom: 4 },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    marginBottom: 4,
  },
  filterLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: 62,
    flexShrink: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 12,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.accentDim, borderColor: COLORS.accent },
  chipText: { color: COLORS.textMuted, fontSize: 13 },
  chipTextActive: { color: COLORS.accent, fontWeight: '600' },

  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  clearText: { color: COLORS.danger, fontSize: 12, fontWeight: '500' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  listContent: { paddingBottom: 16 },

  sep: { height: 1, backgroundColor: COLORS.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
  },
  rowInfo: { flex: 1 },
  rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  rowName: { color: COLORS.text, fontSize: 15, fontWeight: '500', flexShrink: 1 },
  customBadge: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customBadgeText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },

  musclRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  muscleChip: {
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  muscleChipText: { color: COLORS.accent, fontSize: 11, fontWeight: '500' },
  equipChip: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  equipChipText: { color: COLORS.textMuted, fontSize: 11 },
});

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
  title: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  cancel: { fontSize: 16, color: COLORS.textMuted },
  save: { fontSize: 16, fontWeight: '600', color: COLORS.accent },
  content: { padding: 16, gap: 16 },
  field: { gap: 6 },
  label: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  instrInput: { minHeight: 100, textAlignVertical: 'top' },
});
