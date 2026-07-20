import type { MovementUsageEvent } from './movementTypes';

const USAGE_KEY = 'spokedu-master.spomove.movement.usage.v1';
const MAX_EVENTS = 200;

export function createMovementSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `mv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function appendMovementUsageEvent(
  event: Omit<MovementUsageEvent, 'schemaVersion' | 'occurredAt'> & { occurredAt?: string },
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof window !== 'undefined'
    ? window.localStorage
    : null,
) {
  if (!storage) return;
  const full: MovementUsageEvent = {
    schemaVersion: 1,
    occurredAt: event.occurredAt ?? new Date().toISOString(),
    ...event,
  };
  try {
    const prev = JSON.parse(storage.getItem(USAGE_KEY) ?? '[]') as MovementUsageEvent[];
    const next = [...prev, full].slice(-MAX_EVENTS);
    storage.setItem(USAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function readMovementUsageEvents(
  storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
): MovementUsageEvent[] {
  if (!storage) return [];
  try {
    return JSON.parse(storage.getItem(USAGE_KEY) ?? '[]') as MovementUsageEvent[];
  } catch {
    return [];
  }
}
