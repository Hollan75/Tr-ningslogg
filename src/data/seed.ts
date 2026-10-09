import { getSetting, setSetting, insertExercisesBatch } from '../database';
import { loadLocalExercises } from './localExercises';
import { loadSwedishExercises, SWEDISH_LIBRARY_VERSION } from './swedishExercises';

// Makes sure both exercise libraries are in the database. `force` reloads everything.
export async function ensureExerciseLibraries(force = false): Promise<void> {
  if (force || (await getSetting('exercises_synced')) !== 'true') {
    await insertExercisesBatch(loadLocalExercises());
    await setSetting('exercises_synced', 'true');
  }
  if (force || (await getSetting('swedish_library_version')) !== SWEDISH_LIBRARY_VERSION) {
    await insertExercisesBatch(loadSwedishExercises(), true);
    await setSetting('swedish_library_version', SWEDISH_LIBRARY_VERSION);
  }
}
