export const NUMBER_READER_ZONES = [
  { number: 1, id: 'red', name: '빨강', color: '#ef4444' },
  { number: 2, id: 'yellow', name: '노랑', color: '#facc15' },
  { number: 3, id: 'green', name: '초록', color: '#22c55e' },
  { number: 4, id: 'blue', name: '파랑', color: '#3b82f6' },
] as const;

export type NumberReaderPhase = 'READY' | 'FLY' | 'ACTION' | 'REVEAL';
export type NumberReaderTrial = {
  number: 1 | 2 | 3 | 4;
  path: 0 | 1 | 2 | 3;
  start: { x: number; y: number };
  end: { x: number; y: number };
};

export function normalizeNumberReaderSeconds(value?: number) {
  return Number.isFinite(value) ? Math.min(10, Math.max(1, Math.round(value! * 2) / 2)) : 3;
}

export function normalizeNumberReaderReps(value?: number) {
  return [10, 15, 20, 30].includes(value ?? 0) ? value! : 20;
}

export function numberReaderPhaseSeconds(phase: NumberReaderPhase, flightSeconds: number) {
  return phase === 'READY' ? 1.5 : phase === 'FLY' ? normalizeNumberReaderSeconds(flightSeconds) : phase === 'ACTION' ? 3 : 2.5;
}

export function createNumberReaderTrial(random = Math.random): NumberReaderTrial {
  const number = (Math.floor(random() * 4) + 1) as NumberReaderTrial['number'];
  const path = Math.floor(random() * 4) as NumberReaderTrial['path'];
  const a = 0.2 + random() * 0.6;
  const b = 0.2 + random() * 0.6;
  // The original's four opposite-edge paths; normalized coordinates survive resize.
  const [start, end] = path === 0 ? [{ x: -0.15, y: a }, { x: 1.15, y: b }]
    : path === 1 ? [{ x: 1.15, y: a }, { x: -0.15, y: b }]
      : path === 2 ? [{ x: a, y: -0.15 }, { x: b, y: 1.15 }]
        : [{ x: a, y: 1.15 }, { x: b, y: -0.15 }];
  return { number, path, start: start!, end: end! };
}

export function numberReaderPosition(trial: NumberReaderTrial, progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return { x: trial.start.x + (trial.end.x - trial.start.x) * t,
    y: trial.start.y + (trial.end.y - trial.start.y) * t };
}

export function numberReaderPillars(round: number) { return round < 3 ? 0 : round < 5 ? 1 : 3; }

export function numberReaderRadius(round: number, width: number, height: number) {
  const base = Math.min(width, height) * 0.08;
  return Math.max(base - round * 2, base * 0.5);
}

export function numberReaderOccluders(round: number, trial: NumberReaderTrial) {
  const count = numberReaderPillars(round);
  return Array.from({ length: count }, (_, index) => {
    const position = (index + 1) / (count + 1) - 0.06;
    return trial.path < 2 ? { x: position, y: 0, width: 0.12, height: 1 }
      : { x: 0, y: position, width: 1, height: 0.12 };
  });
}
