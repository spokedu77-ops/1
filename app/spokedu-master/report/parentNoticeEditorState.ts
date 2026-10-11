export type ParentNoticeEditorState = {
  sessionId: string;
  draft: string;
  baseline: string;
};

export const PARENT_NOTICE_DISCARD_PROMPT = '저장하지 않은 변경사항이 있습니다. 이동하면 작성 내용이 사라집니다. 계속할까요?';

const normalizeNotice = (value: string) => value.trim();

export function isParentNoticeDirty(editor: ParentNoticeEditorState | null) {
  return editor != null && normalizeNotice(editor.draft) !== normalizeNotice(editor.baseline);
}

export function reconcileParentNoticeEditor(
  current: ParentNoticeEditorState | null,
  sessionId: string,
  persistedNotice: string,
): ParentNoticeEditorState {
  if (!current || current.sessionId !== sessionId) {
    return { sessionId, draft: persistedNotice, baseline: persistedNotice };
  }
  if (isParentNoticeDirty(current)) return current;
  return { sessionId, draft: persistedNotice, baseline: persistedNotice };
}

export function selectParentNoticeSession(
  current: ParentNoticeEditorState | null,
  nextSessionId: string,
  nextPersistedNotice: string,
  discardApproved: boolean,
) {
  if (current && current.sessionId !== nextSessionId && isParentNoticeDirty(current) && !discardApproved) {
    return current;
  }
  return reconcileParentNoticeEditor(null, nextSessionId, nextPersistedNotice);
}

export function confirmParentNoticeSaved(
  current: ParentNoticeEditorState,
  savedDraft: string,
): ParentNoticeEditorState {
  const confirmed = normalizeNotice(savedDraft);
  return {
    ...current,
    draft: normalizeNotice(current.draft) === confirmed ? confirmed : current.draft,
    baseline: confirmed,
  };
}
