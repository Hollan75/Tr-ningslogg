import React, { useState, useEffect } from 'react';
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
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADIUS } from '../theme';
import { getExercises, getBodyParts, getRecentExercises } from '../database';
import ExerciseFormModal from './ExerciseFormModal';
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
  const [recent, setRecent] = useState<Exercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setBodyPartFilter(null);
    getBodyParts().then(setBodyParts);
    getRecentExercises().then(setRecent);
  }, [visible]);

  // Debounced search
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        setExercises(await getExercises(search || undefined, bodyPartFilter ?? undefined));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, bodyPartFilter, visible]);

  const showRecent = !search && !bodyPartFilter && recent.length > 0;
  const recentIds = new Set(recent.map(r => r.id));
  const listData = showRecent ? exercises.filter(e => !recentIds.has(e.id)) : exercises;

  function renderRow(item: Exercise) {
    const isCustom = item.id.startsWith('custom_');
    return (
      <TouchableOpacity key={item.id} style={styles.row} onPress={() => onSelect(item)}>
        <View style={styles.rowInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
            {isCustom && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Egen</Text>
              </View>
            )}
          </View>
          {(item.bodyPart || item.equipment) && (
            <Text style={styles.rowMeta}>
              {[item.bodyPart, item.equipment].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
        <Ionicons name="add-circle" size={26} color={COLORS.accent} />
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>Välj övning</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Sök övning…"
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

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
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="create-outline" size={18} color={COLORS.accent} />
            <Text style={styles.createText}>
              {search.trim() ? `Skapa "${search.trim()}" som egen övning` : 'Skapa egen övning'}
            </Text>
          </TouchableOpacity>

          {loading && listData.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={COLORS.accent} />
            </View>
          ) : (
            <FlatList
              data={listData}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                showRecent ? (
                  <View>
                    <Text style={styles.section}>SENAST & EGNA</Text>
                    {recent.map(renderRow)}
                    <Text style={styles.section}>ALLA ÖVNINGAR</Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.empty}>Inga övningar hittades</Text>
                </View>
              }
              renderItem={({ item }) => renderRow(item)}
            />
          )}

          <ExerciseFormModal
            visible={showCreate}
            initialName={search.trim()}
            onClose={() => setShowCreate(false)}
            onSaved={ex => {
              setShowCreate(false);
              onSelect(ex);
            }}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 16, paddingVertical: 11 },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chipsRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 6, flexDirection: 'row' },
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.accentDim, borderColor: COLORS.accent },
  chipText: { color: COLORS.textMuted, fontSize: 13 },
  chipTextActive: { color: COLORS.accent, fontWeight: '600' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.accentBorder,
  },
  createText: { color: COLORS.accent, fontWeight: '600', fontSize: 14, flex: 1 },
  section: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { color: COLORS.textMuted, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowInfo: { flex: 1, marginRight: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { color: COLORS.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  rowMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  badge: {
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  badgeText: { color: COLORS.accent, fontSize: 10, fontWeight: '700' },
});
