import {
  getSetting,
  setSetting,
  insertExercisesBatch,
  getCustomExercises,
  updateExerciseGroup,
} from '../database';
import { toGroup, toEquipment } from './groups';
import { loadLocalExercises } from './localExercises';
import { loadSwedishExercises, SWEDISH_LIBRARY_VERSION } from './swedishExercises';

// Makes sure both exercise libraries are in the database. `force` reloads everything.
export async function ensureExerciseLibraries(force = false): Promise<void> {
  // v2: English library uses the shared Swedish muscle groups and equipment names
  if (force || (await getSetting('english_library_version')) !== '2') {
    await insertExercisesBatch(loadLocalExercises(), true);
    for (const ex of await getCustomExercises()) {
      await updateExerciseGroup(ex.id, toGroup(ex.bodyPart), toEquipment(ex.equipment));
    }
    await setSetting('exercises_synced', 'true');
    await setSetting('english_library_version', '2');
  }
  if (force || (await getSetting('swedish_library_version')) !== SWEDISH_LIBRARY_VERSION) {
    await insertExercisesBatch(loadSwedishExercises(), true);
    await setSetting('swedish_library_version', SWEDISH_LIBRARY_VERSION);
  }
}
