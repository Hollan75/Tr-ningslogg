import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../theme';
import { getTemplates, deleteTemplate, startSession } from '../database';
import type { WorkoutTemplate } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WorkoutScreen() {
  const navigation = useNavigation<Nav>();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  useFocusEffect(
    useCallback(() => {
      getTemplates().then(setTemplates);
    }, [])
  );

  async function handleFreeWorkout() {
    const sessionId = await startSession();
    navigation.navigate('ActiveWorkout', { sessionId, sessionName: 'Fritt pass' });
  }

  async function handleStartTemplate(template: WorkoutTemplate) {
    const sessionId = await startSession(template.id);
    navigation.navigate('ActiveWorkout', { sessionId, sessionName: template.name });
  }

  function handleDeleteTemplate(template: WorkoutTemplate) {
    Alert.alert(
      'Ta bort mall',
      `Vill du ta bort mallen "${template.name}"?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(template.id);
            setTemplates(prev => prev.filter(t => t.id !== template.id));
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Header */}
        <Text style={s.title}>Pass</Text>

        {/* Free workout */}
        <TouchableOpacity style={s.freeBtn} onPress={handleFreeWorkout} activeOpacity={0.85}>
          <View style={s.freeBtnLeft}>
            <Ionicons name="flash" size={22} color={COLORS.accent} />
            <View>
              <Text style={s.freeBtnTitle}>Starta fritt pass</Text>
              <Text style={s.freeBtnSub}>Logga övningar fritt utan mall</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.accent} />
        </TouchableOpacity>

        {/* Templates header */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>MALLAR</Text>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => navigation.navigate('CreateTemplate', {})}
          >
            <Ionicons name="add" size={16} color={COLORS.accent} />
            <Text style={s.newBtnText}>Ny mall</Text>
          </TouchableOpacity>
        </View>

        {/* Template list */}
        {templates.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>Inga mallar ännu</Text>
            <Text style={s.emptyHint}>Skapa en mall för att spara dina favoritpass</Text>
          </View>
        ) : (
          templates.map(template => (
            <View key={template.id} style={s.templateCard}>
              <View style={s.templateInfo}>
                <Text style={s.templateName}>{template.name}</Text>
                <Text style={s.templateMeta}>
                  {template.exercise_count ?? 0} övningar
                </Text>
              </View>
              <View style={s.templateActions}>
                <TouchableOpacity
                  style={s.editBtn}
                  onPress={() =>
                    navigation.navigate('CreateTemplate', { templateId: template.id })
                  }
                >
                  <Ionicons name="pencil-outline" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => handleDeleteTemplate(template)}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.startBtn}
                  onPress={() => handleStartTemplate(template)}
                >
                  <Ionicons name="play" size={14} color="#fff" />
                  <Text style={s.startBtnText}>Starta</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5, marginBottom: 16 },

  freeBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  freeBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  freeBtnTitle: { color: COLORS.text, fontWeight: '600', fontSize: 16 },
  freeBtnSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  newBtnText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: COLORS.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center' },

  templateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateInfo: { flex: 1 },
  templateName: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
  templateMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  templateActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: { padding: 6 },
  deleteBtn: { padding: 6 },
  startBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
  },
  startBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
