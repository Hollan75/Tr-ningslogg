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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../theme';
import { getExercises, getBodyParts, getEquipment } from '../database';
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

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Övningar</Text>
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

      {/* Filters: body part */}
      {bodyParts.length > 0 && (
        <FilterRow
          items={bodyParts}
          active={bodyPart}
          onSelect={v => setBodyPart(bodyPart === v ? null : v)}
          label="Muskelgrupp"
        />
      )}

      {/* Filters: equipment */}
      {equipments.length > 0 && (
        <FilterRow
          items={equipments}
          active={equip}
          onSelect={v => setEquip(equip === v ? null : v)}
          label="Utrustning"
        />
      )}

      {/* Active filters summary */}
      {(bodyPart || equip) && (
        <View style={s.activeFilters}>
          <Ionicons name="funnel" size={12} color={COLORS.accent} />
          <Text style={s.activeFiltersText}>
            {[bodyPart, equip].filter(Boolean).join('  ·  ')}
          </Text>
          <TouchableOpacity
            onPress={() => { setBodyPart(null); setEquip(null); }}
          >
            <Text style={s.clearFilters}>Rensa</Text>
          </TouchableOpacity>
        </View>
      )}

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
          renderItem={({ item }) => <ExerciseRow exercise={item} onPress={() =>
            navigation.navigate('ExerciseDetail', { exerciseId: item.id })
          } />}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.chipsRow}
    >
      <Text style={s.filterLabel}>{label}:</Text>
      {items.map(item => (
        <TouchableOpacity
          key={item}
          style={[s.chip, active === item && s.chipActive]}
          onPress={() => onSelect(item)}
        >
          <Text style={[s.chipText, active === item && s.chipTextActive]}>{item}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function ExerciseRow({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const muscles = parseMuscles(exercise.primaryMuscles);
  return (
    <TouchableOpacity style={s.row} onPress={onPress}>
      <View style={s.rowInfo}>
        <Text style={s.rowName}>{exercise.name}</Text>
        {/* Muscle chips */}
        {muscles.length > 0 && (
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
        {muscles.length === 0 && exercise.equipment ? (
          <Text style={s.rowMeta}>{exercise.equipment}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 10 },

  chipsRow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  filterLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginRight: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chip: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.accentDim, borderColor: COLORS.accent },
  chipText: { color: COLORS.textMuted, fontSize: 12 },
  chipTextActive: { color: COLORS.accent, fontWeight: '600' },

  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  activeFiltersText: { color: COLORS.accent, fontSize: 12, flex: 1 },
  clearFilters: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },

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
  rowName: { color: COLORS.text, fontSize: 15, fontWeight: '500', marginBottom: 5 },
  rowMeta: { color: COLORS.textMuted, fontSize: 12 },

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
