'use client';

import { useEffect } from 'react';
import { tryReloadOnceForChunkLoadError } from '@/app/lib/client/chunkLoadRecovery';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (tryReloadOnceForChunkLoadError(error)) return;
  }, [error]);

  return (
    <html lang="ko">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <main className="flex min-h-dvh items-center justify-center px-4 py-10">
          <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-slate-950">앱을 불러오지 못했습니다</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              클라이언트에서 오류가 발생했습니다. 새로고침 후에도 계속되면 잠시 후 다시 이용해 주세요.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              >
                새로고침
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                다시 시도
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
