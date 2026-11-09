'use client';

import { Fragment, useRef, useState, type ComponentType } from 'react';

type RecallProps = { onComplete: () => void; onExit: () => void; audioMode: string; speedSec: number; startDelayMs: number };

/** Repeat an existing complete recall exercise without changing its internal rules. */
export function MemoryRoundSeries({ rounds, onComplete, component: Round, ...recallProps }: {
  rounds: number;
  component: ComponentType<RecallProps>;
  onExit: () => void;
  audioMode: string;
  speedSec: number;
  startDelayMs: number;
  onComplete: () => void;
}) {
  const [round, setRound] = useState(1);
  const completed = useRef(new Set<number>());
  const finishRound = () => {
    if (completed.current.has(round)) return;
    completed.current.add(round);
    if (round >= rounds) onComplete();
    else setRound(round + 1);
  };
  return <>
    <Fragment key={round}><Round {...recallProps} onComplete={finishRound} /></Fragment>
    <div style={{ position: 'fixed', bottom: 20, left: 16, zIndex: 350, color: '#fff', background: '#000b', padding: '6px 10px', borderRadius: 10, fontSize: 12 }}>
      {round} / {rounds}라운드
    </div>
  </>;
}
