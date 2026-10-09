import type { SessionSet } from '../types';

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtRelativeDate(iso: string): string {
  const days = Math.floor(
    (new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000
  );
  if (days <= 0) return 'Idag';
  if (days === 1) return 'Igår';
  if (days < 7) return `${days} dagar sedan`;
  return fmtDate(iso);
}

export function fmtKg(kg: number | null | undefined): string {
  if (kg == null) return '—';
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1).replace(/\.0$/, '')}`;
}

// "40 kg × 10" / "× 10" when no weight
export function fmtSet(set: Pick<SessionSet, 'reps' | 'weight_kg'>): string {
  const reps = set.reps ?? '—';
  if (!set.weight_kg) return `${reps} reps`;
  return `${fmtKg(set.weight_kg)} kg × ${reps}`;
}

export function parseNum(v: string): number | null {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function parseMuscles(json: string | null): string[] {
  try {
    const arr = JSON.parse(json ?? '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function durationMin(start: string, end: string): string {
  const m = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (m < 1) return '< 1 min';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
