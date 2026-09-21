import Dexie, { type Table } from 'dexie';
import type { Entry, Session, WorkoutTemplate } from './types';

/**
 * Three object stores, nothing else:
 *   workouts  — the editable program (seed data, not application logic)
 *   sessions  — id, date, type
 *   entries   — sessionId, exerciseName, sets[] as JSON
 *
 * History is keyed by exercise NAME + date, not by a template id, so the same
 * movement shares one history across every day it appears in.
 */
class WorkoutDb extends Dexie {
  workouts!: Table<WorkoutTemplate, number>;
  sessions!: Table<Session, number>;
  entries!: Table<Entry, number>;

  constructor() {
    super('workout');
    this.version(1).stores({
      workouts: '++id, order, name',
      sessions: '++id, date, type, [type+date]',
      entries: '++id, sessionId, exerciseName, date, [exerciseName+date]'
    });
  }
}

export const db = new WorkoutDb();

/** YYYY-MM-DD in local time (not UTC — a 23:00 session belongs to that day). */
export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[(m ?? 1) - 1]} ${String(d).padStart(2, '0')}${y === new Date().getFullYear() ? '' : ` ${y}`}`;
}
