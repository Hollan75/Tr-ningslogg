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
} from '../database';
import ExercisePicker from '../components/ExercisePicker';
import type { TemplateExercise } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteP = RouteProp<RootStackParamList, 'CreateTemplate'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CreateTemplateScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteP>();
  const isEdit = !!params?.templateId;

  const [templateId, setTemplateId] = useState<number | null>(params?.templateId ?? null);
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (params?.templateId) {
      loadExercises(params.templateId);
    }
  }, [params?.templateId]);

  async function loadExercises(tid: number) {
    const exs = await getTemplateExercises(tid);
    setExercises(exs);
  }

  async function handleSaveName() {
    if (!name.trim()) return;
    if (templateId) {
      await renameTemplate(templateId, name.trim());
    } else {
      const id = await createTemplate(name.trim());
      setTemplateId(id);
    }
  }

  async function handleAddExercise(exercise: { id: string; name: string; bodyPart: string | null }) {
    if (!templateId) {
      // Create template first
      if (!name.trim()) {
        Alert.alert('Mallnamn krävs', 'Fyll i ett namn för mallen innan du lägger till övningar.');
        return;
      }
      const id = await createTemplate(name.trim());
      setTemplateId(id);
      await addExerciseToTemplate(id, exercise.id, 3, 8, 12, 60, exercises.length);
      loadExercises(id);
    } else {
      await addExerciseToTemplate(templateId, exercise.id, 3, 8, 12, 60, exercises.length);
      loadExercises(templateId);
    }
    setShowPicker(false);
  }

  async function handleRemoveExercise(id: number) {
    await removeTemplateExercise(id);
    setExercises(prev => prev.filter(e => e.id !== id));
  }

  function handleDone() {
    if (!name.trim() && !isEdit) {
      Alert.alert('Mallnamn krävs', 'Fyll i ett namn för mallen.');
      return;
    }
    navigation.goBack();
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
        <TouchableOpacity style={s.doneBtn} onPress={handleDone}>
          <Text style={s.doneBtnText}>Klar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Name input */}
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

        {/* Exercises */}
        <View style={s.sectionHeader}>
          <Text style={s.label}>ÖVNINGAR</Text>
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
              <View style={s.exIndex}>
                <Text style={s.exIndexText}>{idx + 1}</Text>
              </View>
              <View style={s.exInfo}>
                <Text style={s.exName}>{ex.exercise_name}</Text>
                <Text style={s.exMeta}>
                  {ex.sets} set · {ex.reps_min}–{ex.reps_max} reps · {ex.rest_seconds}s vila
                </Text>
              </View>
              <TouchableOpacity
                style={s.removeBtn}
                onPress={() => handleRemoveExercise(ex.id)}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    minWidth: 80,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  content: { padding: 16, paddingBottom: 40 },

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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
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
  exMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  removeBtn: { padding: 4 },
});
