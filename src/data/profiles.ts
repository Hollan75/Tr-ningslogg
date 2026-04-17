export interface UserProfile {
  name: string;
  age: number;
  gender: string;
  goal: string;
  experience: string;
  daysPerWeek: number;
  notes: string;
  // Extended fields
  fitnessLevel?: string;
  equipment?: string[];
  injuries?: string[];
  focusAreas?: string[];
  trainingPrinciples?: string[];
  coachInstructions?: string[];
}

export const PROFILES: Record<string, UserProfile> = {
  Philip: {
    name: 'Philip',
    age: 50,
    gender: 'man',
    goal: 'Stark, funktionell kropp med fokus på långsiktig hälsa och skadeförebyggande – inte maximal styrka eller estetik',
    experience: 'Tränar regelbundet med god teoretisk förståelse för träning',
    daysPerWeek: 3,
    fitnessLevel: 'Gym 2–3 pass/vecka (~50 min/pass). Kondition: springer upp till 10 km (föredrar ~6 km). Övrigt: promenader, padel.',
    equipment: [
      'Fullt utrustat gym',
      'Hemma: TRX, pilatesboll, hantlar, gummiband, foam roller, pull-up bar',
    ],
    injuries: [
      'Axelproblem (post-operation) – kräver kontinuerlig rehab/mobilitet, fokus på stabilitet, rotatorcuff, undvika överbelastning',
      'Trochanterit (höftsmärta, diagnostiserad av naprapat) – rehabprogram 3 ggr/vecka, påverkar löpning, sidobelastning och höftstabilitet',
      'Ländryggssmärta kopplad till stillasittande arbete – kräver stärkande core och rörlighetsarbete',
      'Generell stelhet i höfter och axlar, påverkan från kontorsarbete (hållning, cirkulation)',
    ],
    focusAreas: [
      'Hållning (posture) – baksida, skuldror, rygg, axlar, övre rygg',
      'Core och ländrygg',
      'Glutes (gluteus medius/maximus)',
      'Höftstyrka och rörlighet',
      'Cirkulation – motverka stillasittande',
      'Rotatorcuff-rehabilitering',
      'Djup core (ej bara situps)',
    ],
    trainingPrinciples: [
      'Funktionell styrka före isolerad estetik',
      'Kombinera styrka och mobilitet',
      'Undvika övningar som provocerar axel eller höft',
      'Prioritera teknik och kontroll',
      'Superset och effektiva pass (~50 min)',
      '3 olika gympass med variation',
    ],
    coachInstructions: [
      'Undvik generiska program – anpassa alltid efter skadorna',
      'Prioritera skadeförebyggande över progression i vikt',
      'Inkludera övningar för rotatorcuff, gluteus medius/maximus och djup core',
      'Balans mellan belastning och återhämtning är kritisk',
      'Varje gympass bör innehålla uppvärmning, mobilitetsövningar (axel + höft), styrkedel och gummibandsövningar för rehab',
    ],
    notes: 'Smärtfri kropp i vardagen. Stark rygg, stabila axlar och höfter. Förbättrad rörlighet. Hålla kroppen hållbar långsiktigt. Kunna träna, springa och spela padel utan besvär.',
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
