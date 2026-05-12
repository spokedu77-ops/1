'use client';

import React, { Component } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const SpokeduCameraApp = dynamic(
  () => import('./SpokeduCameraApp').then((m) => m.default),
  { ssr: false, loading: () => <div className="flex min-h-[100dvh] items-center justify-center bg-sky-50 text-slate-600">로딩 중...</div> }
);

interface CameraErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class CameraErrorBoundary extends Component<
  { children: React.ReactNode },
  CameraErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): CameraErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-sky-50 px-4 text-slate-700">
          <p className="text-center font-semibold">카메라 앱을 불러오는 중 오류가 발생했습니다.</p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="max-w-full overflow-auto rounded bg-slate-200 p-3 text-left text-sm">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CameraAppPage() {
  return (
    <div className="fixed inset-0 z-[100] h-[var(--viewport-height-px,100dvh)] max-h-[var(--viewport-height-px,100dvh)] w-screen overflow-hidden bg-slate-950 overscroll-none [touch-action:none]">
      <div className="pointer-events-auto absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))] z-[120] rounded-full border border-white/15 bg-slate-950/70 px-3 py-2 shadow-lg backdrop-blur">
        <Link
          href="/admin/spomove"
          className="text-sm font-semibold text-sky-200 hover:text-white"
        >
          ← SPOMOVE 허브
        </Link>
      </div>
      <div className="absolute inset-0 h-full max-h-full overflow-hidden">
        <CameraErrorBoundary>
          <div className="absolute inset-0 h-full max-h-full w-full overflow-hidden overscroll-none [touch-action:none]">
            <SpokeduCameraApp />
          </div>
        </CameraErrorBoundary>
      </div>
    </div>
  );
}
