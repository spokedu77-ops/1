'use client';

import React, { Component } from 'react';
import dynamic from 'next/dynamic';
import Script from 'next/script';

const SpokeduCameraApp = dynamic(
  () => import('./SpokeduCameraApp').then((m) => m.default),
  { ssr: false, loading: () => <div className="flex min-h-screen items-center justify-center bg-sky-50 text-slate-600">로딩 중...</div> }
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
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        onLoad={() => {}}
      />
      <div className="min-h-screen h-screen w-full overflow-hidden">
        <CameraErrorBoundary>
          <SpokeduCameraApp />
        </CameraErrorBoundary>
      </div>
    </>
  );
}
