'use client';

/**
 * Flow Phase - Next.js Route
 * /flow-phase?weekKey=...
 */
export interface FlowFrameProps {
  weekKey: string;
  onEnd?: () => void;
}

export function FlowFrame({ weekKey, onEnd }: FlowFrameProps) {
  const src = `/flow-phase?weekKey=${encodeURIComponent(weekKey)}`;

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      <iframe
        src={src}
        className="h-full w-full border-0"
        title="Flow Phase"
        sandbox="allow-scripts allow-same-origin"
      />
      {onEnd && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
          <button
            type="button"
            className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
            onClick={onEnd}
          >
            Flow 종료
          </button>
        </div>
      )}
    </div>
  );
}
