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
import { getTemplates, deleteTemplate, getActiveSession } from '../database';
import ResumeBanner from '../components/ResumeBanner';
import { startWorkout } from '../utils/workout';
import { fmtRelativeDate } from '../utils/format';
import type { WorkoutTemplate, WorkoutSession } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WorkoutScreen() {
  const navigation = useNavigation<Nav>();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [active, setActive] = useState<WorkoutSession | null>(null);

  useFocusEffect(
    useCallback(() => {
      getTemplates().then(setTemplates);
      getActiveSession().then(setActive);
    }, [])
  );

  function handleTemplateMenu(template: WorkoutTemplate) {
    Alert.alert(template.name, undefined, [
      {
        text: 'Redigera',
        onPress: () => navigation.navigate('CreateTemplate', { templateId: template.id }),
      },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Ta bort pass', `Vill du ta bort "${template.name}"? Historiken behålls.`, [
            { text: 'Avbryt', style: 'cancel' },
            {
              text: 'Ta bort',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteTemplate(template.id);
                  setTemplates(prev => prev.filter(t => t.id !== template.id));
                } catch (err) {
                  Alert.alert('Kunde inte ta bort', err instanceof Error ? err.message : String(err));
                }
              },
            },
          ]),
      },
      { text: 'Stäng', style: 'cancel' },
    ]);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Träna</Text>

        {active && (
          <ResumeBanner
            session={active}
            onPress={() =>
              navigation.navigate('ActiveWorkout', {
                sessionId: active.id,
                sessionName: active.template_name ?? 'Fritt pass',
              })
            }
          />
        )}

        <TouchableOpacity
          style={s.freeBtn}
          onPress={() => startWorkout(navigation, undefined, 'Fritt pass')}
          activeOpacity={0.85}
        >
          <View style={s.freeIcon}>
            <Ionicons name="flash" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.freeTitle}>Starta tomt pass</Text>
            <Text style={s.freeSub}>Lägg till övningar medan du tränar</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>MINA PASS</Text>
          <TouchableOpacity style={s.newBtn} onPress={() => navigation.navigate('CreateTemplate', {})}>
            <Ionicons name="add" size={16} color={COLORS.accent} />
            <Text style={s.newBtnText}>Nytt pass</Text>
          </TouchableOpacity>
        </View>

        {templates.length === 0 ? (
          <TouchableOpacity style={s.empty} onPress={() => navigation.navigate('CreateTemplate', {})}>
            <Ionicons name="clipboard-outline" size={36} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>Inga sparade pass ännu</Text>
            <Text style={s.emptyHint}>
              Skapa ett pass med dina övningar, set och vikter – så kan du köra det igen med ett tryck.
            </Text>
          </TouchableOpacity>
        ) : (
          templates.map(template => (
            <TouchableOpacity
              key={template.id}
              style={s.card}
              activeOpacity={0.85}
              onPress={() => startWorkout(navigation, template.id, template.name)}
              onLongPress={() => handleTemplateMenu(template)}
            >
              <View style={s.cardTop}>
                <Text style={s.cardName} numberOfLines={1}>{template.name}</Text>
                <TouchableOpacity onPress={() => handleTemplateMenu(template)} hitSlop={10}>
                  <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              {template.exercise_names ? (
                <Text style={s.cardExercises} numberOfLines={2}>{template.exercise_names}</Text>
              ) : null}
              <View style={s.cardBottom}>
                <Text style={s.cardMeta}>
                  {template.exercise_count ?? 0} övningar
                  {template.last_used ? `  ·  Senast ${fmtRelativeDate(template.last_used).toLowerCase()}` : ''}
                </Text>
                <View style={s.startPill}>
                  <Ionicons name="play" size={12} color="#fff" />
                  <Text style={s.startText}>Starta</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '800', color: COLORS.text, letterSpacing: -0.6, marginBottom: 16 },

  freeBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
  },
  freeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  freeSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.8 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  newBtnText: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },

  empty: {
    alignItems: 'center',
    padding: 28,
    gap: 8,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  emptyHint: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardName: { flex: 1, color: COLORS.text, fontWeight: '800', fontSize: 17 },
  cardExercises: { color: COLORS.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  cardMeta: { flex: 1, color: COLORS.textMuted, fontSize: 12 },
  startPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  startText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
