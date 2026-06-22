'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import type { NoteBlock } from '../_lib/types';

const DEFAULT_ROW_HEIGHT = 44;
const OVERSCAN = 16;
const VIRTUALIZE_THRESHOLD = 48;
/** 토글·다중 줄 블록은 높이가 달라 고정 px 가상화 시 겹침·교차 선택 오류 발생 */
const ENABLE_FIXED_ROW_VIRTUALIZATION = false;

type NoteVirtualRootBlocksProps = {
  rootBlocks: NoteBlock[];
  scrollRootRef: React.RefObject<HTMLElement | null>;
  renderBlock: (block: NoteBlock) => ReactNode;
  /** DnD·마퀴 중에는 전체 DOM 유지 */
  forceRenderAll?: boolean;
  estimatedRowHeight?: number;
};

/**
 * 노션식 루트 블록 windowing — 화면 밖 블록은 placeholder로 대체.
 * 드래그·마퀴 선택 중에는 forceRenderAll로 전체 마운트.
 */
export function NoteVirtualRootBlocks({
  rootBlocks,
  scrollRootRef,
  renderBlock,
  forceRenderAll = false,
  estimatedRowHeight = DEFAULT_ROW_HEIGHT,
}: NoteVirtualRootBlocksProps) {
  const [range, setRange] = useState(() => ({
    start: 0,
    end: Math.min(rootBlocks.length, 32),
  }));

  useEffect(() => {
    if (
      forceRenderAll
      || !ENABLE_FIXED_ROW_VIRTUALIZATION
      || rootBlocks.length <= VIRTUALIZE_THRESHOLD
    ) {
      setRange({ start: 0, end: rootBlocks.length });
      return;
    }

    const root = scrollRootRef.current;
    if (!root) return;

    const update = () => {
      const scrollTop = root.scrollTop;
      const viewHeight = root.clientHeight;
      const start = Math.max(0, Math.floor(scrollTop / estimatedRowHeight) - OVERSCAN);
      const end = Math.min(
        rootBlocks.length,
        Math.ceil((scrollTop + viewHeight) / estimatedRowHeight) + OVERSCAN,
      );
      setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };

    update();
    root.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => {
      root.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [rootBlocks.length, scrollRootRef, estimatedRowHeight, forceRenderAll]);

  if (
    forceRenderAll
    || !ENABLE_FIXED_ROW_VIRTUALIZATION
    || rootBlocks.length <= VIRTUALIZE_THRESHOLD
  ) {
    return (
      <>
        {rootBlocks.map((block) => (
          <Fragment key={block.id}>{renderBlock(block)}</Fragment>
        ))}
      </>
    );
  }

  const topPad = range.start * estimatedRowHeight;
  const bottomPad = Math.max(0, (rootBlocks.length - range.end) * estimatedRowHeight);
  const visible = rootBlocks.slice(range.start, range.end);

  return (
    <>
      {topPad > 0 ? <div style={{ height: topPad }} aria-hidden /> : null}
      {visible.map((block) => (
        <Fragment key={block.id}>{renderBlock(block)}</Fragment>
      ))}
      {bottomPad > 0 ? <div style={{ height: bottomPad }} aria-hidden /> : null}
    </>
  );
}
