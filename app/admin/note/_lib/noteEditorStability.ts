/**
 * 노트 편집 안정화 스위치.
 * 핵심 편집(타이핑·토글 제목·undo·저장)이 안정된 뒤에만 cross-select 등을 켠다.
 */
export const NOTE_EDITOR_STABILITY = {
  /** 블록 간·미리보기 교차 텍스트 선택 (document 레벨 바인딩) */
  crossBlockTextSelect: true,
  /** TipTap 교차 드래그·리스트 하이라이트 확장 */
  crossBlockEditorExtensions: true,
} as const;
