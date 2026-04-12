'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { 
  Search, Smartphone, Loader2, Edit3, X, FileText, Download,
  Activity, CheckCircle2, Power, GraduationCap, UserPlus, Clock, FileCheck, MapPin, KeyRound, ChevronDown
} from 'lucide-react';
import { devLogger } from '@/app/lib/logging/devLogger';
import { CountingTab } from './CountingTab';
import { TeacherTierBadge } from '@/app/components/admin/TeacherTierBadge';
import {
  cloneTierFeeMap,
  computeTier,
  effectiveFees,
  getTierDefaultFees,
  HARD_CODED_TIER_FEES,
  TEACHER_TIER_IDS,
  tierLabelKo,
  totalLessonsFromCounts,
  type TierFeeMap,
} from '@/app/lib/teacherTierSchedule';
import { fetchTeacherTierFeeMap } from '@/app/lib/teacherTierFeesStore';

interface DocumentFile {
  name: string;
  url: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher';
  phone: string | null;
  organization: string | null;
  departure_location?: string | null;
  schedule?: string | null;
  documents: DocumentFile[] | null;
  is_active: boolean;
  ending_soon?: boolean;
  points?: number;
  session_count?: number;
  /** 카운팅 탭과 동일: session_count_logs 건수 (클라이언트에서 병합) */
  logCount?: number;
  fee_private?: number | null;
  fee_group?: number | null;
  fee_center_main?: number | null;
  fee_center_assist?: number | null;
  fee_auto_from_tier?: boolean | null;
}

export default function UserDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const mainTab = (tabFromUrl === 'counting' ? 'counting' : 'info') as 'info' | 'counting';

  const setMainTab = (tab: 'info' | 'counting') => {
    router.replace(tab === 'counting' ? '/admin/users?tab=counting' : '/admin/users');
  };

  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [users, setUsers] = useState<UserData[]>([]);
  const [, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState<'live' | 'ending_soon' | 'done'>('live');
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserData>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPartner, setNewPartner] = useState<Partial<UserData>>({ role: 'teacher', is_active: true });
  const [addPartnerLoading, setAddPartnerLoading] = useState(false);
  const [createdCredential, setCreatedCredential] = useState<{ email: string; initialPassword: string } | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ email: string; initialPassword: string } | null>(null);
  const [resetPasswordLoadingId, setResetPasswordLoadingId] = useState<string | null>(null);
  const [tierFeeMap, setTierFeeMap] = useState<TierFeeMap>(() => cloneTierFeeMap(HARD_CODED_TIER_FEES));
  const [tierFeeDraft, setTierFeeDraft] = useState<TierFeeMap>(() => cloneTierFeeMap(HARD_CODED_TIER_FEES));
  const [tierFeeSaving, setTierFeeSaving] = useState(false);
  const [tierFeeTableOpen, setTierFeeTableOpen] = useState(false);
  /** 강사 카드별 「적용/기본 수업료」 블록 펼침 (기본 접힘) */
  const [userFeeSectionOpen, setUserFeeSectionOpen] = useState<Record<string, boolean>>({});
  const tierFeeFallbackNotifiedRef = useRef(false);

  const fetchUsers = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher')
        .order('name');
      if (error) {
        devLogger.error('[users] fetchUsers error:', error);
        throw error;
      }
      const base = (data as UserData[]).map((u) => ({
        ...u,
        is_active: u.is_active ?? true,
        ending_soon: u.ending_soon ?? false,
        documents: u.documents || [],
      }));
      const teacherIds = base.map((u) => u.id);
      const logCountByTeacher: Record<string, number> = {};
      if (teacherIds.length > 0) {
        const { data: logRows } = await supabase
          .from('session_count_logs')
          .select('teacher_id')
          .in('teacher_id', teacherIds);
        if (logRows) {
          for (const row of logRows) {
            const tid = row.teacher_id as string;
            if (tid) logCountByTeacher[tid] = (logCountByTeacher[tid] || 0) + 1;
          }
        }
      }
      const fetchedUsers = base.map((u) => ({
        ...u,
        logCount: logCountByTeacher[u.id] ?? 0,
      }));
      setUsers(fetchedUsers);
      const tierRes = await fetchTeacherTierFeeMap(supabase);
      setTierFeeMap(tierRes.map);
      setTierFeeDraft(cloneTierFeeMap(tierRes.map));
      if (tierRes.source === 'fallback' && !tierFeeFallbackNotifiedRef.current) {
        tierFeeFallbackNotifiedRef.current = true;
        toast.warning(
          '등급 수업료 표를 DB에서 불러오지 못해 기본값을 사용합니다. sql/65_teacher_tier_fees_table.sql 적용 여부를 확인하세요.'
        );
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: me } = await supabase.from('users').select('id, name, role').eq('id', session.user.id).single();
        if (me) setCurrentUser(me as UserData);
      }
    } catch (err: unknown) {
      devLogger.error('[users] fetchUsers catch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSaveInfo = async (userId: string) => {
    if (!supabase || currentUser?.role !== 'admin') return toast.error('관리자 권한이 없습니다.');
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name,
          phone: editForm.phone,
          organization: editForm.organization,
          departure_location: editForm.departure_location,
          schedule: editForm.schedule,
          ending_soon: editForm.ending_soon,
          fee_private: editForm.fee_private ?? null,
          fee_group: editForm.fee_group ?? null,
          fee_center_main: editForm.fee_center_main ?? null,
          fee_center_assist: editForm.fee_center_assist ?? null,
          fee_auto_from_tier: editForm.fee_auto_from_tier ?? true,
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      setEditingId(null);
      fetchUsers();
      toast.success('성공적으로 업데이트되었습니다.');
    } catch {
      toast.error('저장 실패: DB 컬럼을 확인해주세요.');
    }
  };

  const toggleActiveStatus = async (user: UserData) => {
    if (!supabase || currentUser?.role !== 'admin') return toast.error('권한이 없습니다.');
    const nextStatus = !user.is_active;
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: nextStatus } : u));
    try {
      await supabase.from('users').update({ is_active: nextStatus }).eq('id', user.id);
    } catch {
      fetchUsers();
    }
  };

  const toggleEndingSoon = async (user: UserData) => {
    if (!supabase || currentUser?.role !== 'admin') return toast.error('권한이 없습니다.');
    if (!user.is_active) return; // 종료된 강사는 종료 예정 플래그 무의미
    const next = !(user.ending_soon ?? false);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ending_soon: next } : u));
    try {
      await supabase.from('users').update({ ending_soon: next }).eq('id', user.id);
    } catch {
      fetchUsers();
    }
  };

  const handleAddPartner = async () => {
    if (currentUser?.role !== 'admin') return toast.error('관리자 권한이 필요합니다.');
    if (!newPartner.name?.trim()) return toast.error('이름을 입력해주세요.');
    setAddPartnerLoading(true);
    try {
      const res = await fetch('/api/admin/teachers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPartner.name.trim(),
          email: (newPartner.email as string)?.trim() || undefined,
          phone: newPartner.phone ?? undefined,
          organization: newPartner.organization ?? undefined,
          departure_location: newPartner.departure_location ?? undefined,
        }),
      });
      const data = await res.json().catch((err) => {
        devLogger.error('[admin/users] create teacher response body', err);
        return {};
      });
      if (!res.ok) {
        toast.error(data.error || '등록에 실패했습니다.');
        return;
      }
      setIsAddModalOpen(false);
      setNewPartner({ role: 'teacher', is_active: true });
      fetchUsers();
      toast.success('등록되었습니다. 아래 로그인 정보를 강사에게 전달하세요.');
      setCreatedCredential({ email: data.email ?? '', initialPassword: data.initialPassword ?? '' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '등록 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setAddPartnerLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, user: UserData) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    setUploadingId(user.id);
    try {
      // 파일명을 안전하게 인코딩
      const timestamp = Date.now();
      const fileExt = file.name.substring(file.name.lastIndexOf('.'));
      const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
      const sanitizedBaseName = baseName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      
      const filePath = `${user.id}/${timestamp}_${sanitizedBaseName}${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('instructors')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('instructors')
        .getPublicUrl(filePath);
      
      const updatedDocs = [...(user.documents || []), { 
        name: file.name,
        url: publicUrl 
      }];
      
      await supabase.from('users').update({ documents: updatedDocs }).eq('id', user.id);
      fetchUsers();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error('파일 업로드에 실패했습니다: ' + msg);
    } finally {
      setUploadingId(null);
    }
  };

  const handleResetPassword = async (user: UserData) => {
    if (currentUser?.role !== 'admin') return toast.error('관리자 권한이 필요합니다.');
    if (!confirm(`${user.name} 선생님 비밀번호를 새로 발급합니다. 강사에게 전달할 새 비밀번호가 한 번 표시됩니다. 계속할까요?`)) return;
    const customPassword =
      typeof window !== 'undefined'
        ? window.prompt(
            '새 비밀번호를 입력하세요.\n(비우면 임의 비밀번호가 생성됩니다.)',
            ''
          )
        : null;
    if (customPassword === null) return;
    setResetPasswordLoadingId(user.id);
    try {
      const res = await fetch('/api/admin/teachers/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ...(customPassword.trim() ? { password: customPassword.trim() } : {}),
        }),
      });
      const data = await res.json().catch((err) => {
        devLogger.error('[admin/users] reset-password response body', err);
        return {};
      });
      if (!res.ok) {
        toast.error(data.error || '비밀번호 재설정에 실패했습니다.');
        return;
      }
      setResetPasswordResult({ email: data.email ?? user.email, initialPassword: data.initialPassword ?? '' });
      toast.success('비밀번호가 재설정되었습니다. 아래 비밀번호를 강사에게 전달하세요.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '비밀번호 재설정 중 오류가 발생했습니다.');
    } finally {
      setResetPasswordLoadingId(null);
    }
  };

  const deleteDocument = async (user: UserData, index: number) => {
    if (!confirm('해당 서류를 삭제하시겠습니까?')) return;
    const updatedDocs = (user.documents || []).filter((_, i) => i !== index);
    try {
      await supabase.from('users').update({ documents: updatedDocs }).eq('id', user.id);
      fetchUsers();
    } catch {
      toast.error('삭제 실패');
    }
  };

  const handleApplyTierFees = async (user: UserData) => {
    if (!supabase || currentUser?.role !== 'admin') return toast.error('관리자 권한이 없습니다.');
    const total = totalLessonsFromCounts(user.session_count, user.logCount);
    const tier = computeTier(total);
    const f = getTierDefaultFees(tier, tierFeeMap);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          fee_private: f.fee_private,
          fee_group: f.fee_group,
          fee_center_main: f.fee_center_main,
          fee_center_assist: f.fee_center_assist,
          fee_auto_from_tier: true,
        })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('현재 누적 회차 기준 등급표 수업료가 저장되었습니다.');
      fetchUsers();
      if (editingId === user.id) {
        setEditForm((prev) => ({ ...prev, ...f, fee_auto_from_tier: true }));
      }
    } catch (err: unknown) {
      devLogger.error('[users] apply tier fees', err);
      toast.error('적용 실패: DB에 수업료 컬럼이 있는지(sql/62_users_teacher_tier_fees.sql) 확인하세요.');
    }
  };

  const handleResetFeesToTierSchedule = async (user: UserData) => {
    if (!supabase || currentUser?.role !== 'admin') return toast.error('관리자 권한이 없습니다.');
    try {
      const { error } = await supabase
        .from('users')
        .update({
          fee_private: null,
          fee_group: null,
          fee_center_main: null,
          fee_center_assist: null,
          fee_auto_from_tier: true,
        })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('저장값을 비웠습니다. 화면에는 현재 등급 표가 반영됩니다.');
      fetchUsers();
      if (editingId === user.id) {
        setEditForm((prev) => ({
          ...prev,
          fee_private: null,
          fee_group: null,
          fee_center_main: null,
          fee_center_assist: null,
          fee_auto_from_tier: true,
        }));
      }
    } catch (err: unknown) {
      devLogger.error('[users] reset tier fees', err);
      toast.error('초기화 실패: DB 마이그레이션을 확인하세요.');
    }
  };

  const handleTierDraftValue = (
    tierId: keyof TierFeeMap,
    key: keyof TierFeeMap[keyof TierFeeMap],
    raw: string
  ) => {
    const value = Math.max(0, Number(raw) || 0);
    setTierFeeDraft((prev) => ({
      ...prev,
      [tierId]: {
        ...prev[tierId],
        [key]: value,
      },
    }));
  };

  const handleSaveTierFeeTable = async () => {
    if (!supabase || currentUser?.role !== 'admin') return toast.error('관리자 권한이 없습니다.');
    setTierFeeSaving(true);
    try {
      const rows = TEACHER_TIER_IDS.map((tierId) => ({
        tier_id: tierId,
        fee_private: tierFeeDraft[tierId].fee_private,
        fee_group: tierFeeDraft[tierId].fee_group,
        fee_center_main: tierFeeDraft[tierId].fee_center_main,
        fee_center_assist: tierFeeDraft[tierId].fee_center_assist,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('teacher_tier_fees').upsert(rows, { onConflict: 'tier_id' });
      if (error) throw error;
      setTierFeeMap(cloneTierFeeMap(tierFeeDraft));
      toast.success('등급별 기본 수업료 표가 저장되었습니다.');
    } catch (err: unknown) {
      devLogger.error('[users] save teacher_tier_fees', err);
      toast.error('등급표 저장에 실패했습니다. SQL 65 적용 여부를 확인하세요.');
    } finally {
      setTierFeeSaving(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').includes(searchTerm) || (u.organization || '').includes(searchTerm);
    const matchesTab =
      currentTab === 'live'
        ? u.is_active && !(u.ending_soon ?? false)
        : currentTab === 'ending_soon'
          ? u.is_active && (u.ending_soon ?? false)
          : !u.is_active;
    return matchesSearch && matchesTab;
  });

  const tabCount = (tabId: 'live' | 'ending_soon' | 'done') => {
    if (tabId === 'live') return users.filter(u => u.is_active && !(u.ending_soon ?? false)).length;
    if (tabId === 'ending_soon') return users.filter(u => u.is_active && (u.ending_soon ?? false)).length;
    return users.filter(u => !u.is_active).length;
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F8FAFC] p-4 sm:p-6 md:p-10 pb-[env(safe-area-inset-bottom,0px)] text-slate-800">
      <header className="max-w-6xl mx-auto mb-6 sm:mb-10 w-full min-w-0">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 italic tracking-tighter">SPOKEDU <span className="text-blue-600 not-italic">HRM</span></h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Partner Management System</p>
          </div>
          {mainTab === 'info' && (
            <div className="flex gap-2 sm:gap-3 w-full md:w-auto min-w-0">
              <div className="relative flex-1 md:w-64 group min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="검색..." className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none text-base sm:text-sm font-bold transition-all touch-manipulation" onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              {currentUser?.role === 'admin' && (
                <button onClick={() => setIsAddModalOpen(true)} className="min-h-[44px] flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-blue-600 transition-all cursor-pointer shadow-lg shadow-slate-900/10 touch-manipulation shrink-0">
                  <UserPlus className="w-4 h-4" /> 추가
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {/* 1단: 정보 관리 / 카운팅 관리 */}
          <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-full sm:w-fit border border-slate-200 shadow-inner overflow-x-auto">
            {[
              { id: 'info' as const, label: '정보 관리' },
              { id: 'counting' as const, label: '카운팅 관리' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setMainTab(t.id)}
                className={`flex-1 sm:flex-initial min-w-[7rem] sm:min-w-[8rem] min-h-[44px] flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-xl text-sm font-black transition-all cursor-pointer touch-manipulation ${mainTab === t.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* 2단: 활동중 / 종료 예정 / 종료 (정보 관리 탭일 때만) */}
          {mainTab === 'info' && (
            <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-full sm:w-fit border border-slate-200 shadow-inner overflow-x-auto">
              {([
                { id: 'live' as const, label: '활동중', icon: Activity },
                { id: 'ending_soon' as const, label: '종료 예정', icon: Clock },
                { id: 'done' as const, label: '종료', icon: CheckCircle2 },
              ]).map((tab) => (
                <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`flex-1 sm:flex-initial min-w-[7rem] sm:min-w-[8rem] min-h-[44px] flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 rounded-xl text-sm font-black transition-all cursor-pointer touch-manipulation ${currentTab === tab.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                  <tab.icon className="w-4 h-4 shrink-0" /> {tab.label}
                  <span className="ml-1 text-[10px] opacity-60">{tabCount(tab.id)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {mainTab === 'info' && currentUser?.role === 'admin' && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setTierFeeTableOpen((o) => !o)}
                className="flex items-start gap-2 text-left min-w-0 flex-1 cursor-pointer group"
                aria-expanded={tierFeeTableOpen}
              >
                <ChevronDown
                  size={18}
                  className={`shrink-0 mt-0.5 text-slate-400 transition-transform ${tierFeeTableOpen ? '' : '-rotate-90'}`}
                />
                <div>
                  <h3 className="text-sm font-black text-slate-800 group-hover:text-slate-950">등급별 기본 수업료 표</h3>
                  <p className="text-[11px] font-bold text-slate-500 mt-1">
                    하드코딩이 아니라 DB 기준표입니다. 저장 후 등급표 적용/자동 기본값에 반영됩니다.
                  </p>
                </div>
              </button>
              {tierFeeTableOpen && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTierFeeDraft(cloneTierFeeMap(HARD_CODED_TIER_FEES))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-black text-slate-700 hover:bg-slate-50"
                  >
                    코드 기본값으로 복원
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveTierFeeTable()}
                    disabled={tierFeeSaving}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-black hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {tierFeeSaving ? '저장 중...' : '등급표 저장'}
                  </button>
                </div>
              )}
            </div>
            {tierFeeTableOpen && (
              <div className="overflow-x-auto mt-3">
                <table className="min-w-[760px] w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b">
                      <th className="py-2 pr-2 text-left font-black">등급</th>
                      <th className="py-2 px-2 text-left font-black">개인</th>
                      <th className="py-2 px-2 text-left font-black">그룹</th>
                      <th className="py-2 px-2 text-left font-black">센터 메인</th>
                      <th className="py-2 pl-2 text-left font-black">센터 보조</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TEACHER_TIER_IDS.map((tierId) => (
                      <tr key={tierId} className="border-b last:border-b-0">
                        <td className="py-2 pr-2 text-slate-700 font-black">{tierLabelKo(tierId)}</td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-bold"
                            value={tierFeeDraft[tierId].fee_private}
                            onChange={(e) => handleTierDraftValue(tierId, 'fee_private', e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-bold"
                            value={tierFeeDraft[tierId].fee_group}
                            onChange={(e) => handleTierDraftValue(tierId, 'fee_group', e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-bold"
                            value={tierFeeDraft[tierId].fee_center_main}
                            onChange={(e) => handleTierDraftValue(tierId, 'fee_center_main', e.target.value)}
                          />
                        </td>
                        <td className="py-2 pl-2">
                          <input
                            type="number"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-bold"
                            value={tierFeeDraft[tierId].fee_center_assist}
                            onChange={(e) => handleTierDraftValue(tierId, 'fee_center_assist', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto min-w-0">
        {mainTab === 'counting' ? (
          <CountingTab supabase={supabase} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className={`bg-white rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 border-2 transition-all duration-300 flex flex-col hover:shadow-xl min-w-0 w-full max-w-full overflow-hidden ${
              user.name.trim() === '미정'
                ? user.is_active
                  ? 'border-red-500 shadow-red-500/10 bg-red-50/40'
                  : 'border-red-400 shadow-sm bg-red-50/30'
                : user.is_active
                  ? 'border-blue-500 shadow-blue-500/5'
                  : 'border-transparent shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${user.role === 'teacher' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>{user.role === 'teacher' ? 'Inst' : 'Adm'}</span>
                <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${user.is_active ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`}>{user.is_active ? '활동중' : '종료'}</span>
                {user.is_active && (user.ending_soon ?? false) && (
                  <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-amber-500 text-white">종료 예정</span>
                )}
              </div>
              {currentUser?.role === 'admin' && (
                <div className="flex flex-wrap gap-1">
                  {user.is_active && (
                    <button onClick={() => toggleEndingSoon(user)} title={user.ending_soon ? '종료 예정 해제' : '종료 예정으로 표시'} className={`min-h-[44px] min-w-[44px] p-2 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center touch-manipulation ${(user.ending_soon ?? false) ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-100 text-slate-400 hover:bg-amber-100 hover:text-amber-600'}`}><Clock className="w-3.5 h-3.5" /></button>
                  )}
                  <button onClick={() => toggleActiveStatus(user)} className={`min-h-[44px] min-w-[44px] p-2 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center touch-manipulation ${user.is_active ? 'bg-blue-500 text-white hover:bg-rose-500' : 'bg-slate-100 text-slate-400 hover:bg-blue-500 hover:text-white'}`}><Power className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { if (editingId === user.id) { setEditingId(null); } else { setEditingId(user.id); setEditForm({ ...user }); } }} className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 cursor-pointer flex items-center justify-center touch-manipulation"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleResetPassword(user)} disabled={!!resetPasswordLoadingId} title="비밀번호 재설정" className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer flex items-center justify-center touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed">{resetPasswordLoadingId === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}</button>
                </div>
              )}
            </div>

            {editingId === user.id ? (
              <div className="space-y-3 flex-1">
                <input className="w-full px-2 py-1 text-xl font-black border-b-2 border-blue-500 outline-none" value={editForm.name || ''} onChange={e => setEditForm(prev => ({...prev, name: e.target.value}))} />
                <input className="w-full px-3 py-2 text-xs border rounded-xl" placeholder="학력" value={editForm.organization || ''} onChange={e => setEditForm(prev => ({...prev, organization: e.target.value}))} />
                <input className="w-full px-3 py-2 text-xs border rounded-xl" placeholder="연락처" value={editForm.phone || ''} onChange={e => setEditForm(prev => ({...prev, phone: e.target.value}))} />
                <input className="w-full px-3 py-2 text-xs border rounded-xl" placeholder="출발장소" value={editForm.departure_location || ''} onChange={e => setEditForm(prev => ({...prev, departure_location: e.target.value}))} />
                <textarea className="w-full px-3 py-2 text-xs border rounded-xl h-20" placeholder="수업 스케줄 (쉼표로 구분: 월 15-18, 화 16-19)" value={editForm.schedule || ''} onChange={e => setEditForm(prev => ({...prev, schedule: e.target.value}))} />
                {user.is_active && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.ending_soon ?? false} onChange={e => setEditForm(prev => ({ ...prev, ending_soon: e.target.checked }))} className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
                    <span className="text-xs font-bold text-slate-600">종료 예정으로 표시</span>
                  </label>
                )}
                {currentUser?.role === 'admin' && (() => {
                  const feeOpen = userFeeSectionOpen[user.id] ?? false;
                  return (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setUserFeeSectionOpen((p) => ({ ...p, [user.id]: !(p[user.id] ?? false) }))
                        }
                        className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-100/60 transition-colors cursor-pointer group"
                        aria-expanded={feeOpen}
                      >
                        <ChevronDown
                          size={16}
                          className={`shrink-0 mt-0.5 text-slate-400 transition-transform ${feeOpen ? '' : '-rotate-90'}`}
                        />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider group-hover:text-slate-700">
                          기본 수업료 (원) · 등급표 적용 / 저장값 비우기
                        </span>
                      </button>
                      {feeOpen && (
                        <div className="px-3 pb-3 pt-0 space-y-2 border-t border-slate-100/80">
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-[10px] font-bold text-slate-500">
                              개인
                              <input
                                type="number"
                                className="mt-0.5 w-full px-2 py-1.5 text-xs border rounded-lg bg-white"
                                value={editForm.fee_private ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? null : Number(e.target.value);
                                  setEditForm((prev) => ({ ...prev, fee_private: v, fee_auto_from_tier: false }));
                                }}
                              />
                            </label>
                            <label className="text-[10px] font-bold text-slate-500">
                              그룹
                              <input
                                type="number"
                                className="mt-0.5 w-full px-2 py-1.5 text-xs border rounded-lg bg-white"
                                value={editForm.fee_group ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? null : Number(e.target.value);
                                  setEditForm((prev) => ({ ...prev, fee_group: v, fee_auto_from_tier: false }));
                                }}
                              />
                            </label>
                            <label className="text-[10px] font-bold text-slate-500">
                              센터 메인
                              <input
                                type="number"
                                className="mt-0.5 w-full px-2 py-1.5 text-xs border rounded-lg bg-white"
                                value={editForm.fee_center_main ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? null : Number(e.target.value);
                                  setEditForm((prev) => ({ ...prev, fee_center_main: v, fee_auto_from_tier: false }));
                                }}
                              />
                            </label>
                            <label className="text-[10px] font-bold text-slate-500">
                              센터 보조
                              <input
                                type="number"
                                className="mt-0.5 w-full px-2 py-1.5 text-xs border rounded-lg bg-white"
                                value={editForm.fee_center_assist ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? null : Number(e.target.value);
                                  setEditForm((prev) => ({ ...prev, fee_center_assist: v, fee_auto_from_tier: false }));
                                }}
                              />
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleApplyTierFees(user)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black hover:bg-indigo-700 cursor-pointer"
                            >
                              등급표 적용
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleResetFeesToTierSchedule(user)}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-black hover:bg-slate-100 cursor-pointer"
                            >
                              저장값 비우기 (등급표만 표시)
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                            빈 칸은 현재 누적 회차에 맞는 등급 표를 화면에 반영합니다. 숫자를 직접 바꾸면 자동 등급표 연동은 해제됩니다.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <button onClick={() => handleSaveInfo(user.id)} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black cursor-pointer">저장</button>
              </div>
            ) : (
              <div className="flex-1">
                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{user.name} <span className="text-lg text-slate-400 font-bold">선생님</span></h3>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <TeacherTierBadge sessionCount={user.session_count} logCount={user.logCount} />
                  <span className="text-[10px] font-bold text-slate-400">
                    누적 {totalLessonsFromCounts(user.session_count, user.logCount).toLocaleString()}회
                  </span>
                </div>
                {currentUser?.role === 'admin' && (() => {
                  const tier = computeTier(totalLessonsFromCounts(user.session_count, user.logCount));
                  const eff = effectiveFees(tier, {
                    fee_private: user.fee_private ?? null,
                    fee_group: user.fee_group ?? null,
                    fee_center_main: user.fee_center_main ?? null,
                    fee_center_assist: user.fee_center_assist ?? null,
                  }, tierFeeMap);
                  const feeOpen = userFeeSectionOpen[user.id] ?? false;
                  return (
                    <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setUserFeeSectionOpen((p) => ({ ...p, [user.id]: !(p[user.id] ?? false) }))
                        }
                        className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-100/50 transition-colors cursor-pointer group"
                        aria-expanded={feeOpen}
                      >
                        <ChevronDown
                          size={16}
                          className={`shrink-0 mt-0.5 text-slate-400 transition-transform ${feeOpen ? '' : '-rotate-90'}`}
                        />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider group-hover:text-slate-600">
                          적용 기본 수업료 (원) · 등급표 적용 / 저장값 비우기
                        </span>
                      </button>
                      {feeOpen && (
                        <div className="px-3 pb-3 pt-0 border-t border-slate-100/80">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-bold text-slate-700">
                            <span className="text-slate-400">개인</span>
                            <span>{eff.fee_private.toLocaleString()}</span>
                            <span className="text-slate-400">그룹</span>
                            <span>{eff.fee_group.toLocaleString()}</span>
                            <span className="text-slate-400">센터 메인</span>
                            <span>{eff.fee_center_main.toLocaleString()}</span>
                            <span className="text-slate-400">센터 보조</span>
                            <span>{eff.fee_center_assist.toLocaleString()}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleApplyTierFees(user)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[9px] font-black hover:bg-indigo-700 cursor-pointer"
                            >
                              등급표 적용
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleResetFeesToTierSchedule(user)}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[9px] font-black hover:bg-slate-100 cursor-pointer"
                            >
                              저장값 비우기
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                <div className="space-y-4 mb-6">
                  {/* 학력 */}
                  <div className="flex items-center text-[11px] font-bold text-slate-600 min-w-0">
                    <GraduationCap className="w-4 h-4 mr-3 text-blue-500 shrink-0" />
                    <span className="text-slate-400 w-20 shrink-0">학력</span>
                    <span className="truncate min-w-0 break-words">{user.organization || '-'}</span>
                  </div>

                  {/* 연락처 */}
                  <div className="flex items-center text-[11px] font-bold text-slate-600 min-w-0">
                    <Smartphone className="w-4 h-4 mr-3 text-blue-500 shrink-0" />
                    <span className="text-slate-400 w-20 shrink-0">연락처</span>
                    <span className="min-w-0 break-all">{user.phone || '-'}</span>
                  </div>

                  {/* 출발장소 */}
                  <div className="flex items-center text-[11px] font-bold text-slate-600 min-w-0">
                    <MapPin className="w-4 h-4 mr-3 text-blue-500 shrink-0" />
                    <span className="text-slate-400 w-20 shrink-0">출발장소</span>
                    <span className="min-w-0 break-words">{user.departure_location || '-'}</span>
                  </div>
                  
                  {/* 수업 스케줄 */}
                  <div className="space-y-2">
                    <div className="flex items-center text-[11px] font-bold text-slate-400 mb-1">
                      <Clock className="w-3.5 h-3.5 mr-3 text-blue-500" /> 수업 스케줄
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-7">
                      {(user.schedule || '').split(',').filter(s => s.trim()).length > 0 ? (
                        (user.schedule || '').split(',').map((s, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black border border-blue-100">
                            {s.trim()}
                          </span>
                        ))
                      ) : <span className="text-[10px] text-slate-300 italic">등록된 스케줄 없음</span>}
                    </div>
                  </div>

                  {/* 연기 요청(vacation)은 대시보드의 postpone_notices로 대체 */}
                </div>
              </div>
            )}

            {/* 서류 관리 섹션 */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <FileCheck className="w-3 h-3" /> 서류 등록
                </h4>
              </div>
              <div className="space-y-2 mb-4">
                {(user.documents || []).length > 0 ? (
                  (user.documents || []).map((doc, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 hover:bg-blue-50/50 p-2.5 rounded-xl border border-slate-100 group transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-white p-1.5 rounded-lg shadow-sm"><FileText className="w-3.5 h-3.5 text-blue-500" /></div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-700 truncate max-w-[120px]">{doc.name}</span>
                          <span className="text-[9px] font-bold text-blue-500 uppercase">
                            {doc.name.includes('신분증') ? 'Identity' : doc.name.includes('통장') ? 'Bank' : 'Doc'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <a href={doc.url} target="_blank" className="p-1.5 hover:text-blue-600 text-slate-400"><Download className="w-3.5 h-3.5" /></a>
                        <button onClick={() => deleteDocument(user, i)} className="p-1.5 hover:text-rose-600 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-center py-4 text-slate-300 font-bold border-2 border-dashed border-slate-50 rounded-2xl">No documents</p>
                )}
              </div>
              <label className="flex items-center justify-center w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all">
                {uploadingId === user.id ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <span className="text-[10px] font-black text-slate-400 uppercase">Add Document</span>}
                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, user)} disabled={!!uploadingId} />
              </label>
            </div>
          </div>
        ))}
          </div>
        )}
      </main>

      {createdCredential && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-4">로그인 정보 (한 번만 표시됩니다)</h3>
            <p className="text-sm text-slate-600 mb-2">강사에게 전달한 뒤 비밀번호 변경을 권장하세요.</p>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm">
              <p><span className="font-bold text-slate-500">로그인 이메일:</span> <span className="font-mono font-bold break-all">{createdCredential.email}</span></p>
              <p><span className="font-bold text-slate-500">초기 비밀번호:</span> <span className="font-mono font-bold select-all">{createdCredential.initialPassword}</span></p>
            </div>
            <button onClick={() => setCreatedCredential(null)} className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl font-bold cursor-pointer hover:bg-slate-800">확인</button>
          </div>
        </div>
      )}

      {resetPasswordResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-4">비밀번호 재설정됨 (한 번만 표시됩니다)</h3>
            <p className="text-sm text-slate-600 mb-2">강사에게 전달한 뒤 비밀번호 변경을 권장하세요.</p>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm">
              <p><span className="font-bold text-slate-500">로그인 이메일:</span> <span className="font-mono font-bold break-all">{resetPasswordResult.email}</span></p>
              <p><span className="font-bold text-slate-500">새 비밀번호:</span> <span className="font-mono font-bold select-all">{resetPasswordResult.initialPassword}</span></p>
            </div>
            <button onClick={() => setResetPasswordResult(null)} className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl font-bold cursor-pointer hover:bg-slate-800">확인</button>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">새 파트너 등록</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">이름</label>
                <input className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold" placeholder="필수" value={newPartner.name ?? ''} onChange={e => setNewPartner({...newPartner, name: e.target.value})} /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">로그인용 이메일</label>
                <input type="email" className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold" placeholder="비우면 이름@spokedu.com 으로 생성" value={(newPartner as { email?: string }).email ?? ''} onChange={e => setNewPartner({...newPartner, email: e.target.value})} /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">학교 / 학과</label>
                <input className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold" value={newPartner.organization ?? ''} onChange={e => setNewPartner({...newPartner, organization: e.target.value})} /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">출발장소</label>
                <input className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold" value={newPartner.departure_location ?? ''} onChange={e => setNewPartner({...newPartner, departure_location: e.target.value})} /></div>
              <button onClick={handleAddPartner} disabled={addPartnerLoading} className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black mt-6 shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                {addPartnerLoading ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}