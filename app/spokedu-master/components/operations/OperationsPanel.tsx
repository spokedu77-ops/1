'use client';

import { CheckCircle2, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react';
import { useMasterStore, useOperationalStatus } from '../../store';

function formatSyncTime(value: string | null) {
  if (!value) return '아직 동기화 기록 없음';
  return new Date(value).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function OperationsPanel({ compact = false }: { compact?: boolean }) {
  const operational = useOperationalStatus();
  const removeRetry = useMasterStore((state) => state.removeRetry);
  const setLastSyncNow = useMasterStore((state) => state.setLastSyncNow);

  return (
    <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>operations</p>
          <h2 className="mt-2 text-[20px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
            운영 상태
          </h2>
          <p className="mt-1 text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>
            마지막 동기화 {formatSyncTime(operational.lastSyncAt)}
          </p>
        </div>
        <span
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-black"
          style={{ background: operational.online ? 'rgba(16,185,129,0.13)' : 'rgba(245,158,11,0.13)', color: operational.online ? 'var(--spm-grn)' : 'var(--spm-amb)' }}
        >
          {operational.online ? <Wifi size={13} /> : <WifiOff size={13} />}
          {operational.online ? '온라인' : '오프라인'}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-[12px] p-3" style={{ background: 'var(--spm-s3)' }}>
          <p className="text-[18px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{operational.retryQueue.length}</p>
          <p className="mt-1 text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>재시도 대기</p>
        </div>
        <div className="rounded-[12px] p-3" style={{ background: 'var(--spm-s3)' }}>
          <p className="text-[18px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{operational.online ? '정상' : '보관'}</p>
          <p className="mt-1 text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>기록 동기화</p>
        </div>
        <button type="button" onClick={setLastSyncNow} className="rounded-[12px] p-3 text-left" style={{ background: 'var(--spm-s3)' }}>
          <p className="flex items-center gap-1 text-[13px] font-black" style={{ color: 'var(--spm-t)' }}><RefreshCw size={14} /> 수동 동기화</p>
          <p className="mt-1 text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>계약 호출 준비</p>
        </button>
      </div>

      {operational.retryQueue.length > 0 ? (
        <div className="mt-4 space-y-2">
          {operational.retryQueue.slice(0, compact ? 2 : 6).map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-[12px] p-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.18)' }}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: 'rgba(245,158,11,0.12)' }}>
                <RefreshCw size={15} color="var(--spm-amb)" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[13px]" style={{ color: 'var(--spm-t)' }}>{item.title}</strong>
                <span className="mt-1 block text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{item.type} · {item.retryable ? '재시도 가능' : '수동 확인 필요'}</span>
              </span>
              <button type="button" onClick={() => { removeRetry(item.id); setLastSyncNow(); }} className="grid h-8 w-8 place-items-center rounded-[9px]" style={{ background: 'rgba(16,185,129,0.13)' }} aria-label="재시도 완료 처리">
                <CheckCircle2 size={15} color="var(--spm-grn)" />
              </button>
              <button type="button" onClick={() => removeRetry(item.id)} className="grid h-8 w-8 place-items-center rounded-[9px]" style={{ background: 'rgba(239,68,68,0.12)' }} aria-label="재시도 항목 삭제">
                <Trash2 size={14} color="var(--spm-red)" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--spm-grn)' }}>
          대기 중인 실패 항목이 없습니다.
        </p>
      )}
    </section>
  );
}
