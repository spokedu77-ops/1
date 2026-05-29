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
        background: 'linear-gradient(90deg, #e2e8f0 25%, #f8fafc 50%, #e2e8f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'spmSkeleton 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ height = 150 }: { height?: number }) {
  return (
    <div className="rounded-[16px] p-4" style={{ background: '#ffffff', border: '1px solid #e2e8f0', height }}>
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
    <div className="h-[196px] w-[140px] shrink-0 overflow-hidden rounded-[14px] lg:h-[210px] lg:w-full" style={{ background: '#ffffff' }}>
      <Skeleton height="100%" rounded="14px" />
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="mx-[22px] mb-7 overflow-hidden rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
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
    <div className="h-full overflow-y-auto pb-28 lg:pb-7" style={{ background: '#f5f7fb' }}>
      <div className="flex items-center justify-between px-[22px] pb-[18px] pt-[22px] sm:px-8 lg:px-10">
        <div className="space-y-2">
          <Skeleton height={12} width={80} />
          <Skeleton height={22} width={120} />
        </div>
        <div className="flex gap-2">
          <Skeleton height={32} width={70} rounded="full" />
          <Skeleton height={38} width={38} rounded="10px" />
        </div>
      </div>
      <SkeletonHero />
      <div className="mb-7 px-[22px] sm:px-8 lg:px-10">
        <Skeleton height={18} width={120} className="mb-4" />
        <div className="grid gap-2 sm:grid-cols-3">
          <Skeleton height={86} rounded="14px" />
          <Skeleton height={86} rounded="14px" />
          <Skeleton height={86} rounded="14px" />
        </div>
      </div>
      <div className="mb-7 px-[22px] sm:px-8 lg:px-10">
        <Skeleton height={18} width={140} className="mb-4" />
        <Skeleton height={132} rounded="14px" />
      </div>
      <div className="mb-7 px-[22px] sm:px-8 lg:px-10">
        <Skeleton height={18} width={140} className="mb-4" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

export function LibrarySkeleton() {
  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-7" style={{ background: '#f5f7fb' }}>
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
