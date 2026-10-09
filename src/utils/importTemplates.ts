import {
  getAllExerciseNames,
  getTemplates,
  saveTemplate,
  insertExercise,
} from '../database';
import type { TemplateExerciseInput } from '../database';

// Format (see pass/README.md):
// { "pass": [ { "namn": "Pass A", "övningar": [ { "övning": "Goblet-knäböj", "set": 3, "reps": 10, "kg": 16, "vila": 90 } ] } ] }

export interface ImportResult {
  created: string[];
  updated: string[];
  newExercises: string[];
}

const norm = (s: string) => s.trim().toLocaleLowerCase('sv-SE').replace(/\s+/g, ' ');

function pick(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (obj[k] !== undefined) return obj[k];
  return undefined;
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

export async function importTemplatesFromJson(text: string): Promise<ImportResult> {
  let data: unknown;
  try {
    // Tolerate text pasted from mail/notes with smart quotes
    data = JSON.parse(text.trim().replace(/[“”]/g, '"').replace(/[‘’]/g, "'"));
  } catch {
    throw new Error('Texten är inte giltig JSON. Kontrollera att allt kopierades med.');
  }

  const root = data as Record<string, unknown>;
  const list = Array.isArray(data) ? data : pick(root, 'pass', 'templates', 'workouts');
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Hittade inga pass. Texten ska innehålla "pass": [ ... ].');
  }

  // Lookup by id or name (Swedish library first, then custom, then English)
  const all = await getAllExerciseNames();
  const rank = (id: string) => (id.startsWith('se_') ? 0 : id.startsWith('custom_') ? 1 : 2);
  const byName = new Map<string, string>();
  const ids = new Set(all.map(e => e.id));
  for (const e of [...all].sort((a, b) => rank(b.id) - rank(a.id))) byName.set(norm(e.name), e.id);

  const existing = await getTemplates();
  const result: ImportResult = { created: [], updated: [], newExercises: [] };

  for (const [i, raw] of list.entries()) {
    const p = (raw ?? {}) as Record<string, unknown>;
    const name = String(pick(p, 'namn', 'name') ?? '').trim();
    const exs = pick(p, 'övningar', 'ovningar', 'exercises');
    if (!name) throw new Error(`Pass nr ${i + 1} saknar "namn".`);
    if (!Array.isArray(exs) || exs.length === 0) throw new Error(`"${name}" saknar "övningar".`);

    const inputs: TemplateExerciseInput[] = [];
    for (const rawEx of exs) {
      const e = (typeof rawEx === 'string' ? { övning: rawEx } : rawEx ?? {}) as Record<string, unknown>;
      const exName = String(pick(e, 'övning', 'ovning', 'exercise', 'id') ?? '').trim();
      if (!exName) throw new Error(`En övning i "${name}" saknar namn.`);

      let exerciseId = ids.has(exName) ? exName : byName.get(norm(exName));
      if (!exerciseId) {
        // Unknown exercise → create it as a custom exercise
        exerciseId = `custom_${Date.now()}_${result.newExercises.length}`;
        await insertExercise({
          id: exerciseId,
          name: exName,
          category: 'custom',
          primaryMuscles: '[]',
          secondaryMuscles: '[]',
          equipment: null,
          bodyPart: null,
          gifUrl: null,
          instructions: e.instruktioner ? String(e.instruktioner) : null,
          difficulty: null,
        });
        byName.set(norm(exName), exerciseId);
        ids.add(exerciseId);
        result.newExercises.push(exName);
      }

      // "sek" makes it a timed exercise; otherwise the exercise's own default applies
      const seconds = pick(e, 'sek', 'sekunder', 'seconds');
      inputs.push({
        exerciseId,
        mode: seconds !== undefined ? 'time' : pick(e, 'reps') !== undefined ? 'reps' : undefined,
        sets: Math.max(1, Math.round(num(pick(e, 'set', 'sets'), 3))),
        reps: Math.max(1, Math.round(num(seconds ?? pick(e, 'reps'), seconds !== undefined ? 30 : 10))),
        weightKg: Math.max(0, num(pick(e, 'kg', 'vikt', 'weight'), 0)),
        restSeconds: Math.max(0, Math.round(num(pick(e, 'vila', 'rest'), 90))),
      });
    }

    // Same name as an existing pass → update it instead of creating a duplicate
    const match = existing.find(t => norm(t.name) === norm(name));
    await saveTemplate(match?.id ?? null, name, inputs);
    (match ? result.updated : result.created).push(name);
  }

  return result;
}
