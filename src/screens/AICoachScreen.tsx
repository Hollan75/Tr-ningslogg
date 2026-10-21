import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { COLORS, RADIUS } from '../theme';
import { getSessions, getSessionSets, getAllExerciseNames } from '../database';
import { sendToClaude } from '../api/claude';
import type { ChatMessage } from '../api/claude';
import { PROFILES, PROFILE_NAMES } from '../data/profiles';
import type { WorkoutSession, SessionSet } from '../types';
import { importTemplatesFromJson } from '../utils/importTemplates';
import {
  loadConversations,
  saveConversation,
  deleteConversation,
  newConversation,
  loadMemories,
  saveMemories,
  addMemories,
  parseReply,
  titleFrom,
} from '../utils/coachStore';
import type { Conversation, CoachMessage } from '../utils/coachStore';

type SessionWithSets = WorkoutSession & { sets: SessionSet[] };

// "Bänkpress: 60kg×10, 60kg×8" per exercise so the coach can reason about progression
function summarizeSets(sets: SessionSet[]): string[] {
  const byExercise = new Map<string, string[]>();
  for (const set of sets) {
    const name = set.exercise_name ?? set.exercise_id;
    const entry = set.is_time
      ? `${set.weight_kg ? `${set.weight_kg}kg ` : ''}${set.reps ?? '?'}s`
      : set.weight_kg
      ? `${set.weight_kg}kg×${set.reps ?? '?'}`
      : `${set.reps ?? '?'} reps`;
    byExercise.set(name, [...(byExercise.get(name) ?? []), entry]);
  }
  return [...byExercise.entries()].map(([name, list]) => `${name}: ${list.join(', ')}`);
}

const FENCE = '```';
const PASS_EXAMPLE = `${FENCE}pass
{"pass":[{"namn":"Pass A – Ben & bål","övningar":[{"övning":"Goblet-knäböj","set":3,"reps":10,"kg":16,"vila":90},{"övning":"Plankan","set":3,"sek":30,"vila":45}]}]}
${FENCE}`;

function buildSystemPrompt(
  profileKey: string,
  history: SessionWithSets[],
  memories: string[],
  exerciseNames: string[]
): string {
  const profile = PROFILES[profileKey];

  const historyJson =
    history.length === 0
      ? 'Ingen träningshistorik tillgänglig ännu.'
      : JSON.stringify(
          history.map(s => ({
            datum: s.started_at.slice(0, 10),
            pass: s.template_name ?? 'Fritt pass',
            övningar: summarizeSets(s.sets),
            totalSet: s.sets.length,
            varaktighet: s.completed_at
              ? `${Math.round(
                  (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000
                )} min`
              : null,
          })),
          null,
          2
        );

  const injuryBlock = profile.injuries?.length
    ? `\nSkador/begränsningar:\n${profile.injuries.map(i => `- ${i}`).join('\n')}`
    : '';
  const focusBlock = profile.focusAreas?.length
    ? `\nFokusområden:\n${profile.focusAreas.map(f => `- ${f}`).join('\n')}`
    : '';
  const principlesBlock = profile.trainingPrinciples?.length
    ? `\nTräningsprinciper:\n${profile.trainingPrinciples.map(p => `- ${p}`).join('\n')}`
    : '';
  const instructionsBlock = profile.coachInstructions?.length
    ? `\nViktiga instruktioner för dig som coach:\n${profile.coachInstructions.map(c => `- ${c}`).join('\n')}`
    : '';
  const equipmentBlock = profile.equipment?.length
    ? `\nUtrustning: ${profile.equipment.join(', ')}`
    : '';

  return `Du är en personlig tränare och träningscoach.

Användarens profil:
- Namn: ${profile.name}
- Ålder: ${profile.age} år
- Kön: ${profile.gender}
- Mål: ${profile.goal}
- Erfarenhet: ${profile.experience}
- Träningsnivå: ${profile.fitnessLevel ?? ''}
- Pass per vecka: ${profile.daysPerWeek}${equipmentBlock}${injuryBlock}${focusBlock}${principlesBlock}${instructionsBlock}
- Övrigt: ${profile.notes}

Senaste träningshistorik (senaste ${history.length} pass):
${historyJson}

Det du minns om användaren från tidigare samtal:
${memories.length ? memories.map(m => `- ${m}`).join('\n') : '(inget ännu)'}

Svara alltid på svenska. Var konkret, uppmuntrande och personlig.
Anpassa ALLTID dina råd strikt efter profilen ovan – särskilt skador och begränsningar.

MINNE: Om användaren berättar något bestående som är värt att komma ihåg till nästa samtal (mål, besvär eller smärta, preferenser, vad som fungerar eller inte, utrustning, schema) – skriv en kort rad sist i svaret i formatet [MINNE: kort fakta]. En fakta per tagg. Upprepa inte sådant du redan minns. Användaren ser inte taggarna.

PASS: När du föreslår konkreta pass ska du ALLTID avsluta svaret med ett kodblock märkt "pass" i exakt detta JSON-format, så att användaren kan spara passen i appen med ett tryck:
${PASS_EXAMPLE}
Regler för kodblocket: använd övningsnamn exakt som i listan nedan när det finns en passande övning, "sek" i stället för "reps" för tidsövningar, "kg" bara när vikt används och "vila" i sekunder. Beskriv passen kort i texten, men skriv inte ut JSON någon annanstans.

Övningar som finns i appen:
${exerciseNames.join(', ')}`;
}

export default function AICoachScreen() {
  const navigation = useNavigation();
  const [profileKey, setProfileKey] = useState(PROFILE_NAMES[0]);
  const [conv, setConv] = useState<Conversation>(newConversation());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SessionWithSets[]>([]);
  const [memories, setMemories] = useState<string[]>([]);
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [savingPass, setSavingPass] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const convRef = useRef(conv);
  convRef.current = conv;
  const messages = conv.messages;

  useFocusEffect(
    useCallback(() => {
      loadHistory();
      getAllExerciseNames()
        .then(all =>
          setExerciseNames(
            all.filter(e => e.id.startsWith('se_') || e.id.startsWith('custom_')).map(e => e.name)
          )
        )
        .catch(() => undefined);
    }, [])
  );

  // Open the latest conversation and the memory for the chosen profile
  useEffect(() => {
    (async () => {
      const [list, mem] = await Promise.all([loadConversations(profileKey), loadMemories(profileKey)]);
      setConversations(list);
      setMemories(mem);
      setConv(list[0] ?? newConversation());
    })().catch(() => undefined);
  }, [profileKey]);

  async function loadHistory() {
    const sessions = await getSessions();
    const recent = sessions.slice(0, 10);
    const withSets = await Promise.all(
      recent.map(async s => ({ ...s, sets: await getSessionSets(s.id) }))
    );
    setHistory(withSets);
  }

  function switchProfile(key: string) {
    if (key === profileKey || loading) return;
    setProfileKey(key);
  }

  async function persist(next: Conversation) {
    setConv(next);
    if (next.messages.length === 0) return;
    await saveConversation(profileKey, next);
    setConversations(await loadConversations(profileKey));
  }

  function startNew() {
    if (loading) return;
    setConv(newConversation());
    setShowHistory(false);
  }

  async function send(content: string) {
    const text = content.trim();
    if (!text || loading) return;

    const base = convRef.current;
    const userMsg: CoachMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    const withUser: Conversation = {
      ...base,
      title: base.messages.length === 0 ? titleFrom(text) : base.title,
      updatedAt: new Date().toISOString(),
      messages: [...base.messages, userMsg],
    };
    setInput('');
    setLoading(true);
    await persist(withUser).catch(() => undefined);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const apiMsgs: ChatMessage[] = withUser.messages.map(m => ({ role: m.role, content: m.content }));
      const reply = await sendToClaude(
        apiMsgs,
        buildSystemPrompt(profileKey, history, memories, exerciseNames)
      );
      const parsed = parseReply(reply);
      if (parsed.memories.length) setMemories(await addMemories(profileKey, parsed.memories));
      const assistantMsg: CoachMessage = { id: `a-${Date.now()}`, role: 'assistant', content: reply };
      await persist({
        ...withUser,
        updatedAt: new Date().toISOString(),
        messages: [...withUser.messages, assistantMsg],
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err) {
      Alert.alert('Fel', err instanceof Error ? err.message : 'Något gick fel');
    } finally {
      setLoading(false);
    }
  }

  async function savePass(msg: CoachMessage, json: string, names: string[]) {
    setSavingPass(msg.id + json.length);
    try {
      const res = await importTemplatesFromJson(json);
      const cur = convRef.current;
      await persist({
        ...cur,
        messages: cur.messages.map(m =>
          m.id === msg.id ? { ...m, savedPasses: [...(m.savedPasses ?? []), ...names] } : m
        ),
      });
      const lines = [
        res.created.length ? `Nya pass: ${res.created.join(', ')}` : '',
        res.updated.length ? `Uppdaterade (samma namn fanns): ${res.updated.join(', ')}` : '',
        res.newExercises.length ? `Nya egna övningar: ${res.newExercises.join(', ')}` : '',
      ].filter(Boolean);
      Alert.alert('Sparat', `${lines.join('\n\n')}\n\nDu hittar passen under Träna → Mina pass.`, [
        { text: 'OK' },
        { text: 'Visa pass', onPress: () => navigation.navigate('WorkoutTab' as never) },
      ]);
    } catch (err) {
      Alert.alert('Kunde inte spara passet', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingPass(null);
    }
  }

  function confirmDeleteConversation(c: Conversation) {
    Alert.alert('Ta bort konversation', `"${c.title}"`, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: async () => {
          await deleteConversation(profileKey, c.id);
          setConversations(await loadConversations(profileKey));
          if (c.id === convRef.current.id) setConv(newConversation());
        },
      },
    ]);
  }

  async function removeMemory(idx: number) {
    const next = memories.filter((_, i) => i !== idx);
    setMemories(next);
    await saveMemories(profileKey, next);
  }

  function clearMemory() {
    Alert.alert('Rensa minnet', 'Coachen glömmer allt den har sparat om dig. Konversationerna finns kvar.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Rensa',
        style: 'destructive',
        onPress: async () => {
          setMemories([]);
          await saveMemories(profileKey, []);
        },
      },
    ]);
  }

  function handleSuggestProgram() {
    const p = PROFILES[profileKey];
    send(
      `Föreslå ett ${p.daysPerWeek}-dagars träningsprogram per vecka anpassat till min profil ` +
        `och mina senaste pass. Presentera det strukturerat med dagar, övningar, set och reps.`
    );
  }

  const profile = PROFILES[profileKey];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>AI Coach</Text>
          <View style={s.actions}>
            <TouchableOpacity style={s.actionBtn} onPress={startNew} disabled={loading}>
              <Ionicons name="add" size={15} color={COLORS.accent} />
              <Text style={s.actionText}>Ny</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => setShowHistory(true)}>
              <Ionicons name="chatbubbles-outline" size={14} color={COLORS.accent} />
              <Text style={s.actionText}>Samtal{conversations.length ? ` (${conversations.length})` : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => setShowMemory(true)}>
              <Ionicons name="bulb-outline" size={14} color={COLORS.accent} />
              <Text style={s.actionText}>Minne{memories.length ? ` (${memories.length})` : ''}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.profileToggle}>
          {PROFILE_NAMES.map(key => (
            <TouchableOpacity
              key={key}
              style={[s.profileBtn, profileKey === key && s.profileBtnActive]}
              onPress={() => switchProfile(key)}
            >
              <Text style={[s.profileBtnText, profileKey === key && s.profileBtnTextActive]}>
                {key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {/* ── Messages ── */}
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Empty state */}
          {messages.length === 0 && (
            <View style={s.welcome}>
              <Text style={s.welcomeAvatar}>🤖</Text>
              <Text style={s.welcomeTitle}>Hej {profile.name}!</Text>
              <Text style={s.welcomeBody}>
                Jag är din AI-baserade personliga tränare. Jag känner till din profil och dina
                senaste {history.length} pass. Vad kan jag hjälpa dig med?
              </Text>
              <TouchableOpacity
                style={s.suggestBigBtn}
                onPress={handleSuggestProgram}
                disabled={loading}
              >
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={s.suggestBigText}>Föreslå träningsprogram</Text>
              </TouchableOpacity>
              {/* Quick prompts */}
              <View style={s.quickRow}>
                {[
                  'Hur återhämtar jag mig bäst?',
                  'Tips för progression',
                  'Vad bör jag prioritera?',
                ].map(q => (
                  <TouchableOpacity key={q} style={s.quickChip} onPress={() => send(q)}>
                    <Text style={s.quickChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Chat bubbles */}
          {messages.map(msg => {
            const parsed = msg.role === 'assistant' ? parseReply(msg.content) : null;
            return (
            <View key={msg.id}>
            <View style={[s.row, msg.role === 'user' ? s.rowUser : s.rowAI]}>
              {msg.role === 'assistant' && (
                <View style={s.avatar}>
                  <Text style={s.avatarText}>PT</Text>
                </View>
              )}
              <View
                style={[
                  s.bubble,
                  msg.role === 'user' ? s.bubbleUser : s.bubbleAI,
                ]}
              >
                <Text style={[s.bubbleText, msg.role === 'user' && s.bubbleTextUser]}>
                  {parsed ? parsed.text : msg.content}
                </Text>
              </View>
            </View>
            {parsed?.passes.map((p, i) => {
              const saved = p.names.length > 0 && p.names.every(n => msg.savedPasses?.includes(n));
              const busy = savingPass === msg.id + p.json.length;
              return (
                <View key={i} style={s.passCard}>
                  <View style={s.passHead}>
                    <Ionicons name="clipboard-outline" size={16} color={COLORS.accent} />
                    <Text style={s.passTitle}>
                      {p.names.length === 1 ? 'Föreslaget pass' : `${p.names.length} föreslagna pass`}
                    </Text>
                  </View>
                  {p.error ? (
                    <Text style={s.passError}>{p.error}</Text>
                  ) : (
                    p.names.map(n => (
                      <Text key={n} style={s.passName}>• {n}</Text>
                    ))
                  )}
                  {!p.error && (
                    <TouchableOpacity
                      style={[s.passBtn, saved && s.passBtnDone]}
                      onPress={() => savePass(msg, p.json, p.names)}
                      disabled={busy}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name={saved ? 'checkmark' : 'download-outline'} size={16} color="#fff" />
                      )}
                      <Text style={s.passBtnText}>{saved ? 'Sparat – spara igen' : 'Spara i Mina pass'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            </View>
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <View style={[s.row, s.rowAI]}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>PT</Text>
              </View>
              <View style={[s.bubble, s.bubbleAI, s.typingBubble]}>
                <ActivityIndicator size="small" color={COLORS.textMuted} />
                <Text style={s.typingText}>Skriver…</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Input bar ── */}
        <View style={s.inputBar}>
          {messages.length > 0 && (
            <TouchableOpacity
              style={s.sparkleBtn}
              onPress={handleSuggestProgram}
              disabled={loading}
            >
              <Ionicons
                name="sparkles-outline"
                size={20}
                color={loading ? COLORS.textMuted : COLORS.accent}
              />
            </TouchableOpacity>
          )}
          <TextInput
            style={s.textInput}
            placeholder="Skriv ett meddelande…"
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnOff]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={17} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistory(false)}>
        <SafeAreaProvider>
          <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Tidigare samtal</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowHistory(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <TouchableOpacity style={s.newConvBtn} onPress={startNew}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={s.newConvText}>Ny konversation</Text>
              </TouchableOpacity>
              {conversations.length === 0 && <Text style={s.emptyText}>Inga sparade samtal ännu.</Text>}
              {conversations.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.listRow, c.id === conv.id && s.listRowActive]}
                  onPress={() => {
                    setConv(c);
                    setShowHistory(false);
                    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 150);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle} numberOfLines={1}>{c.title}</Text>
                    <Text style={s.listSub}>
                      {new Date(c.updatedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                      {' · '}
                      {c.messages.length} meddelanden
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => confirmDeleteConversation(c)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      <Modal visible={showMemory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowMemory(false)}>
        <SafeAreaProvider>
          <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Coachen minns</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowMemory(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={s.memoryIntro}>
                Saker du berättat som coachen tar med till nästa samtal. Ta bort det som inte stämmer längre.
              </Text>
              {memories.length === 0 && (
                <Text style={s.emptyText}>
                  Inget ännu. Berätta t.ex. om besvär, mål eller vad som fungerar så sparas det här.
                </Text>
              )}
              {memories.map((m, i) => (
                <View key={`${i}-${m}`} style={s.listRow}>
                  <Text style={[s.listTitle, { flex: 1, fontWeight: '400' }]}>{m}</Text>
                  <TouchableOpacity onPress={() => removeMemory(i)} hitSlop={8}>
                    <Ionicons name="close-circle-outline" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
              {memories.length > 0 && (
                <TouchableOpacity style={s.clearBtn} onPress={clearMemory}>
                  <Text style={s.clearText}>Rensa hela minnet</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: -0.4 },
  sub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 6 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actionText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },

  passCard: {
    marginLeft: 38,
    marginBottom: 14,
    marginTop: -4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 4,
    maxWidth: '85%',
  },
  passHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  passTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  passName: { color: COLORS.text, fontSize: 13 },
  passError: { color: COLORS.danger, fontSize: 13 },
  passBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingVertical: 9,
  },
  passBtnDone: { backgroundColor: COLORS.green },
  passBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newConvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 14,
  },
  newConvText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 8,
  },
  listRowActive: { borderWidth: 1, borderColor: COLORS.accentBorder },
  listTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  listSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  memoryIntro: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  clearBtn: { alignItems: 'center', padding: 14, marginTop: 8 },
  clearText: { color: COLORS.danger, fontWeight: '600', fontSize: 14 },

  profileToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  profileBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  profileBtnActive: { backgroundColor: COLORS.accent },
  profileBtnText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  profileBtnTextActive: { color: '#fff', fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 8 },

  welcome: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 8 },
  welcomeAvatar: { fontSize: 56, marginBottom: 12 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  welcomeBody: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  suggestBigBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 20,
  },
  suggestBigText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  quickRow: { gap: 8, width: '100%' },
  quickChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 10,
  },
  quickChipText: { color: COLORS.text, fontSize: 13 },

  row: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  rowUser: { justifyContent: 'flex-end' },
  rowAI: { justifyContent: 'flex-start' },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  avatarText: { color: COLORS.accent, fontSize: 10, fontWeight: '700' },

  bubble: {
    maxWidth: '80%',
    borderRadius: RADIUS.md,
    padding: 12,
  },
  bubbleUser: {
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },

  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  typingText: { color: COLORS.textMuted, fontSize: 13 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  sparkleBtn: { padding: 6, marginBottom: 4 },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: COLORS.accent,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendBtnOff: { backgroundColor: COLORS.accentBorder, opacity: 0.5 },
});
