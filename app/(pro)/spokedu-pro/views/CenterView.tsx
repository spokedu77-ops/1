'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Users,
  UserPlus,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Crown,
  Shield,
  User,
} from 'lucide-react';
import { useProContext, type CenterRole } from '../hooks/useProContext';

type Member = {
  userId: string;
  email: string;
  role: CenterRole;
  joinedAt: string;
};

type Msg = { text: string; type: 'ok' | 'err' };

const ROLE_LABELS: Record<CenterRole, string> = {
  owner: '오너',
  admin: '관리자',
  coach: '코치',
};

const ROLE_ICONS: Record<CenterRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  coach: User,
};

export default function CenterView() {
  const { ctx, loading: ctxLoading } = useProContext();

  const [members, setMembers] = useState<Member[]>([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  // 인라인 삭제 확인: 첫 클릭 → deleteConfirmId 세팅, 두 번째 클릭 → 삭제, 3초 후 원복
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [switchingCenterId, setSwitchingCenterId] = useState<string | null>(null);

  // 멤버 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CenterRole>('coach');
  const [adding, setAdding] = useState(false);

  // 메시지 5초 후 자동 소멸
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 5000);
    return () => clearTimeout(t);
  }, [msg]);

  // deleteConfirmId 3초 후 원복
  useEffect(() => {
    if (!deleteConfirmId) return;
    const t = setTimeout(() => setDeleteConfirmId(null), 3000);
    return () => clearTimeout(t);
  }, [deleteConfirmId]);

  const fetchData = useCallback(async () => {
    if (!ctx.activeCenterId) return;
    setFetchingData(true);
    try {
      const res = await fetch(`/api/spokedu-pro/center/members?centerId=${ctx.activeCenterId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setMsg({ text: '데이터를 불러오지 못했습니다.', type: 'err' });
        return;
      }
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch {
      setMsg({ text: '데이터를 불러오지 못했습니다.', type: 'err' });
    } finally {
      setFetchingData(false);
    }
  }, [ctx.activeCenterId]);

  useEffect(() => {
    if (!ctxLoading) {
      fetchData();
    }
  }, [ctxLoading, fetchData]);

  const handleSwitchCenter = async (centerId: string) => {
    if (centerId === ctx.activeCenterId) return;
    setSwitchingCenterId(centerId);
    try {
      const res = await fetch('/api/spokedu-pro/context/select-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centerId }),
        credentials: 'include',
      });
      if (!res.ok) {
        setMsg({ text: '센터 전환에 실패했습니다.', type: 'err' });
      } else {
        window.location.reload();
      }
    } catch {
      setMsg({ text: '센터 전환 중 오류가 발생했습니다.', type: 'err' });
    } finally {
      setSwitchingCenterId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (deleteConfirmId !== userId) {
      setDeleteConfirmId(userId);
      return;
    }
    setDeleteConfirmId(null);
    try {
      const res = await fetch('/api/spokedu-pro/center/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, centerId: ctx.activeCenterId }),
        credentials: 'include',
      });
      if (!res.ok) {
        setMsg({ text: '멤버 삭제에 실패했습니다.', type: 'err' });
        return;
      }
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      setMsg({ text: '멤버가 삭제되었습니다.', type: 'ok' });
    } catch {
      setMsg({ text: '멤버 삭제 중 오류가 발생했습니다.', type: 'err' });
    }
  };

  const handleAddMember = async () => {
    if (!inviteEmail.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/spokedu-pro/center/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole, centerId: ctx.activeCenterId }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error ?? '멤버 추가에 실패했습니다.', type: 'err' });
        return;
      }
      const addedEmail = inviteEmail.trim();
      setMembers((prev) => [...prev, data.member]);
      setInviteEmail('');
      setShowAddForm(false);
      setMsg({ text: `${addedEmail} 멤버가 추가되었습니다.`, type: 'ok' });
    } catch {
      setMsg({ text: '멤버 추가 중 오류가 발생했습니다.', type: 'err' });
    } finally {
      setAdding(false);
    }
  };

  if (ctxLoading) {
    return (
      <section className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>센터 정보 불러오는 중...</span>
        </div>
      </section>
    );
  }

  if (!ctx.dbReady) {
    return (
      <section className="px-6 lg:px-12 py-10 max-w-3xl mx-auto">
        <div className="px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <p className="font-bold">DB 마이그레이션 필요</p>
          <p className="text-amber-400/80 mt-1">센터 관리 기능은 DB 마이그레이션 완료 후 사용할 수 있습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 lg:px-12 py-10 pb-32 space-y-8 max-w-4xl mx-auto">
      {/* 헤더 */}
      <header className="space-y-3 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase tracking-widest">
          <Building2 className="w-4 h-4" /> 센터 관리
        </div>
        <h2 className="text-4xl font-black text-white tracking-tight">센터 & 멤버</h2>
        <p className="text-slate-400 font-medium">센터 정보를 확인하고 멤버를 관리하세요.</p>
      </header>

      {/* 알림 메시지 */}
      {msg && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${
            msg.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          {msg.type === 'ok' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {msg.text}
        </div>
      )}

      {/* 센터 목록 (복수 센터 전환) */}
      {ctx.centers.length > 1 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">내 센터 목록</p>
          <div className="space-y-2">
            {ctx.centers.map((center) => {
              const isActive = center.id === ctx.activeCenterId;
              const isSwitching = switchingCenterId === center.id;
              return (
                <div
                  key={center.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span className="text-sm font-bold text-white">{center.name}</span>
                    <span className="text-xs text-slate-500">{ROLE_LABELS[center.role]}</span>
                    {isActive && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">
                        활성
                      </span>
                    )}
                  </div>
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => handleSwitchCenter(center.id)}
                      disabled={!!switchingCenterId}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSwitching ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                      {isSwitching ? '전환 중...' : '전환'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 현재 센터 정보 */}
      {ctx.activeCenterId && (
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-2">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">현재 센터</p>
          <p className="text-lg font-bold text-white">{ctx.centers.find((c) => c.id === ctx.activeCenterId)?.name ?? '내 센터'}</p>
          <p className="text-xs text-slate-400">역할: {ctx.role ? ROLE_LABELS[ctx.role] : '오너'}</p>
        </div>
      )}

      {/* 멤버 목록 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-bold text-white">멤버</p>
            {fetchingData && <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
          </div>
          {(ctx.role === 'owner' || ctx.role === 'admin') && (
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              멤버 초대
            </button>
          )}
        </div>

        {/* 멤버 추가 폼 */}
        {showAddForm && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
            <p className="text-white font-bold text-sm">새 멤버 초대</p>
            <div className="flex flex-wrap gap-3">
              <input
                type="email"
                placeholder="이메일 주소"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                className="flex-1 min-w-[200px] bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as CenterRole)}
                className="bg-slate-900 border border-slate-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500"
              >
                <option value="coach">코치</option>
                <option value="admin">관리자</option>
              </select>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={adding || !inviteEmail.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                초대
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setInviteEmail(''); }}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 멤버 목록 */}
        {members.length === 0 && !fetchingData ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-600" />
            <p className="text-slate-500 text-sm">
              {ctx.activeCenterId ? '등록된 멤버가 없습니다.' : '센터를 먼저 생성해주세요.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const RoleIcon = ROLE_ICONS[member.role];
              const isConfirming = deleteConfirmId === member.userId;
              const isOwner = member.role === 'owner';
              return (
                <div
                  key={member.userId}
                  className="flex items-center justify-between px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center">
                      <RoleIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{member.email}</p>
                      <p className="text-xs text-slate-500">
                        {ROLE_LABELS[member.role]} · {new Date(member.joinedAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  {!isOwner && (ctx.role === 'owner' || ctx.role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.userId)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        isConfirming
                          ? 'bg-red-600 hover:bg-red-500 text-white'
                          : 'bg-slate-700 hover:bg-red-900/40 text-slate-400 hover:text-red-400'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isConfirming ? '정말요?' : '삭제'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
