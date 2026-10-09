import * as SQLite from 'expo-sqlite';
import type {
  Exercise,
  WorkoutTemplate,
  TemplateExercise,
  WorkoutSession,
  SessionSet,
} from '../types';
import { MUSCLE_GROUPS } from '../data/groups';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('traningslogg.db');
  await setupSchema(_db);
  return _db;
}

async function setupSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      primaryMuscles TEXT,
      secondaryMuscles TEXT,
      equipment TEXT,
      bodyPart TEXT,
      gifUrl TEXT,
      instructions TEXT,
      difficulty TEXT
    );
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
    CREATE INDEX IF NOT EXISTS idx_exercises_body_part ON exercises(bodyPart);
  `);

  // Migration: add difficulty column if missing in older databases.
  // Use try/catch instead of PRAGMA table_info to avoid bridge serialization issues.
  try {
    await db.execAsync('ALTER TABLE exercises ADD COLUMN difficulty TEXT');
  } catch {
    // Column already exists – expected on all runs except the very first after upgrade
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS template_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      exercise_id TEXT NOT NULL,
      sets INTEGER NOT NULL DEFAULT 3,
      reps_min INTEGER NOT NULL DEFAULT 8,
      reps_max INTEGER NOT NULL DEFAULT 12,
      rest_seconds INTEGER NOT NULL DEFAULT 60,
      order_index INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );
  `);

  try {
    await db.execAsync('ALTER TABLE template_exercises ADD COLUMN weight_kg REAL DEFAULT 0');
  } catch {
    // Column already exists
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      notes TEXT,
      FOREIGN KEY (template_id) REFERENCES workout_templates(id)
    );
  `);

  // Migration: session name (kept even if the template is deleted later)
  try {
    await db.execAsync('ALTER TABLE workout_sessions ADD COLUMN name TEXT');
    await db.execAsync(`
      UPDATE workout_sessions
      SET name = (SELECT name FROM workout_templates WHERE id = workout_sessions.template_id)
      WHERE template_id IS NOT NULL
    `);
  } catch {
    // Column already exists
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS session_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      exercise_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER,
      weight_kg REAL,
      completed_at TEXT,
      is_warmup INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_session_sets_exercise ON session_sets(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_session_sets_session ON session_sets(session_id);
  `);

  // Migration: older templates were saved with rest_seconds = 0 (no rest timer).
  const restMigrated = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'migration_rest_default'"
  );
  if (!restMigrated) {
    await db.execAsync(`
      UPDATE template_exercises SET rest_seconds = 90 WHERE rest_seconds = 0;
      INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_rest_default', 'done');
    `);
  }
}

// ─── SETTINGS ───────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
}

// ─── EXERCISES ──────────────────────────────────────────────────────────────

// replace = true updates existing rows (used for the curated Swedish library)
export async function insertExercisesBatch(exercises: Exercise[], replace = false): Promise<void> {
  const db = await getDb();
  await db.execAsync('BEGIN');
  try {
    for (const ex of exercises) {
      await db.runAsync(
        `INSERT OR ${replace ? 'REPLACE' : 'IGNORE'} INTO exercises
         (id, name, category, primaryMuscles, secondaryMuscles, equipment, bodyPart, gifUrl, instructions, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(ex.id),
          String(ex.name),
          ex.category != null ? String(ex.category) : null,
          ex.primaryMuscles != null ? String(ex.primaryMuscles) : '[]',
          ex.secondaryMuscles != null ? String(ex.secondaryMuscles) : '[]',
          ex.equipment != null ? String(ex.equipment) : null,
          ex.bodyPart != null ? String(ex.bodyPart) : null,
          ex.gifUrl != null ? String(ex.gifUrl) : null,
          ex.instructions != null ? String(ex.instructions) : null,
          ex.difficulty != null ? String(ex.difficulty) : null,
        ]
      );
    }
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

// 'sv' = Swedish library + own exercises, 'all' = everything incl. the English library
export type ExerciseLibrary = 'sv' | 'all' | 'custom';

function libraryCondition(library: ExerciseLibrary): string | null {
  if (library === 'sv') return "(id LIKE 'se_%' OR id LIKE 'custom_%')";
  if (library === 'custom') return "id LIKE 'custom_%'";
  return null;
}

export async function getExercises(
  search?: string,
  bodyPart?: string,
  equipment?: string,
  library: ExerciseLibrary = 'all'
): Promise<Exercise[]> {
  const db = await getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search && search.trim()) {
    conditions.push('(LOWER(name) LIKE ? OR LOWER(primaryMuscles) LIKE ?)');
    const q = `%${search.toLowerCase().trim()}%`;
    params.push(q, q);
  }
  if (bodyPart) {
    conditions.push('bodyPart = ?');
    params.push(bodyPart);
  }
  if (equipment) {
    conditions.push('equipment = ?');
    params.push(equipment);
  }
  const lib = libraryCondition(library);
  if (lib) conditions.push(lib);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.getAllAsync<Exercise>(
    `SELECT * FROM exercises ${where} ORDER BY name ASC LIMIT 200`,
    params
  );
}

// Exercises used most recently in workouts or templates, plus custom exercises
export async function getRecentExercises(
  limit = 15,
  library: ExerciseLibrary = 'all'
): Promise<Exercise[]> {
  const db = await getDb();
  const lib = libraryCondition(library);
  return db.getAllAsync<Exercise>(
    `SELECT e.* FROM exercises e
     LEFT JOIN (
       SELECT exercise_id, MAX(completed_at) as last FROM session_sets GROUP BY exercise_id
     ) u ON u.exercise_id = e.id
     WHERE (u.last IS NOT NULL
        OR e.id LIKE 'custom_%'
        OR e.id IN (SELECT exercise_id FROM template_exercises))
       ${lib ? `AND ${lib.replace(/\bid\b/g, 'e.id')}` : ''}
     ORDER BY u.last IS NULL, u.last DESC, e.name
     LIMIT ?`,
    [limit]
  );
}

export async function getCustomExercises(): Promise<Exercise[]> {
  const db = await getDb();
  return db.getAllAsync<Exercise>("SELECT * FROM exercises WHERE id LIKE 'custom_%'");
}

export async function updateExerciseGroup(
  id: string,
  bodyPart: string | null,
  equipment: string | null
): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE exercises SET bodyPart = ?, equipment = ? WHERE id = ?', [
    bodyPart,
    equipment,
    id,
  ]);
}

export async function getAllExerciseNames(): Promise<{ id: string; name: string }[]> {
  const db = await getDb();
  return db.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM exercises');
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const db = await getDb();
  return db.getFirstAsync<Exercise>('SELECT * FROM exercises WHERE id = ?', [id]);
}

export async function getBodyParts(library: ExerciseLibrary = 'all'): Promise<string[]> {
  const db = await getDb();
  const lib = libraryCondition(library);
  const rows = await db.getAllAsync<{ bodyPart: string }>(
    `SELECT DISTINCT bodyPart FROM exercises
     WHERE bodyPart IS NOT NULL AND bodyPart != '' ${lib ? `AND ${lib}` : ''}
     ORDER BY bodyPart`
  );
  const order = (g: string) => {
    const i = MUSCLE_GROUPS.indexOf(g);
    return i === -1 ? MUSCLE_GROUPS.length : i;
  };
  return rows.map(r => r.bodyPart).sort((a, b) => order(a) - order(b) || a.localeCompare(b, 'sv'));
}

export async function getEquipment(library: ExerciseLibrary = 'all'): Promise<string[]> {
  const db = await getDb();
  const lib = libraryCondition(library);
  const rows = await db.getAllAsync<{ equipment: string }>(
    `SELECT DISTINCT equipment FROM exercises
     WHERE equipment IS NOT NULL AND equipment != '' ${lib ? `AND ${lib}` : ''}
     ORDER BY equipment`
  );
  return rows.map(r => r.equipment);
}

export async function getExerciseCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises'
  );
  return row?.count ?? 0;
}

export async function insertExercise(exercise: Exercise): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO exercises
     (id, name, category, primaryMuscles, secondaryMuscles, equipment, bodyPart, gifUrl, instructions, difficulty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(exercise.id),
      String(exercise.name),
      exercise.category != null ? String(exercise.category) : null,
      exercise.primaryMuscles != null ? String(exercise.primaryMuscles) : '[]',
      exercise.secondaryMuscles != null ? String(exercise.secondaryMuscles) : '[]',
      exercise.equipment != null ? String(exercise.equipment) : null,
      exercise.bodyPart != null ? String(exercise.bodyPart) : null,
      exercise.gifUrl != null ? String(exercise.gifUrl) : null,
      exercise.instructions != null ? String(exercise.instructions) : null,
      exercise.difficulty != null ? String(exercise.difficulty) : null,
    ]
  );
}

export async function isExerciseInUse(id: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT
       (SELECT COUNT(*) FROM template_exercises WHERE exercise_id = ?) +
       (SELECT COUNT(*) FROM session_sets WHERE exercise_id = ?) as n`,
    [id, id]
  );
  return (row?.n ?? 0) > 0;
}

export async function deleteExercise(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
}

export async function clearExercises(): Promise<void> {
  const db = await getDb();
  // Only delete built-in exercises that are not referenced by any template or session.
  // Deleting referenced rows would violate FK constraints; custom exercises are always kept.
  await db.runAsync(`
    DELETE FROM exercises
    WHERE id NOT LIKE 'custom_%'
      AND id NOT IN (SELECT exercise_id FROM template_exercises)
      AND id NOT IN (SELECT exercise_id FROM session_sets)
  `);
}

// ─── WORKOUT TEMPLATES ──────────────────────────────────────────────────────

export async function getTemplates(): Promise<WorkoutTemplate[]> {
  const db = await getDb();
  return db.getAllAsync<WorkoutTemplate>(
    `SELECT wt.*,
       (SELECT COUNT(*) FROM template_exercises WHERE template_id = wt.id) as exercise_count,
       (SELECT GROUP_CONCAT(name, ', ') FROM (
          SELECT e.name FROM template_exercises te
          JOIN exercises e ON e.id = te.exercise_id
          WHERE te.template_id = wt.id ORDER BY te.order_index
        )) as exercise_names,
       (SELECT MAX(started_at) FROM workout_sessions
        WHERE template_id = wt.id AND completed_at IS NOT NULL) as last_used
     FROM workout_templates wt
     ORDER BY created_at DESC`
  );
}

export async function getTemplateById(id: number): Promise<WorkoutTemplate | null> {
  const db = await getDb();
  return db.getFirstAsync<WorkoutTemplate>('SELECT * FROM workout_templates WHERE id = ?', [id]);
}

export interface TemplateExerciseInput {
  exerciseId: string;
  sets: number;
  reps: number;
  weightKg: number;
  restSeconds: number;
}

// Saves name and the full exercise list in one transaction. Returns the template id.
export async function saveTemplate(
  templateId: number | null,
  name: string,
  exercises: TemplateExerciseInput[]
): Promise<number> {
  const db = await getDb();
  await db.execAsync('BEGIN');
  try {
    let id = templateId;
    if (id) {
      await db.runAsync('UPDATE workout_templates SET name = ? WHERE id = ?', [name, id]);
      await db.runAsync('DELETE FROM template_exercises WHERE template_id = ?', [id]);
    } else {
      const result = await db.runAsync(
        'INSERT INTO workout_templates (name, created_at) VALUES (?, ?)',
        [name, new Date().toISOString()]
      );
      id = result.lastInsertRowId;
    }
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      await db.runAsync(
        `INSERT INTO template_exercises
         (template_id, exercise_id, sets, reps_min, reps_max, rest_seconds, order_index, weight_kg)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ex.exerciseId, ex.sets, ex.reps, ex.reps, ex.restSeconds, i, ex.weightKg]
      );
    }
    await db.execAsync('COMMIT');
    return id;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function createTemplate(name: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO workout_templates (name, created_at) VALUES (?, ?)',
    [name, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function renameTemplate(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE workout_templates SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteTemplate(id: number): Promise<void> {
  const db = await getDb();
  // Sessions reference the template (FK without cascade). Keep the history by copying
  // the name onto the sessions and detaching them before the template is removed.
  await db.execAsync('BEGIN');
  try {
    await db.runAsync(
      `UPDATE workout_sessions
       SET name = COALESCE(name, (SELECT name FROM workout_templates WHERE id = ?)),
           template_id = NULL
       WHERE template_id = ?`,
      [id, id]
    );
    await db.runAsync('DELETE FROM workout_templates WHERE id = ?', [id]);
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function getTemplateExercises(templateId: number): Promise<TemplateExercise[]> {
  const db = await getDb();
  return db.getAllAsync<TemplateExercise>(
    `SELECT te.*, e.name as exercise_name, e.bodyPart
     FROM template_exercises te
     JOIN exercises e ON te.exercise_id = e.id
     WHERE te.template_id = ?
     ORDER BY te.order_index`,
    [templateId]
  );
}

export async function addExerciseToTemplate(
  templateId: number,
  exerciseId: string,
  sets: number,
  reps: number,
  weightKg: number,
  orderIndex: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO template_exercises
     (template_id, exercise_id, sets, reps_min, reps_max, rest_seconds, order_index, weight_kg)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [templateId, exerciseId, sets, reps, reps, orderIndex, weightKg]
  );
}

export async function removeTemplateExercise(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM template_exercises WHERE id = ?', [id]);
}

export async function updateTemplateExercise(
  id: number,
  sets: number,
  reps: number,
  weightKg: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE template_exercises SET sets=?, reps_min=?, reps_max=?, weight_kg=? WHERE id=?',
    [sets, reps, reps, weightKg, id]
  );
}

// ─── WORKOUT SESSIONS ────────────────────────────────────────────────────────

export async function startSession(templateId?: number): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO workout_sessions (template_id, name, started_at)
     VALUES (?, (SELECT name FROM workout_templates WHERE id = ?), ?)`,
    [templateId ?? null, templateId ?? null, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function completeSession(id: number, notes?: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE workout_sessions SET completed_at = ?, notes = ? WHERE id = ?',
    [new Date().toISOString(), notes ?? null, id]
  );
}

export async function cancelSession(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM workout_sessions WHERE id = ?', [id]);
}

// The most recent session that was started but never completed (e.g. app was closed mid-workout)
export async function getActiveSession(): Promise<WorkoutSession | null> {
  const db = await getDb();
  return db.getFirstAsync<WorkoutSession>(
    `SELECT ws.*, COALESCE(wt.name, ws.name) as template_name,
       (SELECT COUNT(*) FROM session_sets WHERE session_id = ws.id) as set_count
     FROM workout_sessions ws
     LEFT JOIN workout_templates wt ON ws.template_id = wt.id
     WHERE ws.completed_at IS NULL
     ORDER BY ws.started_at DESC LIMIT 1`
  );
}

export async function getSessions(): Promise<WorkoutSession[]> {
  const db = await getDb();
  return db.getAllAsync<WorkoutSession>(
    `SELECT ws.*,
       COALESCE(wt.name, ws.name) as template_name,
       (SELECT COUNT(DISTINCT exercise_id) FROM session_sets WHERE session_id = ws.id) as exercise_count,
       (SELECT COUNT(*) FROM session_sets WHERE session_id = ws.id) as set_count,
       (SELECT COALESCE(SUM(COALESCE(reps,0) * COALESCE(weight_kg,0)),0)
        FROM session_sets WHERE session_id = ws.id) as total_volume
     FROM workout_sessions ws
     LEFT JOIN workout_templates wt ON ws.template_id = wt.id
     WHERE ws.completed_at IS NOT NULL
     ORDER BY ws.started_at DESC`
  );
}

export async function getSessionById(id: number): Promise<WorkoutSession | null> {
  const db = await getDb();
  return db.getFirstAsync<WorkoutSession>(
    `SELECT ws.*, COALESCE(wt.name, ws.name) as template_name
     FROM workout_sessions ws
     LEFT JOIN workout_templates wt ON ws.template_id = wt.id
     WHERE ws.id = ?`,
    [id]
  );
}

// ─── SESSION SETS ────────────────────────────────────────────────────────────

export async function addSessionSet(
  sessionId: number,
  exerciseId: string,
  setNumber: number,
  reps: number | null,
  weightKg: number | null,
  isWarmup: boolean
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO session_sets
     (session_id, exercise_id, set_number, reps, weight_kg, completed_at, is_warmup)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      exerciseId,
      setNumber,
      reps,
      weightKg,
      new Date().toISOString(),
      isWarmup ? 1 : 0,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateSessionSet(
  id: number,
  setNumber: number,
  reps: number | null,
  weightKg: number | null
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE session_sets SET set_number = ?, reps = ?, weight_kg = ? WHERE id = ?',
    [setNumber, reps, weightKg, id]
  );
}

export async function removeSessionSet(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM session_sets WHERE id = ?', [id]);
}

export async function getSessionSets(sessionId: number): Promise<SessionSet[]> {
  const db = await getDb();
  return db.getAllAsync<SessionSet>(
    `SELECT ss.*, e.name as exercise_name
     FROM session_sets ss
     JOIN exercises e ON ss.exercise_id = e.id
     WHERE ss.session_id = ?
     ORDER BY (SELECT MIN(x.id) FROM session_sets x
               WHERE x.session_id = ss.session_id AND x.exercise_id = ss.exercise_id),
              ss.set_number, ss.id`,
    [sessionId]
  );
}

// Returns the sets from the most recent prior session where this exercise was done
export async function getPreviousPerformance(
  exerciseId: string,
  excludeSessionId: number
): Promise<SessionSet[]> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ session_id: number }>(
    `SELECT ss.session_id FROM session_sets ss
     JOIN workout_sessions ws ON ws.id = ss.session_id
     WHERE ss.exercise_id = ? AND ss.session_id != ? AND ws.completed_at IS NOT NULL
     ORDER BY ws.started_at DESC LIMIT 1`,
    [exerciseId, excludeSessionId]
  );
  if (!row) return [];
  return db.getAllAsync<SessionSet>(
    `SELECT ss.*, e.name as exercise_name
     FROM session_sets ss
     JOIN exercises e ON ss.exercise_id = e.id
     WHERE ss.session_id = ? AND ss.exercise_id = ?
     ORDER BY ss.set_number`,
    [row.session_id, exerciseId]
  );
}

export interface ExerciseHistoryEntry {
  sessionId: number;
  startedAt: string;
  sessionName: string | null;
  sets: SessionSet[];
}

// Completed sessions where the exercise was performed, newest first
export async function getExerciseHistory(
  exerciseId: string,
  limit = 20
): Promise<ExerciseHistoryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<
    SessionSet & { started_at: string; template_name: string | null }
  >(
    `SELECT ss.*, ws.started_at, COALESCE(wt.name, ws.name) as template_name
     FROM session_sets ss
     JOIN workout_sessions ws ON ws.id = ss.session_id
     LEFT JOIN workout_templates wt ON wt.id = ws.template_id
     WHERE ss.exercise_id = ?
       AND ss.session_id IN (
         SELECT y.id FROM workout_sessions y
         WHERE y.completed_at IS NOT NULL
           AND EXISTS (SELECT 1 FROM session_sets x WHERE x.session_id = y.id AND x.exercise_id = ?)
         ORDER BY y.started_at DESC LIMIT ?
       )
     ORDER BY ws.started_at DESC, ss.set_number`,
    [exerciseId, exerciseId, limit]
  );
  const entries: ExerciseHistoryEntry[] = [];
  for (const r of rows) {
    let entry = entries[entries.length - 1];
    if (!entry || entry.sessionId !== r.session_id) {
      entry = {
        sessionId: r.session_id,
        startedAt: r.started_at,
        sessionName: r.template_name,
        sets: [],
      };
      entries.push(entry);
    }
    entry.sets.push(r);
  }
  return entries;
}

// ─── STATS ───────────────────────────────────────────────────────────────────

export async function getStats(): Promise<{
  totalSessions: number;
  totalSets: number;
  thisWeekSessions: number;
}> {
  const db = await getDb();
  const [s1, s2, s3] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM workout_sessions WHERE completed_at IS NOT NULL'
    ),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM session_sets ss
       JOIN workout_sessions ws ON ws.id = ss.session_id
       WHERE ws.completed_at IS NOT NULL`
    ),
    db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM workout_sessions WHERE completed_at IS NOT NULL AND started_at > ?',
      [new Date(Date.now() - 7 * 86400000).toISOString()]
    ),
  ]);
  return {
    totalSessions: s1?.count ?? 0,
    totalSets: s2?.count ?? 0,
    thisWeekSessions: s3?.count ?? 0,
  };
}

// ─── RESET ───────────────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    BEGIN;
    DELETE FROM session_sets;
    DELETE FROM workout_sessions;
    DELETE FROM template_exercises;
    DELETE FROM workout_templates;
    DELETE FROM exercises;
    DELETE FROM settings;
    COMMIT;
  `);
}
