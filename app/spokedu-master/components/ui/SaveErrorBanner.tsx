import Link from 'next/link';

type SaveErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  upgradeHref?: string;
  upgradeLabel?: string;
  className?: string;
};

export function SaveErrorBanner({
  message,
  onRetry,
  retryLabel = '다시 시도',
  upgradeHref,
  upgradeLabel = '구독 선택',
  className = '',
}: SaveErrorBannerProps) {
  return (
    <div
      className={`rounded-[12px] p-3 ${className}`.trim()}
      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}
      role="alert"
    >
      <p className="text-[12px] font-bold leading-5" style={{ color: 'var(--spm-red, #dc2626)' }}>
        {message}
      </p>
      {onRetry || upgradeHref ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[11px] font-black"
              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--spm-red, #dc2626)' }}
            >
              {retryLabel}
            </button>
          ) : null}
          {upgradeHref ? (
            <Link
              href={upgradeHref}
              className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[11px] font-black"
              style={{ background: 'var(--spm-acc-a12)', color: 'var(--spm-acc)' }}
            >
              {upgradeLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
