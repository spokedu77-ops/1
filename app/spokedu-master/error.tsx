'use client';

import { useEffect } from 'react';

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
    sendClientError(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <section className="mx-auto max-w-lg rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-indigo-600">SPOKEDU MASTER</p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">
          화면을 불러오지 못했습니다.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          일시적인 오류가 발생했습니다. 다시 시도해도 문제가 계속되면 잠시 후 이용해 주세요.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-black text-white transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          다시 시도
        </button>
      </section>
    </main>
  );
}
