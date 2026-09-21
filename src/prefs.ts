/**
 * localStorage holds only tiny UI state — the last day you tapped and the
 * session you are currently in. All workout data lives in IndexedDB.
 */
const KEY = 'workout:prefs';

export interface Prefs {
  lastWorkoutId: number | null;
  activeSessionId: number | null;
}

const EMPTY: Prefs = { lastWorkoutId: null, activeSessionId: null };

export function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Prefs>) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function writePrefs(patch: Partial<Prefs>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readPrefs(), ...patch }));
  } catch {
    /* private mode / storage disabled — not worth failing a set for */
  }
}
