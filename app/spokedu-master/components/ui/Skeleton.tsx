'use client';

import { type CSSProperties } from 'react';

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
  height?: number | string;
  width?: number | string;
  rounded?: string;
};

export function Skeleton({ className = '', style, height, width, rounded = '10px' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        height,
        width,
        borderRadius: rounded,
        background: 'linear-gradient(90deg, var(--spm-s3) 25%, var(--spm-s1) 50%, var(--spm-s3) 75%)',
        backgroundSize: '200% 100%',
        animation: 'spmSkeleton 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ height = 150 }: { height?: number }) {
  return (
    <div className="rounded-[16px] p-4" style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)', height }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton height={10} width="40%" />
          <Skeleton height={18} width="75%" />
          <Skeleton height={12} width="90%" />
          <Skeleton height={12} width="60%" />
        </div>
        <Skeleton height={58} width={58} rounded="10px" style={{ flexShrink: 0 }} />
      </div>
    </div>
  );
}

export function SkeletonPosterCard() {
  return (
    <div className="h-[196px] w-[140px] shrink-0 overflow-hidden rounded-[14px] lg:h-[210px] lg:w-full" style={{ background: 'var(--spm-s1)' }}>
      <Skeleton height="100%" rounded="14px" />
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="mb-6 overflow-hidden p-4 min-[768px]:mx-6 min-[768px]:mb-8 min-[768px]:rounded-[18px] min-[768px]:p-6 min-[1200px]:mx-auto min-[1200px]:max-w-[1184px]" style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)' }}>
      <Skeleton height={10} width="30%" className="mb-3" />
      <Skeleton height={34} width="70%" className="mb-3" />
      <Skeleton height={14} width="90%" className="mb-2" />
      <Skeleton height={14} width="60%" className="mb-5" />
      <div className="flex gap-2">
        <Skeleton height={48} rounded="12px" style={{ flex: 1 }} />
        <Skeleton height={48} rounded="12px" style={{ flex: 1 }} />
        <Skeleton height={48} rounded="12px" style={{ flex: 1 }} />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--spm-bg)' }}>
      <SkeletonHero />
      <div className="mx-auto w-full max-w-[1168px] px-4 pt-6 min-[768px]:px-6 min-[768px]:pt-8">
        <Skeleton height={24} width={132} className="mb-4" />
        <div data-dashboard-skeleton-grid="operational" className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-3 min-[768px]:gap-4">
          {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-[120px] min-[768px]:h-[132px]" rounded="16px" />)}
        </div>
      </div>
      {(['weekly', 'spomove'] as const).map((section) => (
        <div key={section} className={`mx-auto w-full max-w-[1168px] px-4 pt-10 min-[768px]:px-6 min-[768px]:pt-12 ${section === 'spomove' ? 'pb-6 min-[768px]:pb-12' : ''}`}>
          <Skeleton height={24} width={210} className="mb-4 min-[768px]:mb-5" />
          <div data-dashboard-skeleton-grid={section} className="grid grid-cols-2 gap-3 min-[768px]:gap-5 min-[1024px]:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-[16px] border border-slate-200/80 bg-white">
                <Skeleton
                  className={`w-full !rounded-none ${section === 'weekly' ? 'aspect-[4/3]' : 'aspect-[3/2]'}`}
                />
                <div className="space-y-2 px-3.5 pb-3.5 pt-3">
                  <Skeleton height={10} width="45%" />
                  <Skeleton height={18} width="78%" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LibrarySkeleton() {
  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-7" style={{ background: 'var(--spm-bg)' }}>
      <div className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <Skeleton height={12} width={100} className="mb-2" />
        <Skeleton height={42} width={200} className="mb-5" />
        <Skeleton height={44} rounded="12px" />
      </div>
      <div className="mb-7 px-[22px] sm:px-8 lg:px-10">
        <Skeleton height={160} rounded="18px" />
      </div>
      <div className="mb-7 flex gap-2 overflow-x-auto px-[22px] sm:px-8 lg:px-10">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={32} width={72} rounded="full" style={{ flexShrink: 0 }} />)}
      </div>
      <div className="mb-7">
        <div className="mb-[14px] flex items-center justify-between px-[22px] sm:px-8 lg:px-10">
          <Skeleton height={18} width={140} />
        </div>
        <div className="flex gap-[9px] overflow-x-auto px-[22px] sm:px-8 lg:px-10">
          {Array.from({ length: 4 }, (_, i) => <SkeletonPosterCard key={i} />)}
        </div>
      </div>
      <div className="px-[22px] sm:px-8 lg:px-10">
        <Skeleton height={18} width={100} className="mb-4" />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
