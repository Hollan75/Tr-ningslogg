import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { COLORS, RADIUS } from '../theme';
import { getTemplates } from '../database';
import { loadSchedule, saveSchedule } from '../utils/schedule';
import { WEEKDAY_SHORT, nextScheduled } from '../utils/notify';
import type { ScheduleEntry } from '../utils/notify';
import type { WorkoutTemplate } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

function daysText(days: number[]): string {
  const sorted = [...days].sort();
  if (sorted.length === 7) return 'Varje dag';
  if (sorted.join() === '1,2,3,4,5') return 'Vardagar';
  if (sorted.join() === '6,7') return 'Helger';
  return sorted.map(d => WEEKDAY_SHORT[d - 1]).join(', ');
}

function fmtNext(date: Date): string {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (date.toDateString() === today.toDateString()) return `idag ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `imorgon ${time}`;
  return `${date.toLocaleDateString('sv-SE', { weekday: 'long' })} ${time}`;
}

export default function ScheduleScreen() {
  const navigation = useNavigation();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [editing, setEditing] = useState<ScheduleEntry | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSchedule().then(setEntries);
      getTemplates().then(setTemplates);
    }, [])
  );

  async function persist(next: ScheduleEntry[]) {
    setEntries(next);
    try {
      await saveSchedule(next);
    } catch (err) {
      Alert.alert('Påminnelser', err instanceof Error ? err.message : String(err));
    }
  }

  function newEntry(): ScheduleEntry {
    return {
      id: `s${Date.now()}`,
      weekdays: [1, 3, 5],
      hour: 7,
      minute: 0,
      templateId: null,
      templateName: null,
      enabled: true,
    };
  }

  function saveEditing() {
    if (!editing) return;
    if (editing.weekdays.length === 0) {
      Alert.alert('Välj dagar', 'Välj minst en veckodag.');
      return;
    }
    const exists = entries.some(e => e.id === editing.id);
    persist(exists ? entries.map(e => (e.id === editing.id ? editing : e)) : [...entries, editing]);
    setEditing(null);
  }

  function remove(entry: ScheduleEntry) {
    Alert.alert('Ta bort påminnelse', `${daysText(entry.weekdays)} ${pad(entry.hour)}:${pad(entry.minute)}?`, [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Ta bort', style: 'destructive', onPress: () => persist(entries.filter(e => e.id !== entry.id)) },
    ]);
  }

  const next = nextScheduled(entries);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.navTitle}>Träningsschema</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.nextCard}>
          <Ionicons name="alarm-outline" size={22} color={COLORS.accent} />
          <View style={{ flex: 1 }}>
            <Text style={s.nextLabel}>Nästa påminnelse</Text>
            <Text style={s.nextText}>
              {next
                ? `${fmtNext(next.date)}${next.entry.templateName ? ` – ${next.entry.templateName}` : ''}`
                : 'Inga påminnelser inlagda'}
            </Text>
          </View>
        </View>

        {entries.map(e => (
          <TouchableOpacity key={e.id} style={s.card} onPress={() => setEditing({ ...e })} activeOpacity={0.85}>
            <View style={{ flex: 1 }}>
              <Text style={[s.time, !e.enabled && s.dim]}>
                {pad(e.hour)}:{pad(e.minute)}
              </Text>
              <Text style={[s.days, !e.enabled && s.dim]}>{daysText(e.weekdays)}</Text>
              <Text style={[s.pass, !e.enabled && s.dim]} numberOfLines={1}>
                {e.templateName ?? 'Valfritt pass'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => remove(e)} hitSlop={10} style={s.trash}>
              <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
            <Switch
              value={e.enabled}
              onValueChange={v => persist(entries.map(x => (x.id === e.id ? { ...x, enabled: v } : x)))}
              trackColor={{ true: COLORS.accent, false: COLORS.border }}
              thumbColor="#fff"
            />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={s.addBtn} onPress={() => setEditing(newEntry())}>
          <Ionicons name="add-circle-outline" size={20} color={COLORS.accent} />
          <Text style={s.addText}>Lägg till påminnelse</Text>
        </TouchableOpacity>

        <Text style={s.hint}>
          Du får en notis på valda dagar och tider. Trycker du på notisen öppnas passet direkt.
        </Text>
      </ScrollView>

      <Modal visible={editing != null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        <SafeAreaProvider>
          <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setEditing(null)} hitSlop={10}>
                <Text style={s.cancel}>Avbryt</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>Påminnelse</Text>
              <TouchableOpacity onPress={saveEditing} hitSlop={10}>
                <Text style={s.save}>Spara</Text>
              </TouchableOpacity>
            </View>
            {editing && (
              <ScrollView contentContainerStyle={s.content}>
                <Text style={s.label}>TID</Text>
                <View style={s.timeRow}>
                  <Stepper
                    value={pad(editing.hour)}
                    onMinus={() => setEditing({ ...editing, hour: (editing.hour + 23) % 24 })}
                    onPlus={() => setEditing({ ...editing, hour: (editing.hour + 1) % 24 })}
                  />
                  <Text style={s.colon}>:</Text>
                  <Stepper
                    value={pad(editing.minute)}
                    onMinus={() => setEditing({ ...editing, minute: (editing.minute + 55) % 60 })}
                    onPlus={() => setEditing({ ...editing, minute: (editing.minute + 5) % 60 })}
                  />
                </View>

                <Text style={s.label}>DAGAR</Text>
                <View style={s.dayRow}>
                  {WEEKDAY_SHORT.map((d, i) => {
                    const wd = i + 1;
                    const on = editing.weekdays.includes(wd);
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[s.day, on && s.dayOn]}
                        onPress={() =>
                          setEditing({
                            ...editing,
                            weekdays: on ? editing.weekdays.filter(x => x !== wd) : [...editing.weekdays, wd],
                          })
                        }
                      >
                        <Text style={[s.dayText, on && s.dayTextOn]}>{d}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={s.label}>PASS</Text>
                <View style={s.passWrap}>
                  {[{ id: null, name: 'Valfritt pass' } as { id: number | null; name: string }, ...templates].map(t => {
                    const on = editing.templateId === t.id;
                    return (
                      <TouchableOpacity
                        key={String(t.id)}
                        style={[s.passChip, on && s.dayOn]}
                        onPress={() =>
                          setEditing({ ...editing, templateId: t.id, templateName: t.id ? t.name : null })
                        }
                      >
                        <Text style={[s.dayText, on && s.dayTextOn]}>{t.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
}

function Stepper({ value, onMinus, onPlus }: { value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={s.stepper}>
      <TouchableOpacity style={s.stepBtn} onPress={onPlus}>
        <Ionicons name="chevron-up" size={22} color={COLORS.text} />
      </TouchableOpacity>
      <Text style={s.stepValue}>{value}</Text>
      <TouchableOpacity style={s.stepBtn} onPress={onMinus}>
        <Ionicons name="chevron-down" size={22} color={COLORS.text} />
      </TouchableOpacity>
    </View>
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
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: { color: COLORS.text, fontWeight: '700', fontSize: 17 },
  content: { padding: 16, paddingBottom: 48 },

  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
  },
  nextLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  nextText: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginTop: 2 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 10,
  },
  time: { color: COLORS.text, fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  days: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginTop: 2 },
  pass: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  dim: { opacity: 0.45 },
  trash: { padding: 6 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.md,
    padding: 15,
    marginTop: 4,
  },
  addText: { color: COLORS.accent, fontWeight: '700', fontSize: 15 },
  hint: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, marginTop: 16, textAlign: 'center' },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  cancel: { fontSize: 16, color: COLORS.textMuted },
  save: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 10,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  colon: { color: COLORS.text, fontSize: 40, fontWeight: '800' },
  stepper: { alignItems: 'center' },
  stepBtn: {
    width: 64,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    color: COLORS.text,
    fontSize: 48,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginVertical: 4,
  },
  dayRow: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  dayOn: { backgroundColor: COLORS.accent },
  dayText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  dayTextOn: { color: '#fff' },
  passWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  passChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
  },
});
