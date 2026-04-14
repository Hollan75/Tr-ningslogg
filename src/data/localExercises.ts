import type { Exercise } from '../types';
import exercisesJson from './exercises.json';

interface RawExercise {
  id: string;
  name: string;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  instructions: string[];
  level: string;
  images: string[];
  force?: string;
  mechanic?: string;
}

function mapExercise(raw: RawExercise): Exercise {
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category ?? null,
    primaryMuscles: JSON.stringify(Array.isArray(raw.primaryMuscles) ? raw.primaryMuscles : []),
    secondaryMuscles: JSON.stringify(Array.isArray(raw.secondaryMuscles) ? raw.secondaryMuscles : []),
    equipment: raw.equipment ?? null,
    bodyPart: Array.isArray(raw.primaryMuscles) && raw.primaryMuscles.length > 0
      ? raw.primaryMuscles[0]
      : null,
    gifUrl: null,
    instructions: Array.isArray(raw.instructions) && raw.instructions.length > 0
      ? raw.instructions.join('; ')
      : null,
    difficulty: raw.level ?? null,
  };
}

export function loadLocalExercises(): Exercise[] {
  return (exercisesJson as RawExercise[]).map(mapExercise);
}
