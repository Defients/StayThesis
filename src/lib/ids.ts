/**
 * Deterministic id generator — a per-session counter is sufficient for a
 * local demo app and keeps tests reproducible.
 */
let counter = 0;
let provider: ((prefix: string) => string) | null = null;

/** Server requests use UUIDs; the offline demo retains deterministic IDs. */
export function setIdProvider(value: ((prefix: string) => string) | null): void {
  provider = value;
}

export function createId(prefix: string): string {
  if (provider) return provider(prefix);
  counter += 1;
  return `${prefix}-${counter.toString(36).padStart(4, '0')}`;
}

export function resetIdCounter(): void {
  counter = 0;
}
