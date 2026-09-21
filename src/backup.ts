import { db } from './db';
import type { Backup, Entry, Session, WorkoutTemplate } from './types';

/**
 * Browser storage is not a backup: the user or the browser can clear it, and
 * Incognito storage is discarded on close. Export early, export often.
 */
export async function exportBackup(): Promise<Backup> {
  const [workouts, sessions, entries] = await Promise.all([
    db.workouts.toArray(),
    db.sessions.toArray(),
    db.entries.toArray()
  ]);
  return {
    format: 'workout-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    workouts,
    sessions,
    entries
  };
}

export async function downloadBackup(): Promise<void> {
  const data = await exportBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workout-${data.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function assertBackup(value: unknown): asserts value is Backup {
  const b = value as Partial<Backup>;
  if (!b || b.format !== 'workout-backup' || b.version !== 1) {
    throw new Error('Not a workout backup file.');
  }
  if (!Array.isArray(b.workouts) || !Array.isArray(b.sessions) || !Array.isArray(b.entries)) {
    throw new Error('Backup file is missing one of: workouts, sessions, entries.');
  }
}

/**
 * Replaces everything. Ids are preserved, so sessionId links survive intact —
 * that is why this is a replace and not a merge.
 */
export async function importBackup(json: string): Promise<{ sessions: number; entries: number }> {
  const parsed: unknown = JSON.parse(json);
  assertBackup(parsed);

  await db.transaction('rw', db.workouts, db.sessions, db.entries, async () => {
    await Promise.all([db.workouts.clear(), db.sessions.clear(), db.entries.clear()]);
    await db.workouts.bulkAdd(parsed.workouts as WorkoutTemplate[]);
    await db.sessions.bulkAdd(parsed.sessions as Session[]);
    await db.entries.bulkAdd(parsed.entries as Entry[]);
  });

  return { sessions: parsed.sessions.length, entries: parsed.entries.length };
}
