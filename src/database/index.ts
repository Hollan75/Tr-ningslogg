import * as SQLite from 'expo-sqlite';
import type {
  Exercise,
  WorkoutTemplate,
  TemplateExercise,
  WorkoutSession,
  SessionSet,
} from '../types';

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
      instructions TEXT
    );
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
    CREATE INDEX IF NOT EXISTS idx_exercises_body_part ON exercises(bodyPart);
  `);

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

export async function insertExercisesBatch(exercises: Exercise[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const ex of exercises) {
      await db.runAsync(
        `INSERT OR REPLACE INTO exercises
         (id, name, category, primaryMuscles, secondaryMuscles, equipment, bodyPart, gifUrl, instructions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ex.id,
          ex.name,
          ex.category ?? null,
          ex.primaryMuscles,
          ex.secondaryMuscles,
          ex.equipment ?? null,
          ex.bodyPart ?? null,
          ex.gifUrl ?? null,
          ex.instructions ?? null,
        ]
      );
    }
  });
}

export async function getExercises(search?: string, bodyPart?: string): Promise<Exercise[]> {
  const db = await getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search && search.trim()) {
    conditions.push('LOWER(name) LIKE ?');
    params.push(`%${search.toLowerCase().trim()}%`);
  }
  if (bodyPart) {
    conditions.push('bodyPart = ?');
    params.push(bodyPart);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.getAllAsync<Exercise>(
    `SELECT * FROM exercises ${where} ORDER BY name ASC LIMIT 200`,
    params
  );
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const db = await getDb();
  return db.getFirstAsync<Exercise>('SELECT * FROM exercises WHERE id = ?', [id]);
}

export async function getBodyParts(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ bodyPart: string }>(
    "SELECT DISTINCT bodyPart FROM exercises WHERE bodyPart IS NOT NULL AND bodyPart != '' ORDER BY bodyPart"
  );
  return rows.map(r => r.bodyPart);
}

export async function getExerciseCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises'
  );
  return row?.count ?? 0;
}

export async function clearExercises(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM exercises');
}

// ─── WORKOUT TEMPLATES ──────────────────────────────────────────────────────

export async function getTemplates(): Promise<WorkoutTemplate[]> {
  const db = await getDb();
  return db.getAllAsync<WorkoutTemplate>(
    `SELECT wt.*,
       (SELECT COUNT(*) FROM template_exercises WHERE template_id = wt.id) as exercise_count
     FROM workout_templates wt
     ORDER BY created_at DESC`
  );
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
  await db.runAsync('DELETE FROM workout_templates WHERE id = ?', [id]);
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
  repsMin: number,
  repsMax: number,
  restSeconds: number,
  orderIndex: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO template_exercises
     (template_id, exercise_id, sets, reps_min, reps_max, rest_seconds, order_index)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [templateId, exerciseId, sets, repsMin, repsMax, restSeconds, orderIndex]
  );
}

export async function removeTemplateExercise(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM template_exercises WHERE id = ?', [id]);
}

// ─── WORKOUT SESSIONS ────────────────────────────────────────────────────────

export async function startSession(templateId?: number): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO workout_sessions (template_id, started_at) VALUES (?, ?)',
    [templateId ?? null, new Date().toISOString()]
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

export async function getSessions(): Promise<WorkoutSession[]> {
  const db = await getDb();
  return db.getAllAsync<WorkoutSession>(
    `SELECT ws.*,
       wt.name as template_name,
       (SELECT COUNT(DISTINCT exercise_id) FROM session_sets WHERE session_id = ws.id) as exercise_count,
       (SELECT COUNT(*) FROM session_sets WHERE session_id = ws.id) as set_count
     FROM workout_sessions ws
     LEFT JOIN workout_templates wt ON ws.template_id = wt.id
     WHERE ws.completed_at IS NOT NULL
     ORDER BY ws.started_at DESC`
  );
}

export async function getSessionById(id: number): Promise<WorkoutSession | null> {
  const db = await getDb();
  return db.getFirstAsync<WorkoutSession>(
    `SELECT ws.*, wt.name as template_name
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
     ORDER BY ss.exercise_id, ss.set_number`,
    [sessionId]
  );
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
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM session_sets'),
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
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM session_sets');
    await db.runAsync('DELETE FROM workout_sessions');
    await db.runAsync('DELETE FROM template_exercises');
    await db.runAsync('DELETE FROM workout_templates');
    await db.runAsync('DELETE FROM exercises');
    await db.runAsync('DELETE FROM settings');
  });
}
