'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, FileText, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import type { NoteV2TreeNode, NoteV2TreeRow } from '@/app/lib/note-v2/tree-core';

type Props = {
  roots: NoteV2TreeNode[];
  trash: NoteV2TreeRow[];
  selectedId: string | null;
  expanded: ReadonlySet<string>;
  showTrash: boolean;
  busy: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onToggle: (id: string) => void;
  onToggleTrash: () => void;
  onSelect: (id: string) => void;
  onCreate: (parentId: string | null) => void;
  onRename: (id: string, title: string, expectedTitle: string) => Promise<boolean>;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onTrash: (id: string) => void;
  onRestore: (id: string) => void;
};

function RenameInput({ title, onCommit, onCancel }: { title: string; onCommit: (value: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(title);
  const done = useRef(false);
  const submit = () => {
    if (done.current) return;
    done.current = true;
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) onCancel();
    else onCommit(trimmed);
  };
  return <input autoFocus aria-label="페이지 제목 수정" className="w-full min-w-0 rounded border border-blue-300 bg-white px-1 py-0.5 text-sm outline-none" value={value} maxLength={200}
    onChange={(e) => setValue(e.target.value)} onClick={(e) => e.stopPropagation()}
    onBlur={submit} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') submit(); if (e.key === 'Escape') { done.current = true; onCancel(); } }}/>
}

export default function NoteStage4Sidebar(props: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameFailed, setRenameFailed] = useState<string | null>(null);
  useEffect(() => { if (!props.selectedId) setEditingId(null); }, [props.selectedId]);

  const renderPage = (node: NoteV2TreeNode, depth: number, siblingIndex: number, siblingCount: number): ReactNode => {
    const expanded = props.expanded.has(node.id);
    const active = props.selectedId === node.id;
    return (
      <div key={node.id}>
        <div className={`group flex min-h-9 items-center gap-0.5 rounded-md px-1 text-sm ${active ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-100'}`}
          style={{ paddingLeft: `${Math.min(depth, 10) * 12 + 4}px` }}>
          <button type="button" aria-label={expanded ? '하위 페이지 접기' : '하위 페이지 펼치기'} disabled={props.busy}
            className="grid size-6 shrink-0 place-items-center rounded hover:bg-neutral-200" onClick={() => props.onToggle(node.id)}>
            {node.children.length ? (expanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>) : <span className="text-xs text-neutral-300">·</span>}
          </button>
          <FileText size={15} className="shrink-0 text-neutral-400" />
          {editingId === node.id ? (
            <RenameInput key={node.id} title={node.title} onCancel={() => setEditingId(null)} onCommit={(title) => {
              setEditingId(null);
              void props.onRename(node.id, title, node.title).then((ok) => { if (!ok) setRenameFailed(node.id); else setRenameFailed(null); });
            }}/>
          ) : (
            <button type="button" disabled={props.busy} className="min-w-0 flex-1 truncate px-1 py-1 text-left" title={node.title}
              onClick={() => props.onSelect(node.id)} onDoubleClick={() => { setEditingId(node.id); setRenameFailed(null); }}>{node.title}</button>
          )}
          <div className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button type="button" disabled={props.busy} aria-label={`${node.title} 하위 페이지 추가`} title="하위 페이지 추가" className="grid size-7 place-items-center rounded hover:bg-neutral-200" onClick={() => props.onCreate(node.id)}><Plus size={14}/></button>
            <details className="relative">
              <summary aria-label={`${node.title} 페이지 옵션`} className="grid size-7 list-none cursor-pointer place-items-center rounded hover:bg-neutral-200" title="페이지 옵션">···</summary>
              <div className="absolute right-0 top-7 z-30 w-40 rounded-lg border border-neutral-200 bg-white p-1 shadow-xl">
                <button type="button" disabled={props.busy} className="block w-full rounded px-3 py-2 text-left text-xs hover:bg-neutral-100" onClick={(e) => { e.currentTarget.closest('details')?.removeAttribute('open'); setEditingId(node.id); }}>이름 변경</button>
                <button type="button" disabled={props.busy || siblingIndex === 0} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs hover:bg-neutral-100 disabled:opacity-30" onClick={(e) => { e.currentTarget.closest('details')?.removeAttribute('open'); props.onReorder(node.id, 'up'); }}><ChevronUp size={14}/> 위로 이동</button>
                <button type="button" disabled={props.busy || siblingIndex >= siblingCount - 1} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs hover:bg-neutral-100 disabled:opacity-30" onClick={(e) => { e.currentTarget.closest('details')?.removeAttribute('open'); props.onReorder(node.id, 'down'); }}><ChevronDown size={14}/> 아래로 이동</button>
                <button type="button" disabled={props.busy} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50" onClick={(e) => { e.currentTarget.closest('details')?.removeAttribute('open'); props.onTrash(node.id); }}><Trash2 size={14}/> 휴지통으로</button>
              </div>
            </details>
          </div>
        </div>
        {renameFailed === node.id && <p className="pl-8 text-xs text-red-700">이름 변경 실패. 목록을 확인하세요.</p>}
        {expanded && node.children.map((child, index) => renderPage(child, depth + 1, index, node.children.length))}
      </div>
    );
  };

  return <>
    {props.mobileOpen && <button type="button" aria-label="사이드바 닫기" className="fixed inset-0 z-30 bg-black/35 md:hidden" onClick={props.onMobileClose}/>}
    <aside data-testid="note-v2-stage4-sidebar" className={`${props.mobileOpen ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-40 w-[min(85vw,290px)] shrink-0 flex-col border-r border-neutral-200 bg-[#f7f7f5] md:static md:flex md:w-[270px]`}>
      <header className="flex min-h-14 items-center justify-between border-b border-neutral-200 px-4">
        <strong className="text-sm tracking-tight text-neutral-700">SPOKEDU 노트</strong>
        <button className="md:hidden" type="button" aria-label="사이드바 닫기" onClick={props.onMobileClose}><X size={18}/></button>
      </header>
      <div className="flex items-center justify-between px-3 py-3">
        <span className="pl-1 text-xs font-semibold text-neutral-500">내 페이지</span>
        <button type="button" disabled={props.busy} onClick={() => props.onCreate(null)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-neutral-200" aria-label="새 최상위 페이지"><Plus size={15}/> 새 페이지</button>
      </div>
      <nav aria-label="노트 페이지" className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {!props.roots.length && <p className="px-3 py-3 text-sm text-neutral-500">아직 페이지가 없습니다.</p>}
        {props.roots.map((node, index) => renderPage(node, 0, index, props.roots.length))}
      </nav>
      <div className="border-t border-neutral-200 p-2">
        <button type="button" onClick={props.onToggleTrash} aria-expanded={props.showTrash} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-200">
          <Trash2 size={16}/> 휴지통 <span className="ml-auto text-xs">{props.trash.length}</span>
        </button>
        {props.showTrash && <div className="max-h-48 space-y-1 overflow-y-auto pb-2">
          {!props.trash.length && <p className="px-3 py-2 text-xs text-neutral-500">삭제한 페이지가 없습니다.</p>}
          {props.trash.map((doc) => <div className="flex items-center gap-1 rounded px-3 py-1 text-xs" key={doc.id}>
            <span title={doc.title} className="min-w-0 flex-1 truncate text-neutral-500">{doc.title}</span>
            <button type="button" disabled={props.busy} className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-blue-700 hover:bg-neutral-200" onClick={() => props.onRestore(doc.id)}><RotateCcw size={12}/> 복구</button>
          </div>)}
        </div>}
        <p className="px-3 pb-1 pt-2 text-[11px] leading-4 text-neutral-400">페이지를 더블클릭해 이름을 변경할 수 있습니다.</p>
      </div>
    </aside>
  </>;
}
