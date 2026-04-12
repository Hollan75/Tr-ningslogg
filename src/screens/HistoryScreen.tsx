import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../theme';
import { getSessions, cancelSession } from '../database';
import type { WorkoutSession } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function msToHuman(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return '< 1 min';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSessions().then(setSessions);
    }, [])
  );

  function handleDelete(session: WorkoutSession) {
    Alert.alert(
      'Ta bort pass',
      `Vill du ta bort passet från ${fmtDate(session.started_at)}?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            await cancelSession(session.id);
            setSessions(prev => prev.filter(s => s.id !== session.id));
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Historik</Text>
        {sessions.length > 0 && (
          <Text style={s.count}>{sessions.length} pass</Text>
        )}
      </View>

      {sessions.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📅</Text>
          <Text style={s.emptyTitle}>Ingen träningshistorik</Text>
          <Text style={s.emptyHint}>Slutförda pass visas här</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
            >
              <View style={s.cardMain}>
                <View style={s.cardLeft}>
                  <Text style={s.cardName}>{item.template_name ?? 'Fritt pass'}</Text>
                  <Text style={s.cardDate}>{fmtDate(item.started_at)}</Text>
                  <View style={s.cardStats}>
                    <Stat icon="barbell-outline" value={`${item.set_count ?? 0} set`} />
                    <Stat icon="body-outline" value={`${item.exercise_count ?? 0} övn`} />
                    {item.completed_at && (
                      <Stat
                        icon="time-outline"
                        value={msToHuman(item.started_at, item.completed_at)}
                      />
                    )}
                  </View>
                </View>
                <View style={s.cardRight}>
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </View>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </SafeAreaView>
  );
}

function Stat({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon as any} size={12} color={COLORS.textMuted} />
      <Text style={s.statText}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  count: { color: COLORS.textMuted, fontSize: 14 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: COLORS.textMuted, fontSize: 13, marginTop: 6 },
  listContent: { paddingHorizontal: 12, paddingVertical: 4, paddingBottom: 24 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  cardLeft: { flex: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardName: { color: COLORS.text, fontWeight: '600', fontSize: 15, marginBottom: 2 },
  cardDate: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8 },
  cardStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: COLORS.textMuted, fontSize: 12 },
  deleteBtn: { padding: 4 },
});
