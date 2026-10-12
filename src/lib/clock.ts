/**
 * Central clock so demo timestamps are stubbable in tests.
 */
let provider: () => Date = () => new Date();

export function now(): Date {
  return provider();
}

export function nowIso(): string {
  return provider().toISOString();
}

export function setClock(p: () => Date): void {
  provider = p;
}

export function resetClock(): void {
  provider = () => new Date();
}
