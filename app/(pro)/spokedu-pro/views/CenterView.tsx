'use client';

/**
 * 센터 설정 뷰 — 센터 프로필 편집, 강사 초대/관리, 센터 전환
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Pencil, Save, UserPlus, Trash2, RefreshCw,
  Crown, Shield, User, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { useProContext } from '../hooks/useProContext';

// ── 타입 ────────────────────────────────────────────────────────────────────
type CenterProfile = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
};

type Member = {
  id: string;
  userId: string;
  email: string;
  role: 'admin' | 'coach';
  joinedAt: string;
};

// ── 역할 배지 ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  if (role === 'owner') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
        <Crown className="w-3 h-3" /> 오너
      </span>
    );
  }
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
        <Shield className="w-3 h-3" /> 관리자
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600">
      <User className="w-3 h-3" /> 강사
    </span>
  );
}

// ── 메인 뷰 ─────────────────────────────────────────────────────────────────
export default function CenterView() {
  const { ctx, refresh: refreshCtx } = useProContext();
  const [center, setCenter] = useState<CenterProfile | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'coach'>('coach');
  const [inviting, setInviting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  const isOwner = ctx.role === 'owner';
  const plan = ctx.entitlement.plan;
  const isPro = plan === 'pro' && ctx.entitlement.isPro;
  const dbReady = ctx.dbReady;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [centerRes, membersRes] = await Promise.all([
        fetch('/api/spokedu-pro/center', { credentials: 'include' }),
        fetch('/api/spokedu-pro/center/members', { credentials: 'include' }),
      ]);
      if (centerRes.ok) {
        const d = await centerRes.json();
        setCenter(d.center);
        setEditName(d.center.name ?? '');
        setEditAddress(d.center.address ?? '');
        setEditPhone(d.center.phone ?? '');
      }
      if (membersRes.ok) {
        const d = await membersRes.json();
        setMembers(d.members ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (dbReady && ctx.activeCenterId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [dbReady, ctx.activeCenterId, fetchData]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/spokedu-pro/center', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, address: editAddress, phone: editPhone }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setCenter(data.center);
        setEditMode(false);
        setMsg({ text: '센터 정보가 저장되었습니다.', type: 'ok' });
        refreshCtx();
      } else {
        setMsg({ text: data.error ?? '저장 실패', type: 'err' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/spokedu-pro/center/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setMembers((prev) => [...prev, data.member]);
        setInviteEmail('');
        setMsg({ text: `${data.member.email}을(를) 강사로 추가했습니다.`, type: 'ok' });
      } else if (data.error === 'coach_limit_reached') {
        setMsg({ text: `Pro 플랜에서 최대 ${data.limit}명까지 강사를 추가할 수 있습니다.`, type: 'err' });
      } else {
        setMsg({ text: data.error ?? '초대 실패', type: 'err' });
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setDeleteId(memberId);
    setMsg(null);
    try {
      const res = await fetch(`/api/spokedu-pro/center/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        setMsg({ text: '멤버가 제거되었습니다.', type: 'ok' });
      } else {
        setMsg({ text: data.error ?? '제거 실패', type: 'err' });
      }
    } finally {
      setDeleteId(null);
    }
  };

  const handleSwitchCenter = async (centerId: string) => {
    await fetch('/api/spokedu-pro/context/select-center', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ centerId }),
      credentials: 'include',
    });
    await refreshCtx();
    fetchData();
  };

  if (!dbReady) {
    return (
      <section className="px-6 lg:px-12 py-10 pb-32 max-w-4xl mx-auto">
        <div className="px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <p className="font-bold">DB 마이그레이션 미적용</p>
          <p className="text-amber-400/80 mt-1">
            SPOKEDU_PRO_DB_READY=true 환경변수 설정 후 센터 기능이 활성화됩니다.
          </p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> 불러오는 중...
        </div>
      </section>
    );
  }

  if (!ctx.activeCenterId) {
    return (
      <section className="px-6 lg:px-12 py-10 pb-32 max-w-4xl mx-auto">
        <div className="text-center py-20 text-slate-500 text-sm">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-700" />
          <p>센터가 설정되지 않았습니다. 먼저 플랜 & 결제 페이지에서 센터를 생성하세요.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 lg:px-12 py-10 pb-32 space-y-10 max-w-4xl mx-auto">
      {/* 헤더 */}
      <header className="space-y-3 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full text-xs font-bold uppercase tracking-widest">
          <Building2 className="w-4 h-4" /> 센터 설정
        </div>
        <h2 className="text-4xl font-black text-white tracking-tight">센터 관리</h2>
        <p className="text-slate-400 font-medium">센터 정보를 편집하고 강사를 관리하세요.</p>
      </header>

      {/* 멀티센터 전환 */}
      {ctx.centers.length > 1 && (
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">센터 전환</p>
          <div className="flex flex-wrap gap-2">
            {ctx.centers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSwitchCenter(c.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                  c.id === ctx.activeCenterId
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 피드백 메시지 */}
      {msg && (
        <div
          className={`flex items-center gap-2 px-5 py-4 rounded-xl text-sm ${
            msg.type === 'ok'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/20 text-red-300'
          }`}
        >
          {msg.type === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* 센터 프로필 */}
      <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-white uppercase tracking-widest">센터 프로필</p>
          {isOwner && !editMode && (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> 편집
            </button>
          )}
        </div>

        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-1">센터 이름 *</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-1">주소</label>
              <input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="서울시 강남구..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-1">전화번호</label>
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-800 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                disabled={!editName.trim() || saving}
                onClick={handleSaveProfile}
                className="flex-1 flex items-center gap-2 justify-center py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500">센터 이름</p>
              <p className="text-lg font-bold text-white">{center?.name ?? '—'}</p>
            </div>
            {center?.address && (
              <div>
                <p className="text-xs text-slate-500">주소</p>
                <p className="text-sm text-slate-300">{center.address}</p>
              </div>
            )}
            {center?.phone && (
              <div>
                <p className="text-xs text-slate-500">전화번호</p>
                <p className="text-sm text-slate-300">{center.phone}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 강사 관리 */}
      <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-white uppercase tracking-widest">강사 관리</p>
          <span className="text-xs text-slate-500">
            {isPro ? `최대 5명 (Pro)` : '단독 계정 (free/basic)'}
          </span>
        </div>

        {/* 오너 행 */}
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xs shrink-0">
            O
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">나 (센터 오너)</p>
          </div>
          <RoleBadge role="owner" />
        </div>

        {/* 멤버 목록 */}
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-xs shrink-0">
              {member.email.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{member.email}</p>
              <p className="text-xs text-slate-500">가입일 {new Date(member.joinedAt).toLocaleDateString('ko-KR')}</p>
            </div>
            <RoleBadge role={member.role} />
            {isOwner && (
              <button
                type="button"
                disabled={deleteId === member.id}
                onClick={() => handleRemoveMember(member.id)}
                className="p-2 rounded-lg hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50 ml-1"
              >
                {deleteId === member.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        ))}

        {/* 초대 폼 (Pro 플랜 + owner만) */}
        {isOwner && (
          <div className="pt-2">
            {!isPro && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-slate-500 text-xs mb-4">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                Pro 플랜에서 최대 5명까지 강사 계정을 추가할 수 있습니다.
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={!isPro}
                placeholder="강사 이메일 주소"
                className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'coach')}
                disabled={!isPro}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="coach">강사</option>
                <option value="admin">관리자</option>
              </select>
              <button
                type="button"
                disabled={!isPro || !inviteEmail.trim() || inviting}
                onClick={handleInvite}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
              >
                {inviting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                강사 추가
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
