/**
 * Deterministic id generator — a per-session counter is sufficient for a
 * local demo app and keeps tests reproducible.
 */
let counter = 0;

export function createId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter.toString(36).padStart(4, '0')}`;
}

export function resetIdCounter(): void {
  counter = 0;
}
