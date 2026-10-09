import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

import { COLORS, RADIUS } from '../theme';
import { importTemplatesFromJson } from '../utils/importTemplates';

const EXAMPLE = `{
  "pass": [
    {
      "namn": "Pass A – Ben & säte",
      "övningar": [
        { "övning": "Goblet-knäböj", "set": 3, "reps": 10, "kg": 16, "vila": 90 },
        { "övning": "Musslan med miniband", "set": 2, "reps": 15 }
      ]
    }
  ]
}`;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ImportTemplatesModal({ visible, onClose }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleImport() {
    if (!text.trim()) {
      Alert.alert('Ingen text', 'Klistra in texten med dina pass först.');
      return;
    }
    setBusy(true);
    try {
      const r = await importTemplatesFromJson(text);
      const lines = [
        r.created.length ? `Nya pass: ${r.created.join(', ')}` : '',
        r.updated.length ? `Uppdaterade pass: ${r.updated.join(', ')}` : '',
        r.newExercises.length
          ? `Nya egna övningar (fanns inte i biblioteket): ${r.newExercises.join(', ')}`
          : '',
      ].filter(Boolean);
      Alert.alert('Import klar', lines.join('\n\n'));
      setText('');
      onClose();
    } catch (err) {
      Alert.alert('Kunde inte importera', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider>
        <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={s.header}>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Text style={s.cancel}>Avbryt</Text>
              </TouchableOpacity>
              <Text style={s.title}>Importera pass</Text>
              <TouchableOpacity onPress={handleImport} disabled={busy} hitSlop={10}>
                {busy ? <ActivityIndicator color={COLORS.accent} /> : <Text style={s.save}>Importera</Text>}
              </TouchableOpacity>
            </View>
            <View style={s.content}>
              <Text style={s.help}>
                Klistra in pass som du skrivit på datorn. Övningar hittas på namn – finns en övning inte
                skapas den som egen övning. Ett pass med samma namn som ett befintligt uppdateras.
              </Text>
              <TextInput
                style={s.input}
                value={text}
                onChangeText={setText}
                placeholder={EXAMPLE}
                placeholderTextColor={COLORS.textMuted}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="top"
              />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </SafeAreaProvider>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  cancel: { fontSize: 16, color: COLORS.textMuted },
  save: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
  content: { flex: 1, padding: 16, gap: 12 },
  help: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19 },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: 12,
  },
});
