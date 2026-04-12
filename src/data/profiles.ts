export interface UserProfile {
  name: string;
  age: number;
  gender: string;
  goal: string;
  experience: string;
  daysPerWeek: number;
  notes: string;
}

export const PROFILES: Record<string, UserProfile> = {
  Philip: {
    name: 'Philip',
    age: 28,
    gender: 'man',
    goal: 'Bygga muskelmassa och styrka',
    experience: 'Intermediär – tränat 3 år',
    daysPerWeek: 4,
    notes: 'Fokus på överkropp. Undviker tunga knäböj pga knäproblem. Trivs med skivstångsövningar.',
  },
  Milla: {
    name: 'Milla',
    age: 25,
    gender: 'kvinna',
    goal: 'Tona kroppen, bygga uthållighet och styrka',
    experience: 'Nybörjare/Intermediär – tränat 1 år',
    daysPerWeek: 3,
    notes: 'Gillar funktionell träning och hantlar. Vill undvika för tunga isolationsövningar.',
  },
};

export const PROFILE_NAMES = Object.keys(PROFILES) as (keyof typeof PROFILES)[];
