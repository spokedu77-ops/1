'use client';

import { NotePageProvider } from './_page/NotePageProvider';
import { NotePageShell } from './_page/NotePageShell';

export default function AdminNotePageContent() {
  return (
    <NotePageProvider>
      <NotePageShell />
    </NotePageProvider>
  );
}
