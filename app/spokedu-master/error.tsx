'use client';

import { useEffect } from 'react';
import { tryReloadOnceForChunkLoadError } from '@/app/lib/client/chunkLoadRecovery';

type SpokeduMasterErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function sendClientError(error: Error & { digest?: string }) {
  const payload = JSON.stringify({
    digest: error.digest ?? null,
    errorName: error.name || 'Error',
    pathname: typeof window !== 'undefined' ? window.location.pathname : null,
  });

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon('/api/spokedu-master/client-errors', blob);
    return;
  }

  void fetch('/api/spokedu-master/client-errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    cache: 'no-store',
    keepalive: true,
  }).catch(() => {
    // Reporting must never make the error boundary fail harder.
  });
}

export default function SpokeduMasterError({ error, reset }: SpokeduMasterErrorProps) {
  useEffect(() => {
    if (tryReloadOnceForChunkLoadError(error)) return;
    sendClientError(error);
  }, [error]);

  return (
    <main className="min-h-dvh px-4 py-10" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)' }}>
      <section className="mx-auto max-w-lg rounded-[24px] border p-6 shadow-sm" style={{ background: 'var(--spm-s1)', borderColor: 'var(--spm-br2)' }}>
        <p className="text-sm font-bold text-[var(--spm-acc)]">SPOKEDU MASTER</p>
        <h1 className="mt-3 text-2xl font-black" style={{ color: 'var(--spm-t)' }}>
          화면을 불러오지 못했습니다.
        </h1>
        <p className="mt-3 text-sm leading-6" style={{ color: 'var(--spm-t2)' }}>
          일시적인 오류가 발생했습니다. 다시 시도해도 문제가 계속되면 잠시 후 이용해 주세요.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--spm-acc)] px-4 text-sm font-black text-white transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
            style={{ background: 'var(--spm-s1)', borderColor: 'var(--spm-br3)', color: 'var(--spm-t)' }}
          >
            다시 시도
          </button>
        </div>
      </section>
    </main>
  );
}
