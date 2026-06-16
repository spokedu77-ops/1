'use client';

import { createContext, useContext, type RefObject } from 'react';
import type { BlockDropPosition } from '@/app/lib/note/noteBlockTree';

export type BlockDropTarget = { blockId: string; position: BlockDropPosition } | null;

export const BlockDropTargetContext = createContext<BlockDropTarget>(null);
export const BlockDragActiveContext = createContext(false);
export const SelectedBlockIdsContext = createContext<Set<string>>(new Set());
export const OnBlockSelectContext = createContext<((id: string, e: React.MouseEvent) => void) | null>(null);
export const SuppressGripMenuRefContext = createContext<RefObject<boolean>>({ current: false });

export function useBlockDropTarget() {
  return useContext(BlockDropTargetContext);
}

export function useBlockDragActive() {
  return useContext(BlockDragActiveContext);
}

export function useSelectedBlockIds() {
  return useContext(SelectedBlockIdsContext);
}

export function useOnBlockSelect() {
  return useContext(OnBlockSelectContext);
}

export function useSuppressGripMenuRef() {
  return useContext(SuppressGripMenuRefContext);
}
