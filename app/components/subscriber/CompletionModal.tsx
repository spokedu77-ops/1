'use client';

export interface CompletionModalProps {
  open: boolean;
  onClose: () => void;
  onRestart: () => void;
}

export function CompletionModal({ open, onClose, onRestart }: CompletionModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-xl">
        <h2 id="completion-title" className="text-center text-xl font-bold text-white">
          완료했어요!
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-400">
          이번 주 웜업을 모두 끝냈어요.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-600 bg-neutral-800 px-4 py-3 text-sm font-medium text-neutral-200 hover:bg-neutral-700"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-500"
          >
            다시 하기
          </button>
        </div>
      </div>
    </div>
  );
}
