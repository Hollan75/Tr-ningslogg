import { getSetting, setSetting } from '../database';
import { applySchedule } from './notify';
import type { ScheduleEntry } from './notify';

const KEY = 'training_schedule';

export async function loadSchedule(): Promise<ScheduleEntry[]> {
  try {
    const raw = await getSetting(KEY);
    return raw ? (JSON.parse(raw) as ScheduleEntry[]) : [];
  } catch {
    return [];
  }
}

// Saves the schedule and re-creates the weekly reminder notifications
export async function saveSchedule(entries: ScheduleEntry[]): Promise<void> {
  await setSetting(KEY, JSON.stringify(entries));
  await applySchedule(entries);
}
