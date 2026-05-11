'use client';

import { useOperationalStatus } from '../../store';

export function StatusBar() {
  const operational = useOperationalStatus();

  return (
    <div className="sticky top-0 z-50 flex shrink-0 items-center justify-between border-b px-[22px]" style={{ height: 48, background: 'rgba(7,7,12,0.92)', backdropFilter: 'blur(20px)', borderColor: 'var(--spm-br)' }}>
      <span className="text-[12px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</span>
      <span className="rounded-full px-2.5 py-1 text-[11px] font-black" style={{ background: operational.online ? 'rgba(16,185,129,0.13)' : 'rgba(245,158,11,0.13)', color: operational.online ? 'var(--spm-grn)' : 'var(--spm-amb)' }}>
        {operational.online ? '온라인' : '오프라인'}
      </span>
    </div>
  );
}
