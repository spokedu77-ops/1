'use client';

import { CheckCircle2 } from 'lucide-react';

export interface CompletionModalProps {
  open: boolean;
  onClose: () => void;
  onRestart: () => void;
}

export function CompletionModal({ open, onClose, onRestart }: CompletionModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        style={{ animationFillMode: 'backwards' }}
      >
        <div className="flex flex-col items-center text-center">
          <CheckCircle2
            size={48}
            className="text-emerald-400 mb-3"
            strokeWidth={2}
            aria-hidden
          />
          <h2 id="completion-title" className="text-xl font-bold text-white">
            수고했어요!
          </h2>
          <p className="mt-1 text-sm text-neutral-400">
            이번 주 웜업을 모두 완료했어요.
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-neutral-600 bg-transparent px-4 py-3 text-sm font-medium text-neutral-300 transition-all duration-150 hover:bg-neutral-800 hover:text-neutral-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
            aria-label="닫기"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 min-h-[44px] rounded-xl bg-cyan-600 px-4 py-3 text-sm font-medium text-white transition-all duration-150 hover:bg-cyan-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
            aria-label="다시 하기"
          >
            다시 하기
          </button>
        </div>
      </div>
    </div>
  );
}
