'use client';

import { Bell, CircleUserRound, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useOperationalStatus } from '../../store';

export function StatusBar() {
  const operational = useOperationalStatus();

  return (
    <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b px-[22px] sm:px-8 lg:px-10" style={{ background: 'rgba(7,7,12,0.9)', backdropFilter: 'blur(22px)', borderColor: 'var(--spm-br)' }}>
      <div className="min-w-0">
        <span className="block text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU PRO</span>
        <span className="hidden text-[12px] font-semibold sm:block" style={{ color: 'var(--spm-t2)' }}>수업 준비와 SPOMOVE 실행을 위한 구독 플랫폼</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black sm:inline-flex" style={{ background: operational.online ? 'rgba(16,185,129,0.13)' : 'rgba(245,158,11,0.13)', color: operational.online ? 'var(--spm-grn)' : 'var(--spm-amb)' }}>
          {operational.online ? <Wifi size={13} /> : <WifiOff size={13} />}
          {operational.online ? '온라인' : '오프라인'}
        </span>
        <Link href="/spokedu-master/profile" className="grid h-9 w-9 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="내 정보와 알림">
          <Bell size={16} color="var(--spm-t2)" />
        </Link>
        <Link href="/spokedu-master/profile" className="grid h-9 w-9 place-items-center rounded-[12px]" style={{ background: 'var(--spm-acc)' }} aria-label="내 정보">
          <CircleUserRound size={17} color="#fff" />
        </Link>
      </div>
    </div>
  );
}
