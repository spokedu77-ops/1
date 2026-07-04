import {
  CheckSquare,
  ChevronDown,
  Columns2,
  FileText,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  MessageSquareQuote,
  Minus,
  Quote,
  Table2,
  Type,
  Video,
} from 'lucide-react';
import { defaultTableBlockContent } from './noteTableBlock';
import { defaultColumnContent, defaultColumnListContent } from './noteColumnBlock';
import { defaultImageBlockContent } from './noteImageBlock';
import type { NoteBlock } from './types';

export const BLOCK_TYPES: {
  type: NoteBlock['type'];
  label: string;
  icon: React.ElementType;
  desc: string;
  shortcut?: string;
}[] = [
  { type: 'text', label: '텍스트', icon: FileText, desc: '일반 문단' },
  { type: 'heading', label: '제목 1', icon: Type, desc: '큰 섹션 제목', shortcut: '#' },
  { type: 'heading2', label: '제목 2', icon: Heading2, desc: '중간 섹션 제목', shortcut: '##' },
  { type: 'heading3', label: '제목 3', icon: Heading3, desc: '소제목', shortcut: '###' },
  { type: 'bulletList', label: '글머리 기호 목록', icon: List, desc: '순서 없는 목록', shortcut: '-' },
  { type: 'numberedList', label: '번호 매기기 목록', icon: ListOrdered, desc: '순서 있는 목록', shortcut: '1.' },
  { type: 'todo', label: '체크리스트', icon: CheckSquare, desc: '완료 상태를 체크하는 할 일', shortcut: '[]' },
  { type: 'toggle', label: '토글 목록', icon: ChevronDown, desc: '접고 펼치는 섹션', shortcut: '>' },
  { type: 'callout', label: '콜아웃', icon: MessageSquareQuote, desc: '강조 메시지', shortcut: '!!' },
  { type: 'quote', label: '인용', icon: Quote, desc: '인용문 블록' },
  { type: 'code', label: '코드', icon: Type, desc: '고정폭 코드 블록', shortcut: '```' },
  { type: 'table', label: '표', icon: Table2, desc: '행·열 표 블록' },
  { type: 'columnList', label: '2단 레이아웃', icon: Columns2, desc: '나란히 2개 열' },
  { type: 'divider', label: '구분선', icon: Minus, desc: '가로 구분선', shortcut: '---' },
  { type: 'image', label: '이미지', icon: ImageIcon, desc: '이미지 업로드 또는 URL' },
  { type: 'video', label: '영상', icon: Video, desc: 'YouTube · Vimeo 임베드' },
  { type: 'page', label: '하위 문서', icon: FileText, desc: '클릭하면 열리는 페이지' },
];

export function defaultBlockContent(type: NoteBlock['type'], options?: { insideToggle?: boolean }) {
  if (type === 'heading') return { text: '' };
  if (type === 'heading2') return { text: '' };
  if (type === 'heading3') return { text: '' };
  if (type === 'bulletList') return { text: '', number: 1 };
  if (type === 'numberedList') return { text: '', number: 1 };
  if (type === 'todo') {
    return {
      text: '',
      checked: false,
      ...(options?.insideToggle ? { createdInsideToggle: true } : {}),
    };
  }
  if (type === 'toggle') {
    return {
      title: '',
      collapsed: false,
      ...(options?.insideToggle ? { createdInsideToggle: true, placedInToggle: true } : {}),
    };
  }
  if (type === 'callout') return { text: '', icon: '💡' };
  if (type === 'quote') return { text: '' };
  if (type === 'divider') return {};
  if (type === 'page') {
    return {
      page_document_id: '',
      title: '문서',
      ...(options?.insideToggle ? { placedInToggle: true } : {}),
    };
  }
  if (type === 'code') return { text: '', language: 'plain' };
  if (type === 'table') return defaultTableBlockContent();
  if (type === 'columnList') return defaultColumnListContent();
  if (type === 'column') return defaultColumnContent();
  if (type === 'image') return defaultImageBlockContent();
  if (type === 'video') return { url: '' };
  if (type === 'text') {
    return {
      text: '',
      ...(options?.insideToggle ? { createdInsideToggle: true, placedInToggle: true } : {}),
    };
  }
  return { text: '' };
}

export const NOTE_PAGE_SHELL = 'mx-auto w-full max-w-[720px] px-14 md:px-16';
/** 마퀴 선택 — 에디터 열 전체(사이드바 바로 옆 여백 포함) */
export const NOTE_MARQUEE_ZONE = 'w-full min-h-[36vh] cursor-default';
export const NOTE_BLOCK_HANDLE_LEFT = '-left-[54px]';
/** 페이지 왼쪽 거터 — 모든 블록 핸들이 여기 정렬 */
export const NOTE_GUTTER_PX = 54;
/** 거터(+·⋮⋮) 포함 왼쪽 드래그 선택 히트 폭 (nest 1 기준) */
export const NOTE_GUTTER_SELECT_HIT_PX = 96;
/** 토글 자식 한 단계 들여쓰기 (pl-[1.625rem]) */
export const TOGGLE_INDENT_PX = 26;

/** 토글·목록 중첩 — 블록 row 왼쪽 패딩 (거터는 row 기준 고정) */
export function toggleNestPaddingPx(nestDepth: number): number {
  return Math.max(0, nestDepth - 1) * TOGGLE_INDENT_PX;
}

/** +·⋮⋮ — 항상 row 왼쪽 고정 (콘텐츠 들여쓰기와 분리) */
export function blockHandleLeftPx(_nestDepth?: number): number {
  return -NOTE_GUTTER_PX;
}

export function toggleMenuAnchorOffset(nestDepth: number): number {
  return Math.max(0, nestDepth - 1) * 18;
}

/** 노션처럼 거터는 블록 전체 중앙이 아니라 첫 줄 기준 정렬 */
export function blockGutterTopPx(type: NoteBlock['type']): number | 'center' {
  switch (type) {
    case 'heading':
      return 2;
    case 'heading2':
      return 2;
    case 'heading3':
      return 2;
    case 'todo':
    case 'text':
    case 'page':
    case 'toggle':
    case 'bulletList':
    case 'numberedList':
      return 3;
    case 'divider':
    case 'image':
    case 'video':
    case 'callout':
    case 'quote':
    case 'code':
    case 'table':
    case 'columnList':
      return 'center';
    default:
      return 3;
  }
}
