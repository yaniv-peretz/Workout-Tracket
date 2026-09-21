import { db, today } from './db';
import { prefillWeight } from './progression';
import type { Entry, ExerciseTemplate, PerformedSet, Session, WorkoutTemplate } from './types';

export function blankSet(): PerformedSet {
  return { weightKg: null, reps: null, rir: null, minutes: null, avgHr: null, done: false };
}

/** Most recent logged entry for a movement, ignoring the session in progress. */
export async function lastEntryFor(
  exerciseName: string,
  excludeSessionId?: number
): Promise<Entry | undefined> {
  const rows = await db.entries.where('exerciseName').equals(exerciseName).sortBy('date');
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i]!;
    if (row.sessionId === excludeSessionId) continue;
    if (row.sets.some((s) => s.done)) return row;
  }
  return undefined;
}

/** Full history for one movement, newest first. */
export async function historyFor(exerciseName: string): Promise<Entry[]> {
  const rows = await db.entries.where('exerciseName').equals(exerciseName).sortBy('date');
  return rows.filter((r) => r.sets.some((s) => s.done)).reverse();
}

export async function distinctExerciseNames(): Promise<string[]> {
  const names = new Set<string>();
  await db.entries.each((e) => {
    if (e.sets.some((s) => s.done)) names.add(e.exerciseName);
  });
  for (const w of await db.workouts.toArray()) {
    for (const e of w.exercises) names.add(e.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Today's unfinished session for this day, if there is one. */
export async function openSessionFor(template: WorkoutTemplate): Promise<Session | undefined> {
  const rows = await db.sessions.where('[type+date]').equals([template.name, today()]).toArray();
  return rows.find((s) => s.completedAt === null);
}

/**
 * Starts a session and materialises one entry per exercise, with the weight
 * prefilled from the last time that movement was performed.
 */
export async function startSession(template: WorkoutTemplate): Promise<number> {
  const existing = await openSessionFor(template);
  if (existing?.id) return existing.id;

  const date = today();
  const sessionId = await db.sessions.add({
    date,
    type: template.name,
    templateId: template.id ?? null,
    startedAt: Date.now(),
    completedAt: null
  } as Session);

  const entries: Entry[] = [];
  for (const [order, tpl] of template.exercises.entries()) {
    const last = await lastEntryFor(tpl.name);
    const weight = tpl.kind === 'strength' ? prefillWeight(last) : null;
    entries.push({
      sessionId,
      exerciseName: tpl.name,
      date,
      order,
      kind: tpl.kind,
      sets: Array.from({ length: tpl.targetSets }, () => ({ ...blankSet(), weightKg: weight })),
      notes: '',
      updatedAt: Date.now()
    });
  }
  await db.entries.bulkAdd(entries);
  return sessionId;
}

export async function sessionEntries(sessionId: number): Promise<Entry[]> {
  const rows = await db.entries.where('sessionId').equals(sessionId).toArray();
  return rows.sort((a, b) => a.order - b.order);
}

export async function saveEntry(entry: Entry): Promise<void> {
  if (entry.id === undefined) return;
  await db.entries.update(entry.id, {
    sets: JSON.parse(JSON.stringify(entry.sets)) as PerformedSet[],
    notes: entry.notes,
    updatedAt: Date.now()
  });
}

export async function finishSession(sessionId: number): Promise<void> {
  await db.sessions.update(sessionId, { completedAt: Date.now() });
  // Drop exercises that were opened but never logged, so history stays honest.
  const rows = await sessionEntries(sessionId);
  const empty = rows.filter((r) => !r.sets.some((s) => s.done)).map((r) => r.id!);
  if (empty.length > 0) await db.entries.bulkDelete(empty);
}

export async function deleteSession(sessionId: number): Promise<void> {
  await db.transaction('rw', db.sessions, db.entries, async () => {
    await db.entries.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}

export async function recentSessions(limit = 30): Promise<Session[]> {
  const rows = await db.sessions.orderBy('date').toArray();
  return rows.reverse().slice(0, limit);
}

/** Adds a set beyond the template target (or removes a trailing one). */
export function templateFor(
  template: WorkoutTemplate | undefined,
  name: string
): ExerciseTemplate | undefined {
  return template?.exercises.find((e) => e.name === name);
}
