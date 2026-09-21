import { db } from './db';
import type { ExerciseKind, ExerciseTemplate, WorkoutTemplate } from './types';

/**
 * The program below is SEED DATA, written into IndexedDB on first launch only.
 * It is not application logic — edit everything from the Program screen.
 *
 * Exercise names are deliberately identical across days ("Row" in Upper A and
 * Upper B, "Leg curl" in Lower A and Lower B) so they share one history.
 */

type ExOpts = Partial<Omit<ExerciseTemplate, 'name' | 'targetSets'>>;

function ex(name: string, targetSets: number, opts: ExOpts = {}): ExerciseTemplate {
  return {
    name,
    kind: (opts.kind ?? 'strength') as ExerciseKind,
    targetSets,
    minReps: opts.minReps ?? null,
    maxReps: opts.maxReps ?? null,
    targetRir: opts.targetRir ?? null,
    increment: opts.increment ?? 2.5,
    optional: opts.optional ?? false,
    notes: opts.notes ?? ''
  };
}

const abs = ex('Abs', 3, { minReps: 8, maxReps: 20, optional: true, notes: 'Optional, 2–3 sets' });

export const PROGRAM: Omit<WorkoutTemplate, 'id'>[] = [
  {
    name: 'Upper A',
    order: 0,
    notes: 'Back first. Back emphasis while still giving chest, shoulders and arms meaningful work.',
    exercises: [
      ex('Row', 3, { minReps: 6, maxReps: 10 }),
      ex('Lat pulldown / pull-up', 3, { minReps: 8, maxReps: 12 }),
      ex('Incline chest press', 3, { minReps: 6, maxReps: 10 }),
      ex('Lateral raise', 3, { minReps: 12, maxReps: 20, increment: 1.25 }),
      ex('EZ-bar curl', 3, { minReps: 8, maxReps: 12, increment: 1.25 }),
      ex('Triceps pushdown', 3, { minReps: 8, maxReps: 15, increment: 1.25 }),
      abs
    ]
  },
  {
    name: 'Lower A',
    order: 1,
    notes: 'Main hypertrophy day. Leg extension is intentional pre-exhaust before the hack squat.',
    exercises: [
      ex('Leg extension', 2, {
        minReps: 12,
        maxReps: 20,
        targetRir: 1,
        notes: 'Pre-exhaust: ~2 RIR on set 1, ~1 RIR on set 2, then hack squat.'
      }),
      ex('Hack squat', 3, { minReps: 8, maxReps: 12, increment: 5 }),
      ex('Leg press', 3, { minReps: 10, maxReps: 15, increment: 5, notes: '2–3 sets' }),
      ex('Leg curl', 3, { minReps: 10, maxReps: 15 }),
      ex('Back extension', 3, { minReps: 10, maxReps: 15, notes: '2–3 sets' }),
      ex('Seated calf raise', 3, { minReps: 10, maxReps: 20 }),
      abs
    ]
  },
  {
    name: 'Upper B',
    order: 2,
    notes: 'Chest first.',
    exercises: [
      ex('Flat chest press', 3, { minReps: 6, maxReps: 10 }),
      ex('Chest fly', 2, { minReps: 10, maxReps: 15, increment: 1.25 }),
      ex('Lat pulldown / pull-up', 3, { minReps: 8, maxReps: 12 }),
      ex('Row', 2, { minReps: 8, maxReps: 12 }),
      ex('Lateral or rear-delt raise', 3, { minReps: 12, maxReps: 20, increment: 1.25 }),
      ex('Hammer curl', 3, { minReps: 8, maxReps: 15, increment: 1.25 }),
      ex('Overhead triceps extension', 3, { minReps: 8, maxReps: 15, increment: 1.25 }),
      abs
    ]
  },
  {
    name: 'Lower B',
    order: 3,
    notes: 'VO₂max + light legs. This is not another hard leg day.',
    exercises: [
      ex('Bike warm-up', 1, { kind: 'cardio', notes: '5–10 min easy.' }),
      ex('Bike 4 × 4 min', 4, {
        kind: 'cardio',
        notes: '4 min hard / 3 min easy between. Sustainable, not all-out — eventually ~85–95% max HR.'
      }),
      ex('Goblet squat', 3, {
        minReps: 10,
        maxReps: 15,
        targetRir: 2,
        notes: '2–3 sets, controlled, ~2–3 RIR.'
      }),
      ex('Leg curl', 3, { minReps: 10, maxReps: 15, notes: '2–3 sets' }),
      ex('Smith standing calf raise', 3, { minReps: 10, maxReps: 20, increment: 5 }),
      ex('Wrist curl/extension', 2, { minReps: 15, maxReps: 25, increment: 1.25 }),
      abs
    ]
  }
];

/** Writes the program once, on an empty database. Never overwrites edits. */
export async function seedIfEmpty(): Promise<void> {
  const count = await db.workouts.count();
  if (count > 0) return;
  await db.workouts.bulkAdd(PROGRAM as WorkoutTemplate[]);
}
