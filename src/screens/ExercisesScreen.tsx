import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../theme';
import { getExercises, getBodyParts } from '../database';
import type { Exercise } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ExercisesScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [bodyPartFilter, setBodyPartFilter] = useState<string | null>(null);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getBodyParts().then(setBodyParts);
    }, [])
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      getExercises(search || undefined, bodyPartFilter ?? undefined)
        .then(setExercises)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, bodyPartFilter]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Övningar</Text>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Sök övning..."
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

      {/* Body-part chips */}
      {bodyParts.length > 0 && (
        <FlatList
          data={bodyParts}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
          renderItem={({ item }) => {
            const active = bodyPartFilter === item;
            return (
              <TouchableOpacity
                style={[s.chip, active && s.chipActive]}
                onPress={() => setBodyPartFilter(active ? null : item)}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : exercises.length === 0 ? (
        <View style={s.center}>
          <Text style={s.empty}>
            {search || bodyPartFilter ? 'Inga träffar' : 'Inga övningar – synka i Inställningar'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.row}
              onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
            >
              <View style={s.rowInfo}>
                <Text style={s.rowName}>{item.name}</Text>
                <Text style={s.rowMeta}>
                  {[item.bodyPart, item.equipment].filter(Boolean).join('  ·  ')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 10 },
  chipsRow: { paddingHorizontal: 12, paddingBottom: 10, gap: 8, flexDirection: 'row' },
  chip: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.accentDim, borderColor: COLORS.accent },
  chipText: { color: COLORS.textMuted, fontSize: 12 },
  chipTextActive: { color: COLORS.accent, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  listContent: { paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
  },
  rowInfo: { flex: 1 },
  rowName: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  rowMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  sep: { height: 1, backgroundColor: COLORS.border },
});
