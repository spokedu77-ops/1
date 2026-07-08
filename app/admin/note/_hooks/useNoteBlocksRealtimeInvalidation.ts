'use client';

import { useEffect } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { devLogger } from '@/app/lib/logging/devLogger';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

export function useNoteBlocksRealtimeInvalidation(options: {
  documentId: string | null;
  onInvalidate: (documentId: string) => void;
}) {
  const { documentId, onInvalidate } = options;

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
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (cancelled) return;
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
  }, [documentId, onInvalidate]);
}
