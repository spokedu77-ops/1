'use client';

import { useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, FileText, MoreHorizontal, X, Check, GripVertical } from 'lucide-react';

export type BoardDocument = {
  id: string;
  title: string;
  properties: {
    group?: string;
    tags?: string[];
    icon?: string;
    board_order?: number;
  } | null;
  updated_at: string;
};

export const BOARD_DEFAULT_GROUP = '그룹 없음';

type BoardViewProps = {
  documents: BoardDocument[];
  onSelectDocument: (doc: BoardDocument) => void;
  onCreateDocument: (group: string) => void;
  onUpdateProperties: (docId: string, properties: BoardDocument['properties']) => void;
  onMoveToGroup: (docId: string, group: string) => void;
  onRenameGroup: (oldName: string, newName: string) => void;
  onDeleteGroup: (group: string) => void;
  onReorderInGroup: (group: string, orderedIds: string[]) => void;
};

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

function docGroup(doc: BoardDocument): string {
  return doc.properties?.group?.trim() || BOARD_DEFAULT_GROUP;
}

function sortBoardCards(cards: BoardDocument[]): BoardDocument[] {
  return [...cards].sort((a, b) => {
    const ao = a.properties?.board_order;
    const bo = b.properties?.board_order;
    if (typeof ao === 'number' && typeof bo === 'number' && ao !== bo) return ao - bo;
    if (typeof ao === 'number' && typeof bo !== 'number') return -1;
    if (typeof ao !== 'number' && typeof bo === 'number') return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

type CardMenuState = { docId: string; tags: string } | null;

function BoardCard({
  doc,
  isMenuOpen,
  onOpen,
  onOpenMenu,
  onSaveMenu,
  onCloseMenu,
  cardMenu,
  setCardMenu,
  isDragging,
}: {
  doc: BoardDocument;
  isMenuOpen: boolean;
  onOpen: () => void;
  onOpenMenu: () => void;
  onSaveMenu: () => void;
  onCloseMenu: () => void;
  cardMenu: CardMenuState;
  setCardMenu: React.Dispatch<React.SetStateAction<CardMenuState>>;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isDragActive,
  } = useSortable({
    id: `board-card:${doc.id}`,
    data: { type: 'board-card', docId: doc.id, group: docGroup(doc) },
  });
  const icon = doc.properties?.icon?.trim();
  const tags = doc.properties?.tags ?? [];
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragActive || isDragging ? 0.45 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative rounded-lg border border-white/80 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-1 p-2">
        <button
          type="button"
          className="mt-0.5 flex h-5 w-4 shrink-0 cursor-grab items-center justify-center rounded text-neutral-300 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-neutral-500 group-hover:opacity-100 active:cursor-grabbing"
          aria-label="드래그하여 그룹 이동"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
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
            <div className="mb-1.5 flex flex-wrap gap-1">
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
          <p className="text-[11px] text-neutral-400">{relativeTime(doc.updated_at)}</p>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenMenu(); }}
          className="shrink-0 rounded p-1 text-neutral-300 opacity-0 transition-all hover:bg-neutral-100 hover:text-neutral-600 group-hover:opacity-100"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {isMenuOpen && cardMenu && (
        <div className="border-t border-neutral-100 px-3 pb-3 pt-2">
          <p className="mb-1.5 text-[11px] font-semibold text-neutral-400">태그 (쉼표로 구분)</p>
          <input
            autoFocus
            value={cardMenu.tags}
            onChange={(e) => setCardMenu({ ...cardMenu, tags: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveMenu();
              if (e.key === 'Escape') onCloseMenu();
            }}
            className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-[13px] outline-none focus:border-neutral-400"
            placeholder="협응력, 순발력, 평형성"
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <button type="button" onClick={onCloseMenu} className="rounded-md px-2 py-1 text-[12px] text-neutral-500 hover:bg-neutral-100">
              <X className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={onSaveMenu} className="rounded-md bg-neutral-900 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-neutral-800">
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BoardColumn({
  group,
  colorClass,
  cards,
  cardMenu,
  setCardMenu,
  onSelectDocument,
  onCreateDocument,
  onUpdateProperties,
  activeDragDocId,
  onRenameGroup,
  onDeleteGroup,
  onRemoveExtraGroup,
}: {
  group: string;
  colorClass: string;
  cards: BoardDocument[];
  cardMenu: CardMenuState;
  setCardMenu: React.Dispatch<React.SetStateAction<CardMenuState>>;
  onSelectDocument: (doc: BoardDocument) => void;
  onCreateDocument: (group: string) => void;
  onUpdateProperties: (docId: string, properties: BoardDocument['properties']) => void;
  activeDragDocId: string | null;
  onRenameGroup: (oldName: string, newName: string) => void;
  onDeleteGroup: (group: string) => void;
  onRemoveExtraGroup: (group: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(group);
  const [showColMenu, setShowColMenu] = useState(false);
  const canManage = group !== BOARD_DEFAULT_GROUP;
  const { setNodeRef, isOver } = useDroppable({
    id: `board-col:${group}`,
    data: { type: 'board-column', group },
  });

  const openCardMenu = (doc: BoardDocument) => {
    setCardMenu({
      docId: doc.id,
      tags: (doc.properties?.tags ?? []).join(', '),
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
    <div
      ref={setNodeRef}
      className={`flex h-full w-[280px] shrink-0 flex-col rounded-xl border transition-colors ${colorClass} ${
        isOver ? 'ring-2 ring-blue-300 ring-offset-1' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        {renaming ? (
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const trimmed = renameDraft.trim();
                if (trimmed && trimmed !== group) onRenameGroup(group, trimmed);
                setRenaming(false);
              }
              if (e.key === 'Escape') { setRenaming(false); setRenameDraft(group); }
            }}
            onBlur={() => {
              const trimmed = renameDraft.trim();
              if (trimmed && trimmed !== group) onRenameGroup(group, trimmed);
              setRenaming(false);
            }}
            className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[14px] font-semibold outline-none focus:border-neutral-400"
          />
        ) : (
          <span className="truncate text-[14px] font-semibold text-neutral-700">{group}</span>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[12px] font-medium text-neutral-500">
            {cards.length}
          </span>
          {canManage && !renaming && (
            <div className="relative">
              <button
                type="button"
                className="rounded p-1 text-neutral-400 hover:bg-white/80 hover:text-neutral-600"
                onClick={() => setShowColMenu((v) => !v)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showColMenu && (
                <div className="absolute right-0 top-full z-20 mt-1 w-[140px] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-[13px] text-neutral-700 hover:bg-neutral-50"
                    onClick={() => { setRenaming(true); setRenameDraft(group); setShowColMenu(false); }}
                  >
                    이름 변경
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-[13px] text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      setShowColMenu(false);
                      if (confirm(`"${group}" 그룹을 삭제할까요? 카드는 그룹 없음으로 이동합니다.`)) {
                        onDeleteGroup(group);
                        onRemoveExtraGroup(group);
                      }
                    }}
                  >
                    그룹 삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {cards.length === 0 && isOver && (
          <div className="rounded-lg border border-dashed border-blue-300 bg-white/70 px-3 py-6 text-center text-[12px] text-blue-500">
            여기에 놓기
          </div>
        )}
        <SortableContext
          items={cards.map((doc) => `board-card:${doc.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((doc) => (
            <BoardCard
              key={doc.id}
              doc={doc}
              isMenuOpen={cardMenu?.docId === doc.id}
              onOpen={() => onSelectDocument(doc)}
              onOpenMenu={() => openCardMenu(doc)}
              onSaveMenu={() => saveCardMenu(doc)}
              onCloseMenu={() => setCardMenu(null)}
              cardMenu={cardMenu}
              setCardMenu={setCardMenu}
              isDragging={activeDragDocId === doc.id}
            />
          ))}
        </SortableContext>
      </div>

      <div className="shrink-0 px-3 pb-3">
        <button
          type="button"
          onClick={() => onCreateDocument(group === BOARD_DEFAULT_GROUP ? '' : group)}
          className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] text-neutral-500 transition-colors hover:bg-white/60 hover:text-neutral-800"
        >
          <Plus className="h-4 w-4" />
          새 페이지
        </button>
      </div>
    </div>
  );
}

function BoardCardPreview({ doc }: { doc: BoardDocument }) {
  const icon = doc.properties?.icon?.trim();
  return (
    <div className="w-[248px] rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
      <div className="flex items-start gap-2">
        {icon ? (
          <span className="text-[16px] leading-none">{icon}</span>
        ) : (
          <FileText className="h-4 w-4 shrink-0 text-neutral-300" />
        )}
        <span className="text-[14px] font-medium text-neutral-800">{doc.title}</span>
      </div>
    </div>
  );
}

export function BoardView({
  documents,
  onSelectDocument,
  onCreateDocument,
  onUpdateProperties,
  onMoveToGroup,
  onRenameGroup,
  onDeleteGroup,
  onReorderInGroup,
}: BoardViewProps) {
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [extraGroups, setExtraGroups] = useState<string[]>([]);
  const [cardMenu, setCardMenu] = useState<CardMenuState>(null);
  const [activeDragDocId, setActiveDragDocId] = useState<string | null>(null);
  const newGroupInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const groupNames = useMemo(() => {
    const fromDocs = documents.map((d) => docGroup(d));
    const merged = Array.from(new Set([...fromDocs, ...extraGroups, BOARD_DEFAULT_GROUP]));
    const named = merged
      .filter((g) => g !== BOARD_DEFAULT_GROUP)
      .sort((a, b) => a.localeCompare(b, 'ko'));
    return [BOARD_DEFAULT_GROUP, ...named];
  }, [documents, extraGroups]);

  const byGroup = (group: string) =>
    sortBoardCards(documents.filter((d) => docGroup(d) === group));

  const activeDragDoc = activeDragDocId
    ? documents.find((d) => d.id === activeDragDocId) ?? null
    : null;

  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (!name || groupNames.includes(name)) {
      setAddingGroup(false);
      setNewGroupName('');
      return;
    }
    setExtraGroups((prev) => [...prev, name]);
    setNewGroupName('');
    setAddingGroup(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith('board-card:')) {
      setActiveDragDocId(id.replace('board-card:', ''));
      setCardMenu(null);
    }
  };

  const handleColumnRename = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) return;
    onRenameGroup(oldName, trimmed);
    setExtraGroups((prev) => prev.map((g) => (g === oldName ? trimmed : g)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragDocId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith('board-card:')) return;

    const docId = activeId.replace('board-card:', '');
    const activeDoc = documents.find((d) => d.id === docId);
    if (!activeDoc) return;

    const layoutAtGroup = (targetGroup: string, insertBeforeId?: string) => {
      const targetCards = byGroup(targetGroup).filter((c) => c.id !== docId);
      let ordered = targetCards.map((c) => c.id);
      if (insertBeforeId) {
        const insertIndex = ordered.indexOf(insertBeforeId);
        ordered.splice(insertIndex >= 0 ? insertIndex : ordered.length, 0, docId);
      } else {
        ordered = [...ordered, docId];
      }
      onReorderInGroup(targetGroup, ordered);
    };

    if (overId.startsWith('board-col:')) {
      const targetGroup = overId.replace('board-col:', '');
      layoutAtGroup(targetGroup);
      return;
    }

    if (overId.startsWith('board-card:')) {
      const overDocId = overId.replace('board-card:', '');
      const overDoc = documents.find((d) => d.id === overDocId);
      if (!overDoc) return;

      const targetGroup = docGroup(overDoc);
      if (docGroup(activeDoc) !== targetGroup) {
        layoutAtGroup(targetGroup, overDocId);
        return;
      }

      const cards = byGroup(targetGroup);
      const oldIndex = cards.findIndex((c) => c.id === docId);
      const newIndex = cards.findIndex((c) => c.id === overDocId);
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        const reordered = arrayMove(cards, oldIndex, newIndex);
        onReorderInGroup(targetGroup, reordered.map((c) => c.id));
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 gap-4 overflow-x-auto overflow-y-hidden p-6">
        {groupNames.map((group, gIdx) => (
          <BoardColumn
            key={group}
            group={group}
            colorClass={GROUP_COLORS[gIdx % GROUP_COLORS.length]}
            cards={byGroup(group)}
            cardMenu={cardMenu}
            setCardMenu={setCardMenu}
            onSelectDocument={onSelectDocument}
            onCreateDocument={onCreateDocument}
            onUpdateProperties={onUpdateProperties}
            activeDragDocId={activeDragDocId}
            onRenameGroup={handleColumnRename}
            onDeleteGroup={onDeleteGroup}
            onRemoveExtraGroup={(name) => setExtraGroups((prev) => prev.filter((g) => g !== name))}
          />
        ))}

        <div className="flex h-fit w-[240px] shrink-0 flex-col">
          {addingGroup ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
              <input
                ref={newGroupInputRef}
                autoFocus
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddGroup();
                  if (e.key === 'Escape') setAddingGroup(false);
                }}
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

      <DragOverlay dropAnimation={{ duration: 160, easing: 'ease' }}>
        {activeDragDoc ? <BoardCardPreview doc={activeDragDoc} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
