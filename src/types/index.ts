export interface Exercise {
  id: string;
  name: string;
  category: string | null;
  primaryMuscles: string; // JSON array stored as string
  secondaryMuscles: string; // JSON array stored as string
  equipment: string | null;
  bodyPart: string | null;
  gifUrl: string | null;
  instructions: string | null; // semicolon-separated
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  created_at: string;
  exercise_count?: number;
}

export interface TemplateExercise {
  id: number;
  template_id: number;
  exercise_id: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  order_index: number;
  exercise_name?: string;
  bodyPart?: string;
}

export interface WorkoutSession {
  id: number;
  template_id: number | null;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  template_name?: string;
  set_count?: number;
  exercise_count?: number;
  total_volume?: number; // sum(reps * weight_kg)
}

export interface SessionSet {
  id: number;
  session_id: number;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  completed_at: string | null;
  is_warmup: number;
  exercise_name?: string;
}

// Active workout in-memory state
export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  bodyPart: string | null;
  restSeconds: number;
  sets: WorkoutSet[];
}

export interface WorkoutSet {
  dbId: number;
  setNumber: number;
  reps: string;
  weightKg: string;
  isWarmup: boolean;
}
