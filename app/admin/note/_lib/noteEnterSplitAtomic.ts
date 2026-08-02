import type { NoteBlock } from './types';

/**
 * C4 EnterSplitAtomic — mid-block Enter는 before 패치 + below create가 한 트랜잭션.
 * create 실패(null/false/throw) 시 호출측이 restore로 분할 전 본문을 되돌린다.
 */
export function enterSplitCreateFailed(result: unknown): boolean {
  return result === null || result === false;
}

export async function settleEnterSplitCreate(
  createResult: unknown,
): Promise<boolean> {
  try {
    const settled = await Promise.resolve(createResult);
    return !enterSplitCreateFailed(settled);
  } catch {
    return false;
  }
}

export type EnterSplitRestoreContent = {
  text: string;
  html: string;
};

/** createBelow 실패 시 restore 적용 — store + 선택적 에디터 */
export async function runAtomicEnterSplitCreate(options: {
  createBelow: () => Promise<NoteBlock | null | false | void> | NoteBlock | null | false | void;
  restore: (content: EnterSplitRestoreContent) => void;
  restoreContent: EnterSplitRestoreContent;
}): Promise<boolean> {
  const ok = await settleEnterSplitCreate(options.createBelow());
  if (!ok) {
    options.restore(options.restoreContent);
    return false;
  }
  return true;
}
