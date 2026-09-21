export type ExerciseKind = 'strength' | 'cardio';

/** One line of the program, e.g. "Row — 3 × 6–10". Lives inside a WorkoutTemplate. */
export interface ExerciseTemplate {
  name: string;
  kind: ExerciseKind;
  targetSets: number;
  minReps: number | null;
  maxReps: number | null;
  targetRir: number | null;
  /** kg to add when every set hits the top of the rep range. */
  increment: number;
  optional: boolean;
  notes: string;
}

/** A training day: Upper A, Lower A, ... Editable at runtime, seeded on first launch. */
export interface WorkoutTemplate {
  id?: number;
  name: string;
  order: number;
  notes: string;
  exercises: ExerciseTemplate[];
}

export interface PerformedSet {
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  /** cardio only */
  minutes: number | null;
  /** cardio only */
  avgHr: number | null;
  done: boolean;
}

/** sessions: id, date, type */
export interface Session {
  id?: number;
  /** YYYY-MM-DD, local time. */
  date: string;
  /** Workout name as performed, e.g. "Upper A". Kept as text so renaming a
   *  template never orphans history. */
  type: string;
  templateId: number | null;
  startedAt: number;
  completedAt: number | null;
}

/** entries: sessionId, exerciseName, sets (JSON). Indexed by [exerciseName+date]. */
export interface Entry {
  id?: number;
  sessionId: number;
  exerciseName: string;
  /** Denormalised from the session so history is one indexed range query. */
  date: string;
  order: number;
  kind: ExerciseKind;
  sets: PerformedSet[];
  notes: string;
  updatedAt: number;
}

export interface Backup {
  format: 'workout-backup';
  version: 1;
  exportedAt: string;
  workouts: WorkoutTemplate[];
  sessions: Session[];
  entries: Entry[];
}
