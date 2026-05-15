'use client';

import Link from 'next/link';
import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; fallbackHref?: string; fallbackLabel?: string };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    const { fallbackHref = '/spokedu-master/dashboard', fallbackLabel = '홈으로' } = this.props;
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center" style={{ background: 'var(--spm-bg)' }}>
        <div className="mb-5 grid h-16 w-16 place-items-center rounded-[18px]" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)' }}>
          <span className="text-[28px]">⚠</span>
        </div>
        <h2 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>문제가 발생했습니다</h2>
        <p className="mt-3 max-w-[360px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          화면을 불러오는 중 오류가 났습니다. 새로고침하거나 홈으로 돌아가 다시 시도해보세요.
        </p>
        <p className="mt-2 rounded-[10px] px-3 py-2 text-[11px] font-mono" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t3)' }}>
          {this.state.message}
        </p>
        <div className="mt-7 flex gap-2">
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="h-11 rounded-[12px] px-5 text-[13px] font-black"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
          >
            다시 시도
          </button>
          <Link href={fallbackHref} className="flex h-11 items-center rounded-[12px] px-5 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            {fallbackLabel}
          </Link>
        </div>
      </div>
    );
  }
}
