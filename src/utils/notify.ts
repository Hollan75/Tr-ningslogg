import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const TIMER_CHANNEL = 'timer';
const REMINDER_CHANNEL = 'reminders';

// Show notifications (with sound) also when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(TIMER_CHANNEL, {
    name: 'Timer och vila',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 400, 200, 400, 200, 400],
  });
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: 'Träningspåminnelser',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

// ─── Timers (exercise countdown and rest) ────────────────────────────────────

// Schedules a "time is up" alert so it also rings when the app is in the background
export async function scheduleTimerAlert(seconds: number, title: string, body: string): Promise<string | null> {
  try {
    if (!(await ensureNotificationPermission())) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: TIMER_CHANNEL,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelAlert(id: string | null | undefined): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already delivered or removed
  }
}

// Rings right away (used when a timer ends while the app is open)
export async function ringNow(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: Platform.OS === 'android' ? { channelId: TIMER_CHANNEL } : null,
    });
  } catch {
    // notifications not allowed – vibration still happens
  }
}

// ─── Training schedule ───────────────────────────────────────────────────────

export interface ScheduleEntry {
  id: string;
  weekdays: number[]; // 1 = måndag … 7 = söndag
  hour: number;
  minute: number;
  templateId: number | null;
  templateName: string | null;
  enabled: boolean;
}

export const WEEKDAY_SHORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

// expo-notifications uses 1 = Sunday … 7 = Saturday
const toExpoWeekday = (mondayBased: number) => (mondayBased % 7) + 1;

// Replaces all scheduled training reminders with the given schedule
export async function applySchedule(entries: ScheduleEntry[]): Promise<number> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.kind === 'reminder') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
  const active = entries.filter(e => e.enabled && e.weekdays.length > 0);
  if (active.length === 0) return 0;
  if (!(await ensureNotificationPermission())) {
    throw new Error('Appen har inte tillåtelse att skicka notiser. Slå på det under Inställningar → Appar → Träningslogg.');
  }
  let count = 0;
  for (const e of active) {
    for (const wd of e.weekdays) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Dags att träna 💪',
          body: e.templateName ? `${e.templateName} står på schemat.` : 'Ditt träningspass står på schemat.',
          sound: 'default',
          data: { kind: 'reminder', templateId: e.templateId, templateName: e.templateName },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(wd),
          hour: e.hour,
          minute: e.minute,
          channelId: REMINDER_CHANNEL,
        },
      });
      count += 1;
    }
  }
  return count;
}

// Next upcoming occurrence of any enabled entry
export function nextScheduled(entries: ScheduleEntry[], from = new Date()): { date: Date; entry: ScheduleEntry } | null {
  let best: { date: Date; entry: ScheduleEntry } | null = null;
  for (const e of entries) {
    if (!e.enabled) continue;
    for (const wd of e.weekdays) {
      const d = new Date(from);
      const today = ((from.getDay() + 6) % 7) + 1; // 1 = Monday
      let add = (wd - today + 7) % 7;
      d.setHours(e.hour, e.minute, 0, 0);
      if (add === 0 && d <= from) add = 7;
      d.setDate(d.getDate() + add);
      if (!best || d < best.date) best = { date: d, entry: e };
    }
  }
  return best;
}
