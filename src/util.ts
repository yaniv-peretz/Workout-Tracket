/** Reads a number input, treating an empty field as "not entered" rather than 0. */
export function num(e: Event): number | null {
  const raw = (e.target as HTMLInputElement).value.trim().replace(',', '.');
  if (raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function text(e: Event): string {
  return (e.target as HTMLInputElement | HTMLTextAreaElement).value;
}

export function repRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return '';
  if (min !== null && max !== null) return min === max ? `${min}` : `${min}–${max}`;
  return String(min ?? max);
}
