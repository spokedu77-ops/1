import { describe, expect, it } from 'vitest';
import {
  collectEphemeralQaDocumentIds,
  isEphemeralQaDocumentTitle,
} from '../../../../scripts/note-qa/cleanupEphemeralDocs.mjs';
import { NOTE_QA_DOCUMENTS } from '../../../../scripts/note-qa/shared.mjs';

function doc(id: string, title: string, parent_id: string | null = null) {
  return { id, title, parent_id };
}

describe('admin note ephemeral QA document cleanup', () => {
  it('matches smoke and regression document title families', () => {
    expect(isEphemeralQaDocumentTitle('Smoke 1784358775697')).toBe(true);
    expect(isEphemeralQaDocumentTitle('Smoke Callout Paste 1784358806777')).toBe(true);
    expect(isEphemeralQaDocumentTitle('Regression QA 1784358775697')).toBe(true);
    expect(isEphemeralQaDocumentTitle('Toggle KB QA 1784358775697')).toBe(true);
    expect(isEphemeralQaDocumentTitle('Toggle Zombie QA 1784358775697')).toBe(true);
    expect(isEphemeralQaDocumentTitle('공통 보드')).toBe(false);
  });

  it('collects descendants of ephemeral documents even with ordinary child titles', () => {
    const ids = collectEphemeralQaDocumentIds([
      doc('smoke', 'Smoke 1784358775697'),
      doc('child-ko', '제목 없음', 'smoke'),
      doc('child-en', 'Untitled', 'smoke'),
      doc('real', '최지훈 업무노트'),
    ]);

    expect(new Set(ids)).toEqual(new Set(['smoke', 'child-ko', 'child-en']));
  });

  it('never deletes fixed QA documents even when their titles look temporary', () => {
    const protectedId = NOTE_QA_DOCUMENTS[0]?.id ?? 'protected';
    const ids = collectEphemeralQaDocumentIds([
      doc(protectedId, 'Smoke protected fixed doc'),
      doc('child', 'Untitled', protectedId),
    ]);

    expect(ids).toEqual([]);
  });
});
