import type { InlineMark } from '@/app/lib/note/inlineMarkup';

export type NoteDocument = {
  id: string;
  title: string;
  is_archived: boolean;
  is_favorite: boolean;
  is_pinned: boolean;
  is_public: boolean;
  share_token: string | null;
  parent_id: string | null;
  slug: string | null;
  properties?: {
    group?: string;
    tags?: string[];
    icon?: string;
    cover?: string;
    board_order?: number;
  } | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

export type NoteBlock = {
  id: string;
  document_id: string;
  parent_block_id?: string | null;
  type: 'heading' | 'text' | 'todo' | 'divider' | 'image' | 'video' | 'toggle' | 'callout' | 'page' | string;
  order_index: number;
  content: any;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  version?: number;
};

/**
 * idle    — 대기
 * loading — 문서 로드 중
 * saving  — content debounce / 서버 push 전
 * syncing — 서버에 push 보냈으나 아직 outbound 잔여 있음 (재시도 포함)
 * saved   — outbound 비워짐 · DB 반영 완료
 */
export type LoadingState = 'idle' | 'loading' | 'saving' | 'syncing' | 'saved';
export type SortKey = 'recent' | 'title';

export type NoteCollaborator = {
  id: string;
  document_id: string;
  user_id: string;
  last_active_at: string;
  last_cursor: any;
  display_name?: string | null;
};

export type FormatToolbarState = {
  applyMark: (mark: InlineMark) => void;
  applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void;
  applyTextColor: (color: string | null) => void;
  applyHighlight: (color: string | null) => void;
  insertTable?: () => void;
  editLink?: () => void;
  position: { top: number; left: number };
};
