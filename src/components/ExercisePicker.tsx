import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../theme';
import { getExercises, getBodyParts } from '../database';
import type { Exercise } from '../types';

interface Props {
  visible: boolean;
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export default function ExercisePicker({ visible, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [bodyPartFilter, setBodyPartFilter] = useState<string | null>(null);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadBodyParts();
      loadExercises('', null);
    }
  }, [visible]);

  async function loadBodyParts() {
    const parts = await getBodyParts();
    setBodyParts(parts);
  }

  const loadExercises = useCallback(async (q: string, bp: string | null) => {
    setLoading(true);
    try {
      const result = await getExercises(q || undefined, bp ?? undefined);
      setExercises(result);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => loadExercises(search, bodyPartFilter), 300);
    return () => clearTimeout(timer);
  }, [search, bodyPartFilter, loadExercises]);

  function handleClose() {
    setSearch('');
    setBodyPartFilter(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Välj övning</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Sök övning..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Body-part chips */}
        {bodyParts.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsRow}
          >
            {bodyParts.map(item => {
              const active = bodyPartFilter === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setBodyPartFilter(active ? null : item)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Exercise list */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.accent} />
          </View>
        ) : exercises.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.empty}>Inga övningar hittades</Text>
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.exerciseRow}
                onPress={() => {
                  onSelect(item);
                  setSearch('');
                  setBodyPartFilter(null);
                }}
              >
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  {item.bodyPart ? (
                    <Text style={styles.exerciseMeta}>{item.bodyPart}</Text>
                  ) : null}
                </View>
                <Ionicons name="add-circle-outline" size={22} color={COLORS.accent} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  closeBtn: { padding: 4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    margin: 12,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 10,
  },
  chipsScroll: { flexShrink: 0 },
  chipsRow: { paddingHorizontal: 12, paddingVertical: 6, gap: 8, flexDirection: 'row' },
  chip: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.accentDim, borderColor: COLORS.accent },
  chipText: { color: COLORS.textMuted, fontSize: 13 },
  chipTextActive: { color: COLORS.accent, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: COLORS.textMuted, fontSize: 15 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  exerciseMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  separator: { height: 1, backgroundColor: COLORS.border },
});
