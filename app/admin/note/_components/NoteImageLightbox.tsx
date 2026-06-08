'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';

type NoteImageLightboxContextValue = {
  open: (src: string, alt?: string) => void;
};

const NoteImageLightboxContext = createContext<NoteImageLightboxContextValue | null>(null);

export function useNoteImageLightbox() {
  return useContext(NoteImageLightboxContext);
}

export function NoteImageLightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ src: string; alt: string } | null>(null);

  const open = useCallback((src: string, alt?: string) => {
    const trimmed = src.trim();
    if (!trimmed) return;
    setState({ src: trimmed, alt: alt ?? '' });
  }, []);

  const close = useCallback(() => setState(null), []);

  useEffect(() => {
    if (!state) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [state, close]);

  return (
    <NoteImageLightboxContext.Provider value={{ open }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 p-4 md:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="이미지 확대"
          onClick={close}
        >
          <button
            type="button"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="닫기"
            onClick={close}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={state.src}
            alt={state.alt}
            className="max-h-[min(90vh,100%)] max-w-[min(92vw,100%)] select-none rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}
    </NoteImageLightboxContext.Provider>
  );
}
