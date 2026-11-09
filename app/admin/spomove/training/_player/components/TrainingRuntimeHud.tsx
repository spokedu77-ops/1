'use client';

import type { ReactNode } from 'react';
import { EMBED_SAFE_TOP } from '../lib/embedViewport';

/** Shared REPS/TIME and STOP controls used by the standard player and visual search. */
export function TrainingRuntimeHud({ children, onStop, flow = false, stopLabel = 'STOP' }: {
  children: ReactNode;
  onStop: () => void;
  flow?: boolean;
  stopLabel?: string;
}) {
  return <div style={{
    display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, zIndex: 20,
    ...(flow ? { marginTop: EMBED_SAFE_TOP, marginLeft: '1.25rem', marginRight: '1.25rem', flexShrink: 0 }
      : { position: 'absolute', top: EMBED_SAFE_TOP, left: '1.25rem', right: '1.25rem' }),
  }}>
    <div style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '0.6rem 1.2rem', color: '#fff', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {children}
    </div>
    <button type="button" onClick={onStop} style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontSize: '1rem', cursor: 'pointer', fontWeight: 800, letterSpacing: '0.08em' }}>{stopLabel}</button>
  </div>;
}
