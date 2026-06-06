import {
  CheckSquare,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  MessageSquareQuote,
  Minus,
  Type,
  Video,
} from 'lucide-react';
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
  { type: 'todo', label: '체크리스트', icon: CheckSquare, desc: '완료 상태를 체크하는 할 일', shortcut: '[]' },
  { type: 'toggle', label: '토글 목록', icon: ChevronDown, desc: '접고 펼치는 섹션', shortcut: '>' },
  { type: 'callout', label: '콜아웃', icon: MessageSquareQuote, desc: '강조 메시지', shortcut: '!!' },
  { type: 'code', label: '코드', icon: Type, desc: '고정폭 코드 블록', shortcut: '```' },
  { type: 'divider', label: '구분선', icon: Minus, desc: '가로 구분선', shortcut: '---' },
  { type: 'image', label: '이미지', icon: ImageIcon, desc: '이미지 업로드 또는 URL' },
  { type: 'video', label: '영상', icon: Video, desc: 'YouTube · Vimeo 임베드' },
  { type: 'page', label: '하위 문서', icon: FileText, desc: '클릭하면 열리는 페이지' },
];

export function defaultBlockContent(type: NoteBlock['type'], options?: { insideToggle?: boolean }) {
  if (type === 'heading') return { text: '' };
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
      body: '',
      collapsed: false,
      depth: 0,
      images: [],
      ...(options?.insideToggle ? { createdInsideToggle: true, placedInToggle: true } : {}),
    };
  }
  if (type === 'callout') return { text: '', icon: '💡', depth: 0 };
  if (type === 'divider') return {};
  if (type === 'page') {
    return {
      page_document_id: '',
      title: '문서',
      ...(options?.insideToggle ? { placedInToggle: true } : {}),
    };
  }
  if (type === 'code') return { text: '', language: 'plain', depth: 0 };
  if (type === 'image') return { url: '' };
  if (type === 'video') return { url: '' };
  if (type === 'text') {
    return {
      text: '',
      depth: 0,
      ...(options?.insideToggle ? { createdInsideToggle: true, placedInToggle: true } : {}),
    };
  }
  return { text: '', depth: 0 };
}

/** 호버한 줄만 핸들 표시 (중첩 토글에서 부모 핸들 동시 노출 방지) */
export const BLOCK_HANDLE_HOVER =
  'opacity-0 pointer-events-none transition-opacity group-hover/block:opacity-100 group-hover/block:pointer-events-auto group-has-[.group\\/block:hover]/block:opacity-0 group-has-[.group\\/block:hover]/block:pointer-events-none';

export function toggleInlineHandleLeft(): string {
  return '-4.25rem';
}

export function toggleMenuAnchorOffset(nestDepth: number): number {
  return Math.max(0, nestDepth - 1) * 18;
}
