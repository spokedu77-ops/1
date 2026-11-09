'use client';

import styles from './Users.module.css';
import { WonInput } from '@/app/components/admin/WonInput';

import { isZeroFeeStaff } from '@/app/lib/staffTeacherFees';

import { toast } from 'sonner';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MileageDetailModal from '@/app/components/admin/MileageDetailModal';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getSessionWithRefreshRecovery } from '@/app/lib/supabase/auth';
import {
  Smartphone, Loader2, Edit3, X, FileText, Download,
  Power, GraduationCap, Clock, FileCheck, MapPin, KeyRound, ChevronDown
} from 'lucide-react';
import { devLogger } from '@/app/lib/logging/devLogger';
import { fetchTeacherLogCounts } from './fetchTeacherLogCounts';
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
  role: 'admin' | 'teacher' | 'spomove';
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

type UserManagementProps = { teacherId?: string; onChanged?: () => void; mode?: 'teacher' | 'fees' };

export default function UserManagement({ teacherId, onChanged, mode = 'teacher' }: UserManagementProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get('teacherView');
  const mainTab = requestedView === 'counting' ? 'counting' : 'info';
  const setMainTab = (tab: 'info' | 'counting') => {
    const query = new URLSearchParams(searchParams.toString());
    query.set('workspace', 'teachers');
    query.set('teacherView', tab);
    router.replace(`/admin/classes/calendar?${query}`, { scroll: false });
  };

  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [users, setUsers] = useState<UserData[]>([]);
  const [, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserData>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const createRequested = searchParams.get('createTeacher') === '1' && mode === 'teacher';
  useEffect(() => { if (createRequested) setIsAddModalOpen(true); }, [createRequested]);
  const closeAddModal = () => {
    setIsAddModalOpen(false);
    if (createRequested) {
      const query = new URLSearchParams(searchParams.toString()); query.delete('createTeacher');
      router.replace(`/admin/classes/calendar?${query}`, { scroll: false });
    }
  };
  const [newPartner, setNewPartner] = useState<Partial<UserData>>({ role: 'teacher', is_active: true });
  const [addPartnerLoading, setAddPartnerLoading] = useState(false);
  const [createdCredential, setCreatedCredential] = useState<{ email: string; initialPassword: string } | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ email: string; initialPassword: string } | null>(null);
  const [resetPasswordLoadingId, setResetPasswordLoadingId] = useState<string | null>(null);
  const [tierFeeMap, setTierFeeMap] = useState<TierFeeMap>(() => cloneTierFeeMap(HARD_CODED_TIER_FEES));
  const [tierFeeDraft, setTierFeeDraft] = useState<TierFeeMap>(() => cloneTierFeeMap(HARD_CODED_TIER_FEES));
  const [tierFeeSaving, setTierFeeSaving] = useState(false);
  const [tierFeeTableOpen, setTierFeeTableOpen] = useState(mode === 'fees');
  /** 강사 카드별 「적용/기본 수업료」 블록 펼침 (기본 접힘) */
  const [userFeeSectionOpen, setUserFeeSectionOpen] = useState<Record<string, boolean>>({});
  const tierFeeFallbackNotifiedRef = useRef(false);
  const assertUserMutation = (
    data: { id: string } | null,
    error: { message: string } | null
  ) => {
    if (error) throw error;
    if (!data) throw new Error('변경이 반영되지 않았습니다. 권한 또는 RLS 정책을 확인해 주세요.');
  };

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
        ...(isZeroFeeStaff(u) ? { fee_private: 0, fee_group: 0, fee_center_main: 0, fee_center_assist: 0 } : {}),
        is_active: u.is_active ?? true,
        ending_soon: u.ending_soon ?? false,
        documents: u.documents || [],
      }));
      const teacherIds = base.map((u) => u.id);
      const logCountByTeacher = await fetchTeacherLogCounts(supabase, teacherIds);
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
      const session = await getSessionWithRefreshRecovery(supabase);
      if (session?.user) {
        const { data: me } = await supabase.from('users').select('id, name, role').eq('id', session.user.id).single();
        if (me) setCurrentUser(me as UserData);
      }
    } catch (err: unknown) {
      devLogger.error('[users] fetchUsers catch error:', err);
    } finally {
      setIsLoading(false);
      onChanged?.();
    }
  }, [supabase, onChanged]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSaveInfo = async (userId: string) => {
    if (!supabase || currentUser?.role !== 'admin') return toast.error('관리자 권한이 없습니다.');
    try {
      const { data, error } = await supabase
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
        .eq('id', userId)
        .select('id')
        .maybeSingle();

      assertUserMutation(data, error);

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
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: nextStatus })
        .eq('id', user.id)
        .select('id')
        .maybeSingle();
      assertUserMutation(data, error);
    } catch (err) {
      devLogger.error('[users] toggle active status', err);
      toast.error(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
      fetchUsers();
    }
  };

  const toggleEndingSoon = async (user: UserData) => {
    if (!supabase || currentUser?.role !== 'admin') return toast.error('권한이 없습니다.');
    if (!user.is_active) return; // 종료된 강사는 종료 예정 플래그 무의미
    const next = !(user.ending_soon ?? false);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ending_soon: next } : u));
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ ending_soon: next })
        .eq('id', user.id)
        .select('id')
        .maybeSingle();
      assertUserMutation(data, error);
    } catch (err) {
      devLogger.error('[users] toggle ending soon', err);
      toast.error(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
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
      closeAddModal();
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

      const { data, error } = await supabase
        .from('users')
        .update({ documents: updatedDocs })
        .eq('id', user.id)
        .select('id')
        .maybeSingle();
      assertUserMutation(data, error);
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
      const { data, error } = await supabase
        .from('users')
        .update({ documents: updatedDocs })
        .eq('id', user.id)
        .select('id')
        .maybeSingle();
      assertUserMutation(data, error);
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
      const { data, error } = await supabase
        .from('users')
        .update({
          fee_private: f.fee_private,
          fee_group: f.fee_group,
          fee_center_main: f.fee_center_main,
          fee_center_assist: f.fee_center_assist,
          fee_auto_from_tier: true,
        })
        .eq('id', user.id)
        .select('id')
        .maybeSingle();
      assertUserMutation(data, error);
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
      const { data, error } = await supabase
        .from('users')
        .update({
          fee_private: null,
          fee_group: null,
          fee_center_main: null,
          fee_center_assist: null,
          fee_auto_from_tier: true,
        })
        .eq('id', user.id)
        .select('id')
        .maybeSingle();
      assertUserMutation(data, error);
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

  const [tierFeeDuration, setTierFeeDuration] = useState<60 | 90>(60);

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
        fee_private_90: tierFeeDraft[tierId].fee_private_90,
        fee_group_90: tierFeeDraft[tierId].fee_group_90,
        fee_center_main_90: tierFeeDraft[tierId].fee_center_main_90,
        fee_center_assist_90: tierFeeDraft[tierId].fee_center_assist_90,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('teacher_tier_fees').upsert(rows, { onConflict: 'tier_id' });
      if (error) throw error;
      setTierFeeMap(cloneTierFeeMap(tierFeeDraft));
      onChanged?.();
      toast.success('등급별 기본 수업료 표가 저장되었습니다.');
    } catch (err: unknown) {
      devLogger.error('[users] save teacher_tier_fees', err);
      toast.error('등급표 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setTierFeeSaving(false);
    }
  };

  const filteredUsers = users.filter(user => user.id === teacherId);
  const selectedUser = filteredUsers[0];


  return (
    <div className="min-w-0 text-slate-800">
      <header hidden={mode !== 'fees'} className="mb-3 min-w-0">
        {currentUser?.role === 'admin' && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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
                  <p className="mt-1 break-keep text-[11px] font-bold leading-relaxed text-slate-500">
                    강사 등급별 기본 수업료를 확인하고 수정합니다.
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
              <div className="mt-3">
                <div className="mb-2 flex gap-2" aria-label="수업료 기준 시간">
                  {([60, 90] as const).map(minutes => <button key={minutes} type="button" aria-pressed={tierFeeDuration === minutes} onClick={() => setTierFeeDuration(minutes)} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${tierFeeDuration === minutes ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{minutes}분</button>)}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[660px] w-full text-xs">
                    <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-2">등급</th>{['개인', '그룹', '센터 메인', '센터 보조'].map(label => <th key={label} className="p-2">{tierFeeDuration}분 {label}</th>)}</tr></thead>
                    <tbody>{TEACHER_TIER_IDS.map(tierId => <tr key={tierId} className="border-b last:border-0">
                      <th className="py-2 pr-2 text-left text-slate-700">{tierLabelKo(tierId)}</th>
                      {(['fee_private', 'fee_group', 'fee_center_main', 'fee_center_assist'] as const).map(baseKey => {
                        const key = (tierFeeDuration === 90 ? `${baseKey}_90` : baseKey) as keyof TierFeeMap[typeof tierId];
                        return <td key={key} className="p-2"><WonInput aria-label={`${tierLabelKo(tierId)} ${tierFeeDuration}분 ${baseKey}`} className="min-h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium" value={tierFeeDraft[tierId][key]} onValueChange={value => handleTierDraftValue(tierId, key, String(value ?? 0))} /></td>;
                      })}
                    </tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      <div hidden={mode !== 'teacher'}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="강사 상세 항목" className="flex flex-wrap gap-1">
          {([{ key: 'info', label: '기본 정보' }, { key: 'counting', label: '인정 회차·마일리지' }] as const).map(tab => <button key={tab.key} type="button" aria-pressed={mainTab === tab.key} onClick={() => setMainTab(tab.key)} className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${mainTab === tab.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{tab.label}</button>)}
        </div>
      </div>
      {!selectedUser && <p className="py-12 text-center text-sm text-slate-500">목록에서 강사를 선택해 주세요.</p>}
      <main className="min-w-0">
        {mode === 'teacher' && searchParams.get('workspace') === 'teachers' && mainTab === 'counting' && selectedUser && <MileageDetailModal key={selectedUser.id} teacher={{ ...selectedUser, points: selectedUser.points ?? 0, session_count: selectedUser.session_count ?? 0 }} supabase={supabase} hideAppliedFeePreview onClose={() => setMainTab('info')} onSaved={() => void fetchUsers()} />}
          <div className="min-w-0">
        {filteredUsers.map((user) => {
          const feeOpen = userFeeSectionOpen[user.id] ?? false;
          return (
          <div
            key={user.id}
            className={styles.teacherDetail}
          >
            <div><div className={styles.cardHeader}>
              <div className={styles.heading}>
                <h3>{user.name} <span>선생님</span></h3>
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.is_active ? '활동 중' : '종료'}</span>
                {user.is_active && user.ending_soon && <span className="text-xs font-medium text-amber-700">종료 예정</span>}
              </div>
              {currentUser?.role === 'admin' && <details className={styles.management} onKeyDown={event => {
                if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); }
              }} onClick={event => { if ((event.target as HTMLElement).closest('button')) event.currentTarget.open = false; }}>
                <summary className={styles.managementToggle}>관리<ChevronDown size={14} aria-hidden="true" /></summary>
                <div className={styles.managementList}>
                  <button type="button" onClick={() => { if (editingId === user.id) { setEditingId(null); } else { setEditingId(user.id); setEditForm({ ...user }); } }}><Edit3 size={15} />{editingId === user.id ? '수정 닫기' : '정보 수정'}</button>
                  {user.is_active && <button type="button" onClick={() => toggleEndingSoon(user)}><Clock size={15} />{user.ending_soon ? '종료 예정 해제' : '종료 예정으로 표시'}</button>}
                  <button type="button" onClick={() => toggleActiveStatus(user)}><Power size={15} />{user.is_active ? '활동 종료' : '활동 재개'}</button>
                  <button type="button" onClick={() => handleResetPassword(user)} disabled={!!resetPasswordLoadingId}>{resetPasswordLoadingId === user.id ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}비밀번호 재설정</button>
                </div>
              </details>}
            </div>

            </div>
            <div>
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
                {currentUser?.role === 'admin' && (
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
                          60분 기본 수업료 · 등급표 적용 / 저장값 비우기
                        </span>
                      </button>
                      {feeOpen && (
                        <div className="px-3 pb-3 pt-0 space-y-2 border-t border-slate-100/80">
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-[10px] font-bold text-slate-500">
                              개인
                              <WonInput
                                className="mt-0.5 min-h-9 w-full px-2 py-1.5 text-sm border rounded-lg bg-white"
                                value={editForm.fee_private}
                                onValueChange={(value) => setEditForm((prev) => ({ ...prev, fee_private: value, fee_auto_from_tier: false }))}
                              />
                            </label>
                            <label className="text-[10px] font-bold text-slate-500">
                              그룹
                              <WonInput
                                className="mt-0.5 min-h-9 w-full px-2 py-1.5 text-sm border rounded-lg bg-white"
                                value={editForm.fee_group}
                                onValueChange={(value) => setEditForm((prev) => ({ ...prev, fee_group: value, fee_auto_from_tier: false }))}
                              />
                            </label>
                            <label className="text-[10px] font-bold text-slate-500">
                              센터 메인
                              <WonInput
                                className="mt-0.5 min-h-9 w-full px-2 py-1.5 text-sm border rounded-lg bg-white"
                                value={editForm.fee_center_main}
                                onValueChange={(value) => setEditForm((prev) => ({ ...prev, fee_center_main: value, fee_auto_from_tier: false }))}
                              />
                            </label>
                            <label className="text-[10px] font-bold text-slate-500">
                              센터 보조
                              <WonInput
                                className="mt-0.5 min-h-9 w-full px-2 py-1.5 text-sm border rounded-lg bg-white"
                                value={editForm.fee_center_assist}
                                onValueChange={(value) => setEditForm((prev) => ({ ...prev, fee_center_assist: value, fee_auto_from_tier: false }))}
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
                )}
                <button onClick={() => handleSaveInfo(user.id)} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black cursor-pointer">저장</button>
              </div>
            ) : (
              <div className="min-w-0">
                <div className={styles.identity}>
                  <p><TeacherTierBadge sessionCount={user.session_count} logCount={user.logCount} /><span>누적 {totalLessonsFromCounts(user.session_count, user.logCount).toLocaleString('ko-KR')}회</span></p>
                </div>
                <dl className={styles.information}>
                  <div><dt>학력</dt><dd>{user.organization || '-'}</dd></div>
                  <div><dt>연락처</dt><dd>{user.phone || '-'}</dd></div>
                  <div><dt>출발장소</dt><dd>{user.departure_location || '-'}</dd></div>
                </dl>
                <div className={styles.schedule}>
                  <h4>수업 스케줄</h4>
                  {(user.schedule || '').split(',').filter(item => item.trim()).length ? <div className={styles.scheduleItems}>{(user.schedule || '').split(',').filter(item => item.trim()).map((item, index) => <span key={index}>{item.trim()}</span>)}</div> : <p className="text-slate-500">등록된 스케줄 없음</p>}
                </div>
              </div>
            )}

            </div>
            {/* 서류 관리 섹션 */}
            <div className={styles.documents}>
              <details>
                <summary className={styles.documentsSummary}><FileCheck size={14} aria-hidden="true" /><span>서류 {(user.documents || []).length}개</span><ChevronDown size={14} className={styles.documentsChevron} aria-hidden="true" /></summary>
                <ul className={styles.documentList}>
                  {(user.documents || []).map((doc, i) => <li key={i} className={styles.documentRow}>
                    <FileText size={14} className="shrink-0 text-blue-500" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700" title={doc.name}>{doc.name}</span>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" aria-label={`${doc.name} 열기`} className={styles.documentAction}><Download size={14} /></a>
                    <button type="button" onClick={() => deleteDocument(user, i)} aria-label={`${doc.name} 삭제`} className={`${styles.documentAction} hover:text-rose-600`}><X size={14} /></button>
                  </li>)}
                  {!(user.documents || []).length && <li className="py-2 text-xs text-slate-400">등록된 서류가 없습니다.</li>}
                </ul>
              </details>
              <label className={styles.documentUpload}>
                {uploadingId === user.id ? <Loader2 size={14} className="animate-spin" /> : <span>+ 서류 추가</span>}
                <input aria-label={`${user.name} 서류 추가`} type="file" className="sr-only" onChange={(e) => handleFileUpload(e, user)} disabled={!!uploadingId} />
              </label>
            </div>
          </div>
        );})}
          </div>
      </main>
      </div>

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
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">강사 추가</h2>
              <button onClick={() => closeAddModal()} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-6 h-6" /></button>
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
