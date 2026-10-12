import { getSetting, setSetting } from '../database';

const KEY = 'rest_settings';

export interface RestSettings {
  enabled: boolean; // show the rest timer after each logged set
  alert: boolean; // notification + sound + vibration when the rest is over
  seconds: number; // rest time used for every exercise…
  useTemplateRest: boolean; // …unless the per-exercise rest from the template should be used
}

export const DEFAULT_REST_SETTINGS: RestSettings = {
  enabled: true,
  alert: true,
  seconds: 60,
  useTemplateRest: false,
};

export const REST_CHOICES = [30, 45, 60, 75, 90, 120, 150, 180];

export async function loadRestSettings(): Promise<RestSettings> {
  try {
    const raw = await getSetting(KEY);
    return raw ? { ...DEFAULT_REST_SETTINGS, ...(JSON.parse(raw) as Partial<RestSettings>) } : DEFAULT_REST_SETTINGS;
  } catch {
    return DEFAULT_REST_SETTINGS;
  }
}

export async function saveRestSettings(settings: RestSettings): Promise<void> {
  await setSetting(KEY, JSON.stringify(settings));
}

export function fmtRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} s`;
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')} min`;
}
