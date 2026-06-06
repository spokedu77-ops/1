'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type { NoteEditor } from '../NoteEditor';

const NoteEditorLazy = dynamic(
  () => import('../NoteEditor').then((mod) => mod.NoteEditor),
  { ssr: false },
);

export function LazyNoteEditor(props: ComponentProps<typeof NoteEditor>) {
  return <NoteEditorLazy {...props} />;
}
