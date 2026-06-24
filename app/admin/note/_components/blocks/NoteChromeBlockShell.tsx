'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { handleNotionChromeBlockKeyDown } from '../../_lib/noteNotionBlockBehavior';
import type { NoteBlock } from '../../_lib/types';

type NoteChromeBlockShellProps = {
  children: ReactNode;
  isFocused: boolean;
  autoFocusSignal?: number;
  className?: string;
  style?: CSSProperties;
  onAddBelow: (type?: NoteBlock['type']) => void;
  onDelete: () => void;
};

/** divider·image·video 등 편집기 없는 블록 — Enter 아래 text, Backspace 삭제 */
export function NoteChromeBlockShell({
  children,
  isFocused,
  autoFocusSignal = 0,
  className,
  style,
  onAddBelow,
  onDelete,
}: NoteChromeBlockShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFocused) return;
    shellRef.current?.focus();
  }, [isFocused, autoFocusSignal]);

  return (
    <div
      ref={shellRef}
      tabIndex={isFocused ? 0 : -1}
      className={className}
      style={{ outline: 'none', ...style }}
      onKeyDown={(e) => {
        if (handleNotionChromeBlockKeyDown(e, {
          onAddBelow: () => onAddBelow('text'),
          onDelete,
        })) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </div>
  );
}
