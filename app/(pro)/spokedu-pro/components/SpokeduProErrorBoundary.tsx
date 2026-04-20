'use client';

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslator } from '@/app/providers/I18nProvider';

function SpokeduProErrorFallback({
  onRetry,
  devErrorMessage,
}: {
  onRetry: () => void;
  devErrorMessage?: string;
}) {
  const t = useTranslator();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12 bg-[#0F172A] text-slate-200">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{t('일시적인 오류가 났어요')}</h3>
      <p className="text-slate-400 text-sm text-center max-w-sm mb-6">
        {t('페이지를 새로 고치면 해결되는 경우가 많아요.')}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        {t('새로 고침')}
      </button>
      {devErrorMessage ? (
        <pre className="mt-6 p-4 rounded-lg bg-slate-800 text-xs text-left overflow-auto max-w-full max-h-40 w-full max-w-2xl">
          {devErrorMessage}
        </pre>
      ) : null}
    </div>
  );
}

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: ReactNode;
}

export class SpokeduProErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <SpokeduProErrorFallback
          onRetry={this.handleRetry}
          devErrorMessage={
            process.env.NODE_ENV === 'development' ? this.state.error.message : undefined
          }
        />
      );
    }
    return this.props.children;
  }
}
