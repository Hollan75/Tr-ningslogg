import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getActiveSession, startSession, cancelSession } from '../database';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// If an unfinished workout exists, ask whether to resume it or discard it.
// Resolves true when the caller may continue (no active session or it was discarded).
async function resolveActiveSession(nav: Nav): Promise<boolean> {
  const active = await getActiveSession();
  if (!active) return true;
  const activeName = active.template_name ?? 'Fritt pass';
  return new Promise(resolve => {
    Alert.alert(
      'Pågående pass',
      `Du har ett oavslutat pass (${activeName}, ${active.set_count ?? 0} set). Vad vill du göra?`,
      [
        { text: 'Avbryt', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Kasta det',
          style: 'destructive',
          onPress: async () => {
            await cancelSession(active.id);
            resolve(true);
          },
        },
        {
          text: 'Fortsätt det',
          onPress: () => {
            nav.navigate('ActiveWorkout', { sessionId: active.id, sessionName: activeName });
            resolve(false);
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

// Opens the workout without starting it – the user presses "Starta" inside
export async function openWorkout(nav: Nav, templateId: number | undefined, name: string) {
  if (!(await resolveActiveSession(nav))) return;
  nav.navigate('ActiveWorkout', { templateId, sessionName: name });
}

// Starts the workout immediately (the start button on a workout card)
export async function startWorkout(nav: Nav, templateId: number | undefined, name: string) {
  if (!(await resolveActiveSession(nav))) return;
  const sessionId = await startSession(templateId);
  nav.navigate('ActiveWorkout', { sessionId, sessionName: name });
}
