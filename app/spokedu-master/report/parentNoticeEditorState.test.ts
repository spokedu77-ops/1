import { describe, expect, it } from 'vitest';
import {
  confirmParentNoticeSaved,
  isParentNoticeDirty,
  reconcileParentNoticeEditor,
  selectParentNoticeSession,
  type ParentNoticeEditorState,
} from './parentNoticeEditorState';

const editing = (): ParentNoticeEditorState => ({
  sessionId: 'session-a',
  baseline: '서버 안내문 A',
  draft: '교사가 작성 중인 안내문',
});

describe('parent notice editor state', () => {
  it('keeps the active draft when a session change is cancelled', () => {
    const current = editing();
    expect(selectParentNoticeSession(current, 'session-b', '서버 안내문 B', false)).toBe(current);
  });

  it('loads only the approved target session notice', () => {
    expect(selectParentNoticeSession(editing(), 'session-b', '서버 안내문 B', true)).toEqual({
      sessionId: 'session-b',
      baseline: '서버 안내문 B',
      draft: '서버 안내문 B',
    });
  });

  it('preserves an edited draft during background reconciliation', () => {
    const current = editing();
    expect(reconcileParentNoticeEditor(current, 'session-a', '외부에서 변경된 안내문')).toBe(current);
  });

  it('accepts background server data when the editor is clean', () => {
    const current = reconcileParentNoticeEditor(null, 'session-a', '이전 안내문');
    expect(reconcileParentNoticeEditor(current, 'session-a', '최신 안내문')).toEqual({
      sessionId: 'session-a',
      baseline: '최신 안내문',
      draft: '최신 안내문',
    });
  });

  it('clears dirty state only after confirmed save while retaining later typing', () => {
    const current = editing();
    const saved = confirmParentNoticeSaved(current, current.draft);
    expect(isParentNoticeDirty(saved)).toBe(false);

    const typedDuringSave = { ...current, draft: '저장 요청 뒤에 더 작성한 내용' };
    const reconciled = confirmParentNoticeSaved(typedDuringSave, current.draft);
    expect(reconciled.draft).toBe('저장 요청 뒤에 더 작성한 내용');
    expect(isParentNoticeDirty(reconciled)).toBe(true);
  });

  it('keeps the draft dirty when a failed save produces no confirmation', () => {
    const current = editing();
    expect(isParentNoticeDirty(current)).toBe(true);
    expect(current.draft).toBe('교사가 작성 중인 안내문');
  });
});
