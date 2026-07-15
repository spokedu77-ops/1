'use client';

import { isNoteFlickerTraceEnabled, traceRender } from '../_lib/noteFlickerTrace';

/** dev trace — 컴포넌트 render 횟수 (NOTE_FLICKER_TRACE=1 또는 ?noteTrace=1) */
export function useNoteFlickerRenderCount(component: string, instanceKey?: string): void {
  if (!isNoteFlickerTraceEnabled()) return;
  traceRender(component, instanceKey);
}
