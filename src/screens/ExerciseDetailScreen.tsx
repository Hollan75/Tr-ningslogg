import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS } from '../theme';
import { getExerciseById, isExerciseInUse, deleteExercise } from '../database';
import ExerciseInfo from '../components/ExerciseInfo';
import ExerciseFormModal from '../components/ExerciseFormModal';
import type { Exercise } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteP = RouteProp<RootStackParamList, 'ExerciseDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ExerciseDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteP>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    getExerciseById(params.exerciseId)
      .then(setExercise)
      .finally(() => setLoading(false));
  }, [params.exerciseId]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Övning hittades inte</Text>
      </View>
    );
  }

  const isCustom = exercise.id.startsWith('custom_');

  async function handleDelete() {
    if (!exercise) return;
    if (await isExerciseInUse(exercise.id)) {
      Alert.alert(
        'Kan inte ta bort',
        'Övningen finns i ett sparat pass eller i din historik. Ta bort den från passen först – historiken behålls alltid.'
      );
      return;
    }
    Alert.alert('Ta bort övning', `Ta bort "${exercise.name}"?`, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: async () => {
          await deleteExercise(exercise.id);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {isCustom && (
          <>
            <TouchableOpacity onPress={() => setEditing(true)} style={s.iconBtn} hitSlop={8}>
              <Ionicons name="create-outline" size={19} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={s.iconBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <ExerciseInfo exercise={exercise} />
      </ScrollView>

      <ExerciseFormModal
        visible={editing}
        exercise={exercise}
        onClose={() => setEditing(false)}
        onSaved={ex => {
          setEditing(false);
          setExercise(ex);
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.textMuted },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 16, paddingTop: 4, paddingBottom: 40 },
});
