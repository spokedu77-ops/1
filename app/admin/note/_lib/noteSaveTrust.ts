/**
 * Save Trust — UI "저장됨" 표시의 유일 게이트.
 * outbound/content pending이면 saved를 찍지 않는다. 훅에서 triggerSave 직호출해도 이 게이트를 탄다.
 */

import { isNoteContentSavePending } from './notePendingSave';

export type NoteSaveTrustGate = {
  hasPendingContent: () => boolean;
  hasPendingOutbound: () => Promise<boolean>;
};

let gate: NoteSaveTrustGate | null = null;

export function registerNoteSaveTrustGate(next: NoteSaveTrustGate | null): void {
  gate = next;
}

/**
 * @returns true면 durable save로 표시해도 됨
 */
export async function reportNoteDurableSave(options: {
  onSaved: () => void;
  onPending?: () => void;
}): Promise<boolean> {
  if (isNoteContentSavePending() || gate?.hasPendingContent() === true) {
    options.onPending?.();
    return false;
  }
  if (gate && await gate.hasPendingOutbound()) {
    options.onPending?.();
    return false;
  }
  options.onSaved();
  return true;
}

/** 기존 `triggerSave: () => void` 자리에 꽂는 게이트드 래퍼 */
export function createGatedTriggerSave(options: {
  onSaved: () => void;
  onPending?: () => void;
}): () => void {
  return () => {
    void reportNoteDurableSave(options);
  };
}
