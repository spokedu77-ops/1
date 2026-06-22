'use client';

import { useEffect, useState } from 'react';
import {
  noteTextDragGuard,
  subscribeNoteTextDragGuard,
} from '../_lib/noteBlockMarqueeGuard';

export function useNoteTextDragActive(): boolean {
  const [active, setActive] = useState(() => noteTextDragGuard.active);

  useEffect(() => {
    return subscribeNoteTextDragGuard(() => {
      setActive(noteTextDragGuard.active);
    });
  }, []);

  return active;
}
