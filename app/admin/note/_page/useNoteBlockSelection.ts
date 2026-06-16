'use client';

import { useCallback, useEffect, useRef } from 'react';
import { collapseAllNoteEditorSelections } from '../_components/noteEditorRegistry';
import { clearAllCrossSelectState, clearAllNoteTextSelections } from '../_components/noteCrossSelect';
import { noteBlockMarqueeGuard, noteTextDragGuard } from '../_lib/noteBlockMarqueeGuard';
import {
  getMarqueeSelectedBlockIds,
  isMarqueeSelectStartBlocked,
  type MarqueeRect,
} from '../_lib/noteMarquee';
import { getSiblingBlockRangeIds } from '../_lib/noteDropResolver';
import {
  isNoteTextSurfaceTarget,
  notePointerTargetElement,
} from '../_lib/notePointerTarget';
import type { NoteBlock } from '../_lib/types';

export function useNoteBlockSelection(options: {
  selectedBlockIds: Set<string>;
  setSelectedBlockIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedBlockIdsRef: React.MutableRefObject<Set<string>>;
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  setBlockMarqueeActive: React.Dispatch<React.SetStateAction<boolean>>;
  suppressGripMenuRef: React.MutableRefObject<boolean>;
  noteBlockDragActiveRef: React.MutableRefObject<boolean>;
  handleDeleteBlocks: (
    blocksToDelete: NoteBlock[],
    options?: { skipDeleteUndo?: boolean; focusPrevious?: boolean },
  ) => Promise<void>;
}) {
  const {
    selectedBlockIds,
    setSelectedBlockIds,
    selectedBlockIdsRef,
    blocksRef,
    setBlockMarqueeActive,
    suppressGripMenuRef,
    noteBlockDragActiveRef,
    handleDeleteBlocks,
  } = options;

  useEffect(() => { selectedBlockIdsRef.current = selectedBlockIds; }, [selectedBlockIds, selectedBlockIdsRef]);

  const lastClickedBlockIdRef = useRef<string | null>(null);
  const blockMarqueeRef = useRef<{
    additive: boolean;
    shiftAnchor: boolean;
    hasModifier: boolean;
    started: boolean;
    startX: number;
    startY: number;
  } | null>(null);
  const blockMarqueeListenersRef = useRef<{
    onMove: (ev: PointerEvent) => void;
    onUp: () => void;
    onSelectStart: (ev: Event) => void;
  } | null>(null);
  const marqueeOverlayRef = useRef<HTMLDivElement>(null);
  const marqueeRafRef = useRef<number | null>(null);
  const pendingMarqueeRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const pendingMarqueeSelectionRef = useRef<{
    marquee: import('../_lib/noteMarquee').MarqueeRect;
    options: { additive: boolean; shiftAnchor: boolean };
  } | null>(null);
  const handleDeleteBlocksRef = useRef<typeof handleDeleteBlocks | null>(null);
  handleDeleteBlocksRef.current = handleDeleteBlocks;

  const applyBlockSelectRange = useCallback((
    anchorId: string,
    endId: string,
    options?: { additive?: boolean },
  ) => {
    const range = getSiblingBlockRangeIds(blocksRef.current, anchorId, endId);
    if (range.length === 0) return;
    if (options?.additive) {
      setSelectedBlockIds((prev) => {
        const next = new Set(prev);
        for (const rid of range) next.add(rid);
        return next;
      });
    } else {
      setSelectedBlockIds(new Set(range));
    }
  }, []);

  const handleBlockSelect = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedBlockIdRef.current) {
      applyBlockSelectRange(lastClickedBlockIdRef.current, id);
      lastClickedBlockIdRef.current = id;
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      setSelectedBlockIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    } else {
      setSelectedBlockIds(new Set([id]));
    }
    lastClickedBlockIdRef.current = id;
  }, [applyBlockSelectRange]);

  const applyMarqueeSelection = useCallback((marquee: MarqueeRect, options: { additive: boolean; shiftAnchor: boolean }) => {
    const ids = getMarqueeSelectedBlockIds(marquee);
    if (ids.length === 0) {
      if (!options.additive && !options.shiftAnchor) setSelectedBlockIds(new Set());
      return;
    }

    let nextIds = ids;
    if (options.shiftAnchor && lastClickedBlockIdRef.current) {
      const anchorId = lastClickedBlockIdRef.current;
      const sorted = [...ids].sort((a, b) => {
        const blockA = blocksRef.current.find((item) => item.id === a);
        const blockB = blocksRef.current.find((item) => item.id === b);
        return (blockA?.order_index ?? 0) - (blockB?.order_index ?? 0);
      });
      const rangeIds = getSiblingBlockRangeIds(
        blocksRef.current,
        anchorId,
        sorted[sorted.length - 1] ?? anchorId,
      );
      nextIds = [...new Set([...rangeIds, ...ids])];
    }

    if (options.additive && !options.shiftAnchor) {
      setSelectedBlockIds((prev) => {
        const next = new Set(prev);
        for (const id of nextIds) next.add(id);
        return next;
      });
      return;
    }

    setSelectedBlockIds(new Set(nextIds));
    lastClickedBlockIdRef.current = nextIds[nextIds.length - 1] ?? null;
  }, []);

  const paintMarqueeOverlay = useCallback((
    rect: { left: number; top: number; width: number; height: number } | null,
  ) => {
    const el = marqueeOverlayRef.current;
    if (!el) return;
    if (!rect || (rect.width < 1 && rect.height < 1)) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
  }, []);

  const flushMarqueeFrame = useCallback(() => {
    marqueeRafRef.current = null;
    const rect = pendingMarqueeRectRef.current;
    const selection = pendingMarqueeSelectionRef.current;
    paintMarqueeOverlay(rect);
    if (selection) {
      applyMarqueeSelection(selection.marquee, selection.options);
    }
  }, [applyMarqueeSelection, paintMarqueeOverlay]);

  const scheduleMarqueePaint = useCallback((
    rect: { left: number; top: number; width: number; height: number },
    selection: { marquee: MarqueeRect; options: { additive: boolean; shiftAnchor: boolean } },
  ) => {
    pendingMarqueeRectRef.current = rect;
    pendingMarqueeSelectionRef.current = selection;
    if (marqueeRafRef.current === null) {
      marqueeRafRef.current = window.requestAnimationFrame(flushMarqueeFrame);
    }
  }, [flushMarqueeFrame]);

  const handleBlockListPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (noteBlockDragActiveRef.current) return;
    if (noteTextDragGuard.active) return;
    if (isMarqueeSelectStartBlocked(e.target)) return;

    const abortBlockMarquee = () => {
      noteBlockMarqueeGuard.active = false;
      document.body.style.userSelect = '';
      document.body.classList.remove('note-marquee-active');
      document.body.classList.remove('note-list-cross-active');
      pendingMarqueeRectRef.current = null;
      pendingMarqueeSelectionRef.current = null;
      if (marqueeRafRef.current !== null) {
        window.cancelAnimationFrame(marqueeRafRef.current);
        marqueeRafRef.current = null;
      }
      paintMarqueeOverlay(null);
      blockMarqueeRef.current = null;
      setBlockMarqueeActive(false);
      const listeners = blockMarqueeListenersRef.current;
      if (listeners) {
        document.removeEventListener('pointermove', listeners.onMove);
        document.removeEventListener('pointerup', listeners.onUp);
        document.removeEventListener('pointercancel', listeners.onUp);
        document.removeEventListener('selectstart', listeners.onSelectStart);
        blockMarqueeListenersRef.current = null;
      }
    };

    const hasModifier = e.shiftKey || e.ctrlKey || e.metaKey;
    if (isNoteTextSurfaceTarget(e.target) && !hasModifier) {
      abortBlockMarquee();
      clearAllCrossSelectState();
      return;
    }

    clearAllCrossSelectState();

    const target = notePointerTargetElement(e.target);
    if (!target?.closest('[data-note-marquee-zone]')) return;

    abortBlockMarquee();

    const onSelectStart = (ev: Event) => {
      ev.preventDefault();
    };

    blockMarqueeRef.current = {
      additive: e.ctrlKey || e.metaKey,
      shiftAnchor: e.shiftKey,
      hasModifier,
      started: false,
      startX: e.clientX,
      startY: e.clientY,
    };
    noteBlockMarqueeGuard.active = true;
    document.body.style.userSelect = 'none';
    document.body.classList.add('note-marquee-active');

    const onMove = (ev: PointerEvent) => {
      const state = blockMarqueeRef.current;
      if (!state) return;

      const dx = Math.abs(ev.clientX - state.startX);
      const dy = Math.abs(ev.clientY - state.startY);
      if (!state.started) {
        if (dx < 4 && dy < 4) return;
        if (noteTextDragGuard.active) {
          abortBlockMarquee();
          return;
        }
        state.started = true;
        setBlockMarqueeActive(true);
        suppressGripMenuRef.current = true;
        clearAllCrossSelectState();
        collapseAllNoteEditorSelections();
      }

      const left = Math.min(state.startX, ev.clientX);
      const top = Math.min(state.startY, ev.clientY);
      const width = Math.abs(ev.clientX - state.startX);
      const height = Math.abs(ev.clientY - state.startY);
      scheduleMarqueePaint(
        { left, top, width, height },
        {
          marquee: { left, top, right: left + width, bottom: top + height },
          options: { additive: state.additive, shiftAnchor: state.shiftAnchor },
        },
      );
    };

    const onUp = () => {
      const state = blockMarqueeRef.current;
      abortBlockMarquee();

      if (state && !state.started && !state.additive && !state.shiftAnchor) {
        setSelectedBlockIds(new Set());
        clearAllNoteTextSelections();
      }
    };

    blockMarqueeListenersRef.current = { onMove, onUp, onSelectStart };
    document.addEventListener('selectstart', onSelectStart);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }, [paintMarqueeOverlay, scheduleMarqueePaint]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (selectedBlockIdsRef.current.size === 0) return;
      const target = e.target as HTMLElement;
      if (target.closest(
        '[data-note-marquee-zone], [data-note-format-toolbar], button, input, textarea, a',
      )) {
        return;
      }
      setSelectedBlockIds(new Set());
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // 硫??釉붾줉 ?좏깮: Ctrl+A / Escape / Delete
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const isEditing = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        !!target.closest('[contenteditable="true"]')
      );

      if (meta && e.key === 'a' && !isEditing) {
        e.preventDefault();
        setSelectedBlockIds(new Set(blocksRef.current.map((b) => b.id)));
        return;
      }
      if (e.key === 'Escape' && selectedBlockIdsRef.current.size > 0) {
        setSelectedBlockIds(new Set());
        return;
      }
      if (e.key === 'Delete' && selectedBlockIdsRef.current.size > 0 && !isEditing) {
        e.preventDefault();
        const ids = [...selectedBlockIdsRef.current];
        setSelectedBlockIds(new Set());
        const blocks = ids
          .map((id) => blocksRef.current.find((b) => b.id === id))
          .filter((block): block is NoteBlock => !!block);
        void handleDeleteBlocksRef.current?.(blocks, { skipDeleteUndo: true });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return {
    marqueeOverlayRef,
    handleBlockSelect,
    handleBlockListPointerDown,
  };
}
