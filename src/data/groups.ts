// Shared Swedish muscle groups and equipment names, so filters work the same
// for the Swedish library, the English library and custom exercises.

const GROUP_BY_MUSCLE: Record<string, string> = {
  abdominals: 'Bål',
  abductors: 'Säte',
  adductors: 'Ben',
  biceps: 'Armar',
  calves: 'Ben',
  chest: 'Bröst',
  forearms: 'Armar',
  glutes: 'Säte',
  hamstrings: 'Ben',
  lats: 'Rygg',
  'lower back': 'Rygg',
  'middle back': 'Rygg',
  neck: 'Rygg',
  quadriceps: 'Ben',
  shoulders: 'Axlar',
  traps: 'Rygg',
  triceps: 'Armar',
};

const GROUP_BY_CATEGORY: Record<string, string> = {
  stretching: 'Rörlighet',
  cardio: 'Kondition',
};

export const MUSCLE_GROUPS = ['Ben', 'Säte', 'Axlar', 'Bröst', 'Rygg', 'Armar', 'Bål', 'Rörlighet', 'Kondition'];

const EQUIPMENT: Record<string, string> = {
  'body only': 'Kroppsvikt',
  machine: 'Maskin',
  other: 'Övrigt',
  'foam roll': 'Foamroller',
  kettlebells: 'Kettlebell',
  dumbbell: 'Hantlar',
  cable: 'Kabel',
  barbell: 'Skivstång',
  bands: 'Gummiband',
  'medicine ball': 'Medicinboll',
  'exercise ball': 'Pilatesboll',
  'e-z curl bar': 'EZ-stång',
};

// Swedish group for a muscle/body part name in either language (or free text)
export function toGroup(bodyPart: string | null, category?: string | null): string | null {
  if (category && GROUP_BY_CATEGORY[category.toLowerCase()]) return GROUP_BY_CATEGORY[category.toLowerCase()];
  if (!bodyPart) return null;
  const key = bodyPart.trim().toLowerCase();
  if (GROUP_BY_MUSCLE[key]) return GROUP_BY_MUSCLE[key];
  const sv = MUSCLE_GROUPS.find(g => g.toLowerCase() === key);
  return sv ?? bodyPart.trim();
}

export function toEquipment(equipment: string | null): string | null {
  if (!equipment) return null;
  return EQUIPMENT[equipment.trim().toLowerCase()] ?? equipment.trim();
}
