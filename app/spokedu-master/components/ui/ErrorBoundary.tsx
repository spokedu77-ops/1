'use client';

import { reportError } from '@/app/lib/monitoring/errorReporter';
import Link from 'next/link';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode; fallbackHref?: string; fallbackLabel?: string; onReset?: () => void };
type State = { errorId: string | null; hasError: boolean };

function createErrorId() {
  const bytes = new Uint8Array(4);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function getSafePathname() {
  if (typeof window === 'undefined') return 'unknown';
  return window.location.pathname || 'unknown';
}

export class ErrorBoundary extends Component<Props, State> {
  private reportedErrorId: string | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { errorId: null, hasError: false };
  }

  static getDerivedStateFromError(): State {
    return {
      errorId: createErrorId(),
      hasError: true,
    };
  }

  override componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId ?? createErrorId();
    if (this.reportedErrorId === errorId) return;
    this.reportedErrorId = errorId;

    void reportError(error, {
      context: 'spokedu_master.error_boundary',
      tags: {
        componentStack: Boolean(errorInfo.componentStack),
        errorId,
        pathname: getSafePathname(),
      },
    }).catch(() => undefined);
  }

  private handleRetry = () => {
    if (this.props.onReset) {
      this.props.onReset();
      return;
    }
    window.location.reload();
  };

  override render() {
    if (!this.state.hasError) return this.props.children;
    const { fallbackHref = '/spokedu-master/dashboard', fallbackLabel = '홈으로' } = this.props;
    return (
      <div
        className="flex h-full flex-col items-center justify-center px-8 py-12 text-center"
        role="alert"
        style={{ background: 'var(--spm-bg)' }}
      >
        <div
          aria-hidden="true"
          className="mb-5 grid h-16 w-16 place-items-center rounded-[18px]"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)' }}
        >
          <span className="text-[28px]">!</span>
        </div>
        <h2 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>화면을 불러오지 못했습니다.</h2>
        <p className="mt-3 max-w-[360px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          잠시 후 다시 시도해 주세요.
        </p>
        {this.state.errorId ? (
          <p className="mt-2 rounded-[10px] px-3 py-2 text-[11px] font-mono" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t3)' }}>
            오류 ID: {this.state.errorId}
          </p>
        ) : null}
        <div className="mt-7 flex gap-2">
          <button
            type="button"
            onClick={this.handleRetry}
            className="h-11 rounded-[12px] px-5 text-[13px] font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
          >
            다시 시도
          </button>
          <Link href={fallbackHref} className="flex h-11 items-center rounded-[12px] px-5 text-[13px] font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500" style={{ background: 'var(--spm-acc)' }}>
            {fallbackLabel}
          </Link>
        </div>
      </div>
    );
  }
}
