'use client';

import { useState, useRef } from 'react';
import { Plus, FileText, MoreHorizontal, X, Check } from 'lucide-react';

export type BoardDocument = {
  id: string;
  title: string;
  properties: {
    group?: string;
    tags?: string[];
    icon?: string;
  } | null;
  updated_at: string;
};

type BoardViewProps = {
  documents: BoardDocument[];
  onSelectDocument: (doc: BoardDocument) => void;
  onCreateDocument: (group: string) => void;
  onUpdateProperties: (docId: string, properties: BoardDocument['properties']) => void;
  onAddGroup: (name: string) => void;
};

const DEFAULT_GROUP = '그룹 없음';

const GROUP_COLORS = [
  'bg-rose-50 border-rose-100',
  'bg-blue-50 border-blue-100',
  'bg-emerald-50 border-emerald-100',
  'bg-violet-50 border-violet-100',
  'bg-amber-50 border-amber-100',
  'bg-sky-50 border-sky-100',
  'bg-fuchsia-50 border-fuchsia-100',
];

function tagColors(idx: number) {
  const palette = [
    'bg-rose-100 text-rose-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700',
    'bg-amber-100 text-amber-700',
    'bg-sky-100 text-sky-700',
    'bg-fuchsia-100 text-fuchsia-700',
    'bg-orange-100 text-orange-700',
  ];
  return palette[idx % palette.length];
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

type CardMenuState = { docId: string; tags: string; tagInput: string } | null;

export function BoardView({
  documents,
  onSelectDocument,
  onCreateDocument,
  onUpdateProperties,
  onAddGroup,
}: BoardViewProps) {
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [cardMenu, setCardMenu] = useState<CardMenuState>(null);
  const newGroupInputRef = useRef<HTMLInputElement>(null);

  // 그룹 목록 추출
  const groupNames = Array.from(
    new Set(documents.map((d) => d.properties?.group ?? DEFAULT_GROUP))
  );
  if (!groupNames.includes(DEFAULT_GROUP)) groupNames.push(DEFAULT_GROUP);

  const byGroup = (group: string) =>
    documents.filter((d) => (d.properties?.group ?? DEFAULT_GROUP) === group);

  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    onAddGroup(name);
    setNewGroupName('');
    setAddingGroup(false);
  };

  const openCardMenu = (doc: BoardDocument) => {
    setCardMenu({
      docId: doc.id,
      tags: (doc.properties?.tags ?? []).join(', '),
      tagInput: '',
    });
  };

  const saveCardMenu = (doc: BoardDocument) => {
    if (!cardMenu) return;
    const tags = cardMenu.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onUpdateProperties(doc.id, { ...(doc.properties ?? {}), tags });
    setCardMenu(null);
  };

  return (
    <div className="flex h-full min-h-0 gap-4 overflow-x-auto overflow-y-hidden p-6">
      {groupNames.map((group, gIdx) => {
        const cards = byGroup(group);
        const colorClass = GROUP_COLORS[gIdx % GROUP_COLORS.length];
        return (
          <div
            key={group}
            className={`flex h-full w-[280px] shrink-0 flex-col rounded-xl border ${colorClass}`}
          >
            {/* 컬럼 헤더 */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[14px] font-semibold text-neutral-700">{group}</span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[12px] font-medium text-neutral-500">
                {cards.length}
              </span>
            </div>

            {/* 카드 목록 */}
            <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
              {cards.map((doc) => {
                const icon = doc.properties?.icon;
                const tags = doc.properties?.tags ?? [];
                const isMenuOpen = cardMenu?.docId === doc.id;
                return (
                  <div key={doc.id} className="group relative rounded-lg border border-white/80 bg-white shadow-sm transition-shadow hover:shadow-md">
                    {/* 카드 본문 */}
                    <button
                      type="button"
                      className="w-full p-3 text-left"
                      onClick={() => onSelectDocument(doc)}
                    >
                      <div className="mb-1.5 flex items-start gap-2">
                        {icon ? (
                          <span className="mt-0.5 text-[16px] leading-none">{icon}</span>
                        ) : (
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" />
                        )}
                        <span className="text-[14px] font-medium leading-snug text-neutral-800">
                          {doc.title}
                        </span>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag, tIdx) => (
                            <span
                              key={tag}
                              className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${tagColors(tIdx)}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>

                    {/* 카드 메뉴 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openCardMenu(doc); }}
                      className="absolute right-2 top-2 hidden rounded p-1 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-600 group-hover:flex"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>

                    {/* 인라인 태그 편집 패널 */}
                    {isMenuOpen && (
                      <div className="border-t border-neutral-100 px-3 pb-3 pt-2">
                        <p className="mb-1.5 text-[11px] font-semibold text-neutral-400">태그 (쉼표로 구분)</p>
                        <input
                          autoFocus
                          value={cardMenu.tags}
                          onChange={(e) => setCardMenu({ ...cardMenu, tags: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveCardMenu(doc); if (e.key === 'Escape') setCardMenu(null); }}
                          className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-[13px] outline-none focus:border-neutral-400"
                          placeholder="협응력, 순발력, 평형성"
                        />
                        <div className="mt-2 flex justify-end gap-1.5">
                          <button type="button" onClick={() => setCardMenu(null)} className="rounded-md px-2 py-1 text-[12px] text-neutral-500 hover:bg-neutral-100">
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => saveCardMenu(doc)} className="rounded-md bg-neutral-900 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-neutral-800">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 새 페이지 추가 */}
            <div className="shrink-0 px-3 pb-3">
              <button
                type="button"
                onClick={() => onCreateDocument(group)}
                className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] text-neutral-500 transition-colors hover:bg-white/60 hover:text-neutral-800"
              >
                <Plus className="h-4 w-4" />
                새 페이지
              </button>
            </div>
          </div>
        );
      })}

      {/* 신규 그룹 추가 */}
      <div className="flex h-fit w-[240px] shrink-0 flex-col">
        {addingGroup ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
            <input
              ref={newGroupInputRef}
              autoFocus
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddGroup(); if (e.key === 'Escape') setAddingGroup(false); }}
              placeholder="그룹 이름"
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-[14px] outline-none focus:border-neutral-400"
            />
            <div className="mt-2 flex gap-1.5">
              <button type="button" onClick={handleAddGroup} className="flex-1 rounded-md bg-neutral-900 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-800">
                추가
              </button>
              <button type="button" onClick={() => setAddingGroup(false)} className="rounded-md px-3 py-1.5 text-[13px] text-neutral-500 hover:bg-neutral-100">
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingGroup(true)}
            className="flex items-center gap-2 rounded-xl border border-dashed border-neutral-200 px-4 py-3 text-[14px] text-neutral-400 transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-600"
          >
            <Plus className="h-4 w-4" />
            신규 그룹
          </button>
        )}
      </div>
    </div>
  );
}
