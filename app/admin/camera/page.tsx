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
    <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-700 bg-slate-900 px-4 py-2">
        <Link
          href="/admin/iiwarmup/spomove"
          className="text-sm font-semibold text-sky-400 hover:underline"
        >
          ← SPOMOVE 허브
        </Link>
      </div>
      <div className="relative min-h-0 flex-1">
        <CameraErrorBoundary>
          <div className="absolute inset-0 overflow-hidden overscroll-none">
            <SpokeduCameraApp />
          </div>
        </CameraErrorBoundary>
      </div>
    </div>
  );
}
