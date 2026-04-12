import type { Exercise } from '../types';

const BASE_URL = 'https://api.workoutxapp.com/v1';
const API_KEY = 'wx_246b439b93051d40b2355015a07d4ad38403da23fc42bc18a83ef5c5';

interface ApiExercise {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  secondaryMuscles: string[];
  gifUrl: string;
  equipment: string;
  instructions: string[];
  category?: string;
}

function mapApiExercise(ex: ApiExercise): Exercise {
  return {
    id: String(ex.id),
    name: ex.name,
    category: ex.category ?? ex.bodyPart ?? null,
    primaryMuscles: JSON.stringify(ex.target ? [ex.target] : []),
    secondaryMuscles: JSON.stringify(Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : []),
    equipment: ex.equipment ?? null,
    bodyPart: ex.bodyPart ?? null,
    gifUrl: ex.gifUrl ?? null,
    instructions: Array.isArray(ex.instructions) && ex.instructions.length > 0
      ? ex.instructions.join('; ')
      : null,
  };
}

function extractExercises(data: unknown): ApiExercise[] {
  if (Array.isArray(data)) return data as ApiExercise[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.exercises)) return obj.exercises as ApiExercise[];
    if (Array.isArray(obj.data)) return obj.data as ApiExercise[];
  }
  return [];
}

export async function fetchAllExercises(
  onProgress?: (fetched: number) => void
): Promise<Exercise[]> {
  const all: Exercise[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${BASE_URL}/exercises?limit=${limit}&offset=${offset}`;
    const response = await fetch(url, {
      headers: {
        'X-WorkoutX-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API ${response.status}: ${response.statusText}`);
    }

    const data: unknown = await response.json();
    const exercises = extractExercises(data);

    if (exercises.length === 0) break;

    all.push(...exercises.map(mapApiExercise));
    onProgress?.(all.length);

    if (exercises.length < limit) break;
    offset += limit;
  }

  return all;
}
