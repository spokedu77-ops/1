'use client';

import Link from 'next/link';
import { ExternalLink, Play } from 'lucide-react';
import { MODES, SPOMOVE_CATALOG_SLOT_IDS, isSpomoveCatalogTbdMode } from '@/app/admin/spomove/training/_player/constants';

function ModeCard({ modeId }: { modeId: string }) {
  const mode = MODES[modeId];
  if (!mode || isSpomoveCatalogTbdMode(modeId)) return null;

  const firstLevel = mode.levels[0];

  return (
    <div
      className="rounded-[14px] p-4"
      style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <span className="text-[22px]">{mode.icon}</span>
          <h2 className="mt-1 text-[15px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>
            {mode.title}
          </h2>
          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.08em]" style={{ color: mode.accent }}>
            {mode.tag}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black"
          style={{ background: `${mode.accent}20`, color: mode.accent, border: `1px solid ${mode.accent}44` }}
        >
          {mode.coreCode}
        </span>
      </div>
      <p className="mb-3 text-[11px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>{mode.desc}</p>
      <div className="mb-3 flex flex-wrap gap-1">
        {mode.levels.map((level) => (
          <Link
            key={level.id}
            href={`/admin/spomove/training/_player?mode=${modeId}&level=${level.id}`}
            className="flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold"
            style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}
          >
            <Play size={9} fill="currentColor" />
            {level.name}
          </Link>
        ))}
      </div>
      {firstLevel ? (
        <Link
          href={`/admin/spomove/training/_player?mode=${modeId}&level=${firstLevel.id}`}
          className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-black text-white"
          style={{ background: mode.accent }}
        >
          <Play size={13} fill="#fff" />
          1단계 바로 실행
        </Link>
      ) : null}
    </div>
  );
}

export default function AdminSpokeduMasterSpomovePage() {
  const visibleSlots = SPOMOVE_CATALOG_SLOT_IDS.filter((id) => !isSpomoveCatalogTbdMode(id));

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>screen movement engine</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>SPOMOVE</h1>
        <p className="mt-2 max-w-[720px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          실제 SPOMOVE 훈련 모드 {visibleSlots.length}종 · 각 모드를 클릭해 어드민 플레이어에서 바로 실행합니다.
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href="/admin/spomove/training"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center gap-2 rounded-[10px] px-3 text-[12px] font-black"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
          >
            <ExternalLink size={14} />
            SPOMOVE 전체 관리 (새 탭)
          </Link>
        </div>
      </header>

      <div className="grid gap-3 px-[22px] sm:grid-cols-2 sm:px-8 lg:grid-cols-3 xl:grid-cols-4 lg:px-10">
        {visibleSlots.map((id) => (
          <ModeCard key={id} modeId={id} />
        ))}
      </div>
    </div>
  );
}
