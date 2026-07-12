'use client';

import { devLogger } from '@/app/lib/logging/devLogger';
import type { SnapshotDiffReason } from './noteSnapshotEquivalence';

export type SnapshotTraceOrigin =
  | 'coordinator:push'
  | 'coordinator:pull'
  | 'coordinator:leader'
  | 'coordinator:applyRemote'
  | 'syncWithServer'
  | 'pipeline:dispatch';

export type RealtimeTraceAction =
  | 'received'
  | 'ignored_wrong_doc'
  | 'suppressed'
  | 'deferred'
  | 'remote_scheduled'
  | 'pull_executed'
  | 'pull_deferred_again';

export type ApiEgressKind =
  | 'fetchSyncState'
  | 'pullOps'
  | 'pushOps'
  | 'blocksLoad';

type TraceEvent =
  | {
    kind: 'snapshot';
    t: number;
    origin: SnapshotTraceOrigin;
    decision: 'skip' | 'dispatch';
    reason: SnapshotDiffReason;
    documentId: string;
  }
  | {
    kind: 'realtime';
    t: number;
    action: RealtimeTraceAction;
    documentId: string;
  }
  | {
    kind: 'loading';
    t: number;
    field: string;
    from: unknown;
    to: unknown;
    tag: string;
    documentId: string | null;
  }
  | {
    kind: 'api';
    t: number;
    egress: ApiEgressKind;
    documentId: string;
  }
  | {
    kind: 'render';
    t: number;
    component: string;
    instanceKey?: string;
  };

export type NoteFlickerTraceDump = {
  enabled: boolean;
  startedAt: number;
  elapsedMs: number;
  counters: {
    snapshotSkip: number;
    snapshotDispatch: number;
    snapshotByOrigin: Record<string, { skip: number; dispatch: number }>;
    snapshotByReason: Record<string, number>;
    realtime: Record<string, number>;
    api: Record<string, number>;
    loading: Record<string, number>;
    render: Record<string, number>;
  };
  recent: TraceEvent[];
};

const MAX_RECENT = 120;
const TRACE_STORAGE_KEY = 'NOTE_FLICKER_TRACE';

let enabled = false;
let startedAt = 0;
let initialized = false;

const counters = {
  snapshotSkip: 0,
  snapshotDispatch: 0,
  snapshotByOrigin: {} as Record<string, { skip: number; dispatch: number }>,
  snapshotByReason: {} as Record<string, number>,
  realtime: {} as Record<string, number>,
  api: {} as Record<string, number>,
  loading: {} as Record<string, number>,
  render: {} as Record<string, number>,
};

const recent: TraceEvent[] = [];

function bumpOrigin(origin: SnapshotTraceOrigin, decision: 'skip' | 'dispatch'): void {
  const bucket = counters.snapshotByOrigin[origin] ?? { skip: 0, dispatch: 0 };
  bucket[decision] += 1;
  counters.snapshotByOrigin[origin] = bucket;
}

function bumpCounter(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function pushEvent(event: TraceEvent): void {
  recent.push(event);
  if (recent.length > MAX_RECENT) {
    recent.splice(0, recent.length - MAX_RECENT);
  }
}

function readTraceFlagFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('noteTrace') === '1';
  } catch {
    return false;
  }
}

function readTraceFlagFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(TRACE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function installWindowApi(): void {
  if (typeof window === 'undefined') return;
  const api = {
    enabled: () => enabled,
    reset: () => {
      counters.snapshotSkip = 0;
      counters.snapshotDispatch = 0;
      counters.snapshotByOrigin = {};
      counters.snapshotByReason = {};
      counters.realtime = {};
      counters.api = {};
      counters.loading = {};
      counters.render = {};
      recent.length = 0;
      startedAt = Date.now();
      devLogger.info('[NoteFlickerTrace] counters reset');
    },
    dump: (): NoteFlickerTraceDump => ({
      enabled,
      startedAt,
      elapsedMs: startedAt ? Date.now() - startedAt : 0,
      counters: {
        snapshotSkip: counters.snapshotSkip,
        snapshotDispatch: counters.snapshotDispatch,
        snapshotByOrigin: { ...counters.snapshotByOrigin },
        snapshotByReason: { ...counters.snapshotByReason },
        realtime: { ...counters.realtime },
        api: { ...counters.api },
        loading: { ...counters.loading },
        render: { ...counters.render },
      },
      recent: [...recent],
    }),
    enable: () => {
      try {
        window.localStorage.setItem(TRACE_STORAGE_KEY, '1');
      } catch {
        // ignore
      }
      enabled = true;
      if (!startedAt) startedAt = Date.now();
      devLogger.info('[NoteFlickerTrace] enabled — dump with window.__noteFlickerTrace.dump()');
    },
    disable: () => {
      try {
        window.localStorage.removeItem(TRACE_STORAGE_KEY);
      } catch {
        // ignore
      }
      enabled = false;
      devLogger.info('[NoteFlickerTrace] disabled');
    },
  };
  (window as Window & { __noteFlickerTrace?: typeof api }).__noteFlickerTrace = api;
}

/** URL ?noteTrace=1 또는 localStorage NOTE_FLICKER_TRACE=1 */
export function initNoteFlickerTrace(): boolean {
  if (initialized) return enabled;
  initialized = true;
  enabled = readTraceFlagFromUrl() || readTraceFlagFromStorage();
  if (enabled) {
    startedAt = Date.now();
    installWindowApi();
    devLogger.info('[NoteFlickerTrace] tracing on — window.__noteFlickerTrace.dump()');
  } else if (typeof window !== 'undefined') {
    installWindowApi();
  }
  return enabled;
}

export function isNoteFlickerTraceEnabled(): boolean {
  if (!initialized) return initNoteFlickerTrace();
  return enabled;
}

export function traceSnapshotDecision(
  origin: SnapshotTraceOrigin,
  decision: 'skip' | 'dispatch',
  reason: SnapshotDiffReason,
  documentId: string,
): void {
  if (!isNoteFlickerTraceEnabled()) return;
  if (decision === 'skip') {
    counters.snapshotSkip += 1;
  } else {
    counters.snapshotDispatch += 1;
  }
  bumpOrigin(origin, decision);
  bumpCounter(counters.snapshotByReason, reason);
  pushEvent({
    kind: 'snapshot',
    t: Date.now(),
    origin,
    decision,
    reason,
    documentId,
  });
}

export function traceRealtime(action: RealtimeTraceAction, documentId: string): void {
  if (!isNoteFlickerTraceEnabled()) return;
  bumpCounter(counters.realtime, action);
  pushEvent({
    kind: 'realtime',
    t: Date.now(),
    action,
    documentId,
  });
}

export function traceLoadingState(
  field: string,
  from: unknown,
  to: unknown,
  tag: string,
  documentId: string | null,
): void {
  if (!isNoteFlickerTraceEnabled()) return;
  if (from === to) return;
  bumpCounter(counters.loading, `${field}:${tag}`);
  pushEvent({
    kind: 'loading',
    t: Date.now(),
    field,
    from,
    to,
    tag,
    documentId,
  });
}

export function traceApiEgress(egress: ApiEgressKind, documentId: string): void {
  if (!isNoteFlickerTraceEnabled()) return;
  bumpCounter(counters.api, egress);
  pushEvent({
    kind: 'api',
    t: Date.now(),
    egress,
    documentId,
  });
}

export function traceRender(component: string, instanceKey?: string): void {
  if (!isNoteFlickerTraceEnabled()) return;
  const key = instanceKey ? `${component}#${instanceKey}` : component;
  bumpCounter(counters.render, key);
  pushEvent({
    kind: 'render',
    t: Date.now(),
    component,
    instanceKey,
  });
}

if (typeof window !== 'undefined') {
  initNoteFlickerTrace();
}
