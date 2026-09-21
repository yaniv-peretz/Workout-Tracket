import type { Entry, ExerciseTemplate } from './types';

/**
 * Suggests — never applies — a load increase. The rule is deliberately dumb:
 * every logged set in the last session hit the top of the rep range at the same
 * weight, so the weight is no longer the limiter.
 */
export function suggestNextWeight(
  last: Entry | undefined,
  tpl: ExerciseTemplate
): { weight: number; previous: string } | null {
  if (!last || tpl.kind !== 'strength' || tpl.maxReps === null) return null;

  const logged = last.sets.filter((s) => s.done && s.reps !== null && s.weightKg !== null);
  if (logged.length < 2) return null;

  const weight = logged[0]!.weightKg!;
  const sameWeight = logged.every((s) => s.weightKg === weight);
  const allAtTop = logged.every((s) => (s.reps ?? 0) >= tpl.maxReps!);
  if (!sameWeight || !allAtTop) return null;

  return {
    weight: round(weight + tpl.increment),
    previous: `${weight} × ${logged.map((s) => s.reps).join(' / ')}`
  };
}

/** Weight to prefill today's sets with: whatever was used last time. */
export function prefillWeight(last: Entry | undefined): number | null {
  if (!last) return null;
  const logged = last.sets.filter((s) => s.done && s.weightKg !== null);
  const source = logged.length > 0 ? logged : last.sets.filter((s) => s.weightKg !== null);
  return source.length > 0 ? source[0]!.weightKg : null;
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function summariseSets(entry: Entry): string {
  const logged = entry.sets.filter((s) => s.done);
  if (logged.length === 0) return '—';
  if (entry.kind === 'cardio') {
    return logged
      .map((s) => `${s.minutes ?? '?'}min${s.avgHr ? ` @${s.avgHr}` : ''}`)
      .join(' / ');
  }
  const weights = [...new Set(logged.map((s) => s.weightKg))];
  const reps = logged.map((s) => s.reps ?? '?').join(' / ');
  return weights.length === 1 && weights[0] !== null
    ? `${weights[0]}kg   ${reps}`
    : logged.map((s) => `${s.weightKg ?? '?'}×${s.reps ?? '?'}`).join(' / ');
}
