'use client';

/**
 * 구독자 IIWarmup 페이지 로딩 스켈레톤
 */
export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-2xl space-y-8 px-5 py-10">
        <header className="text-center">
          <div className="mx-auto h-8 w-48 animate-pulse rounded bg-neutral-800" />
          <div className="mx-auto mt-2 h-5 w-64 animate-pulse rounded bg-neutral-800/80" />
          <div className="mx-auto mt-1 h-4 w-56 animate-pulse rounded bg-neutral-800/60" />
        </header>
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 backdrop-blur-sm">
          <div className="mb-3 h-3 w-32 animate-pulse rounded bg-neutral-700" />
          <div className="h-14 w-full animate-pulse rounded-lg bg-neutral-800" />
          <div className="mt-3 h-4 w-24 animate-pulse rounded bg-neutral-700/80" />
        </section>
        <section className="flex justify-center">
          <div className="h-12 w-48 animate-pulse rounded-xl bg-neutral-800" />
        </section>
      </div>
    </div>
  );
}
