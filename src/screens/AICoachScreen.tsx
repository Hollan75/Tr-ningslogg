import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS, RADIUS } from '../theme';
import { getSessions, getSessionSets } from '../database';
import { sendToClaude } from '../api/claude';
import type { ChatMessage } from '../api/claude';
import { PROFILES, PROFILE_NAMES } from '../data/profiles';
import type { WorkoutSession, SessionSet } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type SessionWithSets = WorkoutSession & { sets: SessionSet[] };

function buildSystemPrompt(profileKey: string, history: SessionWithSets[]): string {
  const profile = PROFILES[profileKey];

  const historyJson =
    history.length === 0
      ? 'Ingen träningshistorik tillgänglig ännu.'
      : JSON.stringify(
          history.map(s => ({
            datum: s.started_at.slice(0, 10),
            pass: s.template_name ?? 'Fritt pass',
            övningar: [...new Set(s.sets.map(set => set.exercise_name))].filter(Boolean),
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

Svara alltid på svenska. Var konkret, uppmuntrande och personlig.
Anpassa ALLTID dina råd strikt efter profilen ovan – särskilt skador och begränsningar.`;
}

export default function AICoachScreen() {
  const [profileKey, setProfileKey] = useState(PROFILE_NAMES[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SessionWithSets[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  async function loadHistory() {
    const sessions = await getSessions();
    const recent = sessions.slice(0, 10);
    const withSets = await Promise.all(
      recent.map(async s => ({ ...s, sets: await getSessionSets(s.id) }))
    );
    setHistory(withSets);
  }

  function switchProfile(key: string) {
    if (key === profileKey) return;
    setProfileKey(key);
    setMessages([]);
  }

  async function send(content: string) {
    const text = content.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const apiMsgs: ChatMessage[] = next.map(m => ({ role: m.role, content: m.content }));
      const reply = await sendToClaude(apiMsgs, buildSystemPrompt(profileKey, history));
      const assistantMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', content: reply };
      setMessages(prev => [...prev, assistantMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err) {
      Alert.alert('Fel', err instanceof Error ? err.message : 'Något gick fel');
    } finally {
      setLoading(false);
    }
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
        <View>
          <Text style={s.title}>AI Coach</Text>
          <Text style={s.sub}>Personlig tränare · {profile.goal}</Text>
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
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
          {messages.map(msg => (
            <View
              key={msg.id}
              style={[s.row, msg.role === 'user' ? s.rowUser : s.rowAI]}
            >
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
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}

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
