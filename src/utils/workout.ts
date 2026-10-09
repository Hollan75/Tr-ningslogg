import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getActiveSession, startSession, cancelSession } from '../database';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Starts a workout, but first offers to resume an unfinished one so no logged sets are lost
export async function startWorkout(nav: Nav, templateId: number | undefined, name: string) {
  const active = await getActiveSession();
  const begin = async () => {
    const sessionId = await startSession(templateId);
    nav.navigate('ActiveWorkout', { sessionId, sessionName: name });
  };
  if (!active) return begin();

  const activeName = active.template_name ?? 'Fritt pass';
  Alert.alert(
    'Pågående pass',
    `Du har ett oavslutat pass (${activeName}, ${active.set_count ?? 0} set). Vad vill du göra?`,
    [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Kasta det & starta nytt',
        style: 'destructive',
        onPress: async () => {
          await cancelSession(active.id);
          await begin();
        },
      },
      {
        text: 'Fortsätt det',
        onPress: () =>
          nav.navigate('ActiveWorkout', { sessionId: active.id, sessionName: activeName }),
      },
    ]
  );
}
