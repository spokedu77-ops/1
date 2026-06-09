'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRightLeft,
  ChevronRight,
  Copy,
  Link2,
  List,
  Paintbrush,
  Trash2,
} from 'lucide-react';

export type SlashCommand<T extends string = string> = {
  type: T;
  label: string;
  desc: string;
  icon: React.ElementType;
  shortcut?: string;
};

/** `/` 슬래시 메뉴 — BlockPickerMenu와 동일 톤, query는 에디터에서 제어 */
export function SlashMenu<T extends string>({
  commands,
  query,
  onSelect,
  onClose,
  title,
}: {
  commands: SlashCommand<T>[];
  query: string;
  onSelect: (type: T) => void;
  onClose: () => void;
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) =>
      `${cmd.label} ${cmd.desc} ${cmd.type} ${cmd.shortcut ?? ''}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (filtered.length === 0) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filtered[activeIndex];
        if (cmd) { onSelect(cmd.type); onClose(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeIndex, filtered, onClose, onSelect]);

  return (
    <div
      ref={ref}
      className="w-[280px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl shadow-neutral-900/10"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {title ? (
        <div className="border-b border-neutral-100 px-3 py-2">
          <p className="text-[11px] font-semibold text-neutral-400">{title}</p>
        </div>
      ) : null}
      <div className="max-h-[320px] overflow-y-auto py-1">
        {filtered.length > 0 ? (
          filtered.map(({ type, label, icon: Icon, shortcut }, idx) => (
            <button
              key={type}
              type="button"
              className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                idx === activeIndex ? 'bg-neutral-100' : 'hover:bg-neutral-50'
              }`}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => { onSelect(type); onClose(); }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white">
                <Icon className="h-3.5 w-3.5 text-neutral-500" />
              </span>
              <span className="flex-1 text-[13px] font-medium text-neutral-700">{label}</span>
              {shortcut ? <span className="shrink-0 text-[11px] text-neutral-300">{shortcut}</span> : null}
            </button>
          ))
        ) : (
          <p className="px-3 py-2 text-[12px] text-neutral-400">결과 없음</p>
        )}
      </div>
    </div>
  );
}

export function SlashMenuFixed<T extends string>({
  show,
  anchor,
  commands,
  query,
  onSelect,
  onClose,
  title,
}: {
  show: boolean;
  anchor: { top: number; left: number } | null;
  commands: SlashCommand<T>[];
  query: string;
  onSelect: (type: T) => void;
  onClose: () => void;
  title?: string;
}) {
  if (!show || !anchor) return null;
  return (
    <div className="fixed z-[9999]" style={{ top: anchor.top, left: anchor.left }}>
      <SlashMenu
        commands={commands}
        query={query}
        onSelect={onSelect}
        onClose={onClose}
        title={title}
      />
    </div>
  );
}

/**
 * + 버튼용 블록 피커.
 * 부모에서 fixed 좌표를 계산해서 position:fixed 컨테이너로 감싸 사용.
 */
export function BlockPickerMenu<T extends string>({
  commands,
  onSelect,
  onClose,
}: {
  commands: SlashCommand<T>[];
  onSelect: (type: T) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) =>
      `${cmd.label} ${cmd.desc} ${cmd.type}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => { setActiveIndex(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); const cmd = filtered[activeIndex]; if (cmd) { onSelect(cmd.type); onClose(); } }
      if (e.key === 'Escape')    { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeIndex, filtered, onClose, onSelect]);

  return (
    <div
      ref={ref}
      className="w-[240px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl shadow-neutral-900/10"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="border-b border-neutral-100 px-3 py-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="필터링 기준을 입력하세요."
          className="w-full bg-transparent text-[13px] text-neutral-700 outline-none placeholder:text-neutral-400"
        />
      </div>
      <div className="border-b border-neutral-100 px-3 py-1">
        <p className="text-[11px] font-semibold text-neutral-400">기본 블록</p>
      </div>
      <div className="max-h-[280px] overflow-y-auto py-1">
        {filtered.length > 0 ? (
          filtered.map(({ type, label, icon: Icon, shortcut }, idx) => (
            <button
              key={type}
              type="button"
              className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                idx === activeIndex ? 'bg-neutral-100' : 'hover:bg-neutral-50'
              }`}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => { onSelect(type); onClose(); }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white">
                <Icon className="h-3.5 w-3.5 text-neutral-500" />
              </span>
              <span className="flex-1 text-[13px] font-medium text-neutral-700">{label}</span>
              {shortcut && <span className="shrink-0 text-[11px] text-neutral-300">{shortcut}</span>}
            </button>
          ))
        ) : (
          <p className="px-3 py-2 text-[12px] text-neutral-400">결과 없음</p>
        )}
      </div>
      <div className="border-t border-neutral-100 px-3 py-1.5">
        <p className="text-[11px] text-neutral-400">메뉴 닫기 <span className="ml-1 font-medium text-neutral-300">esc</span></p>
      </div>
    </div>
  );
}

type HandleMenuPanel = 'turnInto' | 'color' | 'listFormat';

function HandleMenuShortcut({ children }: { children: string }) {
  return (
    <span className="shrink-0 text-[11px] tracking-tight text-neutral-400">{children}</span>
  );
}

function HandleMenuRow({
  icon: Icon,
  label,
  shortcut,
  chevron,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  chevron?: boolean;
  onClick?: () => void;
}) {
  const className = 'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] text-neutral-700 transition-colors hover:bg-neutral-50';
  const inner = (
    <>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-neutral-500">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {shortcut ? <HandleMenuShortcut>{shortcut}</HandleMenuShortcut> : null}
      {chevron ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" /> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {inner}
      </button>
    );
  }

  return <div className={className} role="menuitem">{inner}</div>;
}

function HandleMenuFlyoutList<T extends string>({
  commands,
  onSelect,
}: {
  commands: SlashCommand<T>[];
  onSelect: (type: T) => void;
}) {
  return (
    <div className="max-h-[min(360px,70vh)] w-[248px] overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-xl shadow-neutral-900/10">
      {commands.map(({ type, label, icon: Icon, shortcut }) => (
        <button
          key={type}
          type="button"
          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] text-neutral-700 transition-colors hover:bg-neutral-50"
          onClick={() => onSelect(type)}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white">
            <Icon className="h-3.5 w-3.5 text-neutral-500" />
          </span>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {shortcut ? <span className="shrink-0 text-[11px] text-neutral-300">{shortcut}</span> : null}
        </button>
      ))}
    </div>
  );
}

function HandleMenuHoverItem({
  panelId,
  activePanel,
  onActivate,
  onScheduleClose,
  onCancelClose,
  icon,
  label,
  children,
}: {
  panelId: HandleMenuPanel;
  activePanel: HandleMenuPanel | null;
  onActivate: () => void;
  onScheduleClose: () => void;
  onCancelClose: () => void;
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const open = activePanel === panelId;

  const syncFlyoutPos = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setFlyoutPos({ top: rect.top, left: rect.right });
  }, []);

  const handleActivate = useCallback(() => {
    onCancelClose();
    syncFlyoutPos();
    onActivate();
  }, [onActivate, onCancelClose, syncFlyoutPos]);

  useEffect(() => {
    if (!open) {
      setFlyoutPos(null);
      return;
    }
    syncFlyoutPos();
    const onReflow = () => syncFlyoutPos();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open, syncFlyoutPos]);

  return (
    <>
      <div
        ref={rowRef}
        className="relative"
        onMouseEnter={handleActivate}
        onMouseLeave={onScheduleClose}
      >
        <HandleMenuRow icon={icon} label={label} chevron />
      </div>
      {open && flyoutPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed z-[10002] pl-0.5"
              style={{ top: flyoutPos.top, left: flyoutPos.left }}
              onMouseEnter={handleActivate}
              onMouseLeave={onScheduleClose}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** ⋮⋮ 블록 핸들 메뉴 — 노션 스타일 (호버 시 옆 서브메뉴) */
export function BlockHandleMenu<T extends string>({
  blockTypeLabel,
  blockType,
  commands,
  currentBlockColor = 'default',
  onDuplicate,
  onDelete,
  onTurnInto,
  onCopyBlockLink,
  onColorChange,
  onClose,
}: {
  blockTypeLabel: string;
  blockType: T;
  commands: SlashCommand<T>[];
  currentBlockColor?: string;
  onDuplicate: () => void;
  onDelete: () => void;
  onTurnInto: (type: T) => void;
  onCopyBlockLink?: () => void;
  onColorChange?: (colorId: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);
  const [hoverPanel, setHoverPanel] = useState<HandleMenuPanel | null>(null);
  const isListBlock = blockType === 'bulletList' || blockType === 'numberedList';

  const scheduleHoverPanelClose = useCallback(() => {
    if (hoverCloseTimerRef.current) window.clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = window.setTimeout(() => {
      setHoverPanel(null);
      hoverCloseTimerRef.current = null;
    }, 100);
  }, []);

  const cancelHoverPanelClose = useCallback(() => {
    if (hoverCloseTimerRef.current) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    if (hoverCloseTimerRef.current) window.clearTimeout(hoverCloseTimerRef.current);
  }, []);

  const colorOptions = [
    { id: 'default', label: '기본', swatch: 'bg-white border border-neutral-200' },
    { id: 'gray', label: '회색 배경', swatch: 'bg-neutral-100' },
    { id: 'brown', label: '갈색 배경', swatch: 'bg-amber-100' },
    { id: 'orange', label: '주황색 배경', swatch: 'bg-orange-100' },
  ];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="relative w-[248px] overflow-visible rounded-lg border border-neutral-200 bg-white py-1 shadow-xl shadow-neutral-900/10"
      onMouseEnter={cancelHoverPanelClose}
      onMouseLeave={scheduleHoverPanelClose}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="border-b border-neutral-100 px-3 py-2">
        <p className="truncate text-[12px] font-medium text-neutral-500">{blockTypeLabel}</p>
      </div>
      <div className="py-0.5">
        <HandleMenuHoverItem
          panelId="turnInto"
          activePanel={hoverPanel}
          onActivate={() => setHoverPanel('turnInto')}
          onScheduleClose={scheduleHoverPanelClose}
          onCancelClose={cancelHoverPanelClose}
          icon={ArrowRightLeft}
          label="전환"
        >
          <HandleMenuFlyoutList
            commands={commands}
            onSelect={(type) => { onTurnInto(type); onClose(); }}
          />
        </HandleMenuHoverItem>
        <HandleMenuHoverItem
          panelId="color"
          activePanel={hoverPanel}
          onActivate={() => setHoverPanel('color')}
          onScheduleClose={scheduleHoverPanelClose}
          onCancelClose={cancelHoverPanelClose}
          icon={Paintbrush}
          label="색"
        >
          <div className="w-[220px] rounded-lg border border-neutral-200 bg-white py-1 shadow-xl shadow-neutral-900/10">
            {colorOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] text-neutral-700 hover:bg-neutral-50"
                onClick={() => {
                  onColorChange?.(opt.id);
                  onClose();
                }}
              >
                <span className={`h-4 w-4 shrink-0 rounded-sm ${opt.swatch}`} />
                <span>{opt.label}</span>
                {opt.id === currentBlockColor ? <span className="ml-auto text-neutral-400">✓</span> : null}
              </button>
            ))}
          </div>
        </HandleMenuHoverItem>
        {isListBlock ? (
          <HandleMenuHoverItem
            panelId="listFormat"
            activePanel={hoverPanel}
            onActivate={() => setHoverPanel('listFormat')}
            onScheduleClose={scheduleHoverPanelClose}
            onCancelClose={cancelHoverPanelClose}
            icon={List}
            label="목록 형식"
          >
            <div className="w-[220px] rounded-lg border border-neutral-200 bg-white py-1 shadow-xl shadow-neutral-900/10">
              {([
                { type: 'bulletList' as T, label: '글머리 기호 목록', marker: '•' },
                { type: 'numberedList' as T, label: '번호 매기기 목록', marker: '1.' },
              ]).map((fmt) => (
                <button
                  key={fmt.type}
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] text-neutral-700 hover:bg-neutral-50"
                  onClick={() => {
                    if (fmt.type !== blockType) onTurnInto(fmt.type);
                    onClose();
                  }}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[13px] text-neutral-500">
                    {fmt.marker}
                  </span>
                  <span>{fmt.label}</span>
                  {fmt.type === blockType ? <span className="ml-auto text-neutral-400">✓</span> : null}
                </button>
              ))}
            </div>
          </HandleMenuHoverItem>
        ) : null}
      </div>
      <div className="my-0.5 border-t border-neutral-100" />
      <div className="py-0.5">
        {onCopyBlockLink ? (
          <HandleMenuRow
            icon={Link2}
            label="블록 링크 복사"
            shortcut="Alt+Shift+L"
            onClick={() => { onCopyBlockLink(); onClose(); }}
          />
        ) : null}
        <HandleMenuRow
          icon={Copy}
          label="복제"
          shortcut="Ctrl+D"
          onClick={() => { onDuplicate(); onClose(); }}
        />
        <HandleMenuRow
          icon={Trash2}
          label="삭제"
          shortcut="Del"
          onClick={() => { onDelete(); onClose(); }}
        />
      </div>
    </div>
  );
}
