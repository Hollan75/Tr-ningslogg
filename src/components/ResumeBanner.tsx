import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADIUS } from '../theme';
import type { WorkoutSession } from '../types';

interface Props {
  session: WorkoutSession;
  onPress: () => void;
}

// Shown when a workout was started but not finished
export default function ResumeBanner({ session, onPress }: Props) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000));
  const started = mins < 60 ? `${mins} min sedan` : `${Math.floor(mins / 60)} h sedan`;
  return (
    <TouchableOpacity style={s.wrap} onPress={onPress} activeOpacity={0.85}>
      <View style={s.dot} />
      <View style={{ flex: 1 }}>
        <Text style={s.title}>Pågående pass – {session.template_name ?? 'Fritt pass'}</Text>
        <Text style={s.sub}>
          Startat {started} · {session.set_count ?? 0} set loggade
        </Text>
      </View>
      <Text style={s.cta}>Fortsätt</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.green} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.greenDim,
    borderWidth: 1,
    borderColor: COLORS.green + '66',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 16,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.green },
  title: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  sub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  cta: { color: COLORS.green, fontWeight: '700', fontSize: 14 },
});
