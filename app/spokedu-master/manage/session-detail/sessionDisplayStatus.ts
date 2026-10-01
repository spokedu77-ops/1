import type { MasterSessionStatus } from '../../types/operational';

export type SessionDisplayStatus = {
  kind: 'scheduled' | 'running' | 'completed' | 'cancelled';
  label: '예정' | '진행 중' | '완료' | '취소';
  dotClassName: string;
  textClassName: string;
};

export function resolveSessionDisplayStatus({ status, startedAt }: { status: MasterSessionStatus; startedAt: string | null }): SessionDisplayStatus {
  if (status === 'cancelled') return { kind: 'cancelled', label: '취소', dotClassName: 'bg-rose-500', textClassName: 'text-rose-600' };
  if (status === 'completed') return { kind: 'completed', label: '완료', dotClassName: 'bg-emerald-500', textClassName: 'text-emerald-700' };
  if (startedAt) return { kind: 'running', label: '진행 중', dotClassName: 'bg-amber-500', textClassName: 'text-amber-700' };
  return { kind: 'scheduled', label: '예정', dotClassName: 'bg-blue-600', textClassName: 'text-slate-600' };
}
