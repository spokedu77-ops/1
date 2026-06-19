'use client';

import { NotePageContext } from './NotePageContext';
import { useNotePageOrchestration } from './useNotePageOrchestration';

export function NotePageProvider({ children }: { children: React.ReactNode }) {
  const value = useNotePageOrchestration();

  return (
    <NotePageContext.Provider value={value}>
      {children}
    </NotePageContext.Provider>
  );
}
