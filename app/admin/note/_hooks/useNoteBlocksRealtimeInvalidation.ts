'use client';

import { useEffect } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { devLogger } from '@/app/lib/logging/devLogger';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

type NoteBlockChangeRow = {
  updated_by?: string | null;
};

export function useNoteBlocksRealtimeInvalidation(options: {
  documentId: string | null;
  currentUserId: string | null;
  onInvalidate: (documentId: string) => void;
}) {
  const { documentId, currentUserId, onInvalidate } = options;

  useEffect(() => {
    if (!documentId) return undefined;

    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`note-blocks:${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_blocks',
          filter: `document_id=eq.${documentId}`,
        },
        (payload: RealtimePostgresChangesPayload<NoteBlockChangeRow>) => {
          if (cancelled) return;
          if (payload.eventType === 'DELETE') {
            onInvalidate(documentId);
            return;
          }
          const updatedBy = payload.new?.updated_by ?? null;
          if (currentUserId && updatedBy === currentUserId) return;
          onInvalidate(documentId);
        },
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR') {
          devLogger.warn('[Note] realtime invalidation channel error', { documentId });
        }
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, documentId, onInvalidate]);
}
