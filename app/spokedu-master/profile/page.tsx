'use client';

import Link from 'next/link';
import { ChevronRight, LogOut, Pencil, ShieldAlert } from 'lucide-react';
import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { clearLoginSessionMarkers } from '@/app/lib/auth/sessionPersistence';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { useSpomatShopAvailable } from '../access/MasterAccessProvider';
import { BottomSheet } from '../components/ui/BottomSheet';
import { useExplanationData } from '../explanations/ExplanationDataProvider';
import { MASTER_CUSTOMER_SERVICE_HREF } from '../lib/productCatalog';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useMasterStore, useProfile } from '../store';
import { MASTER_DATA_DELETE_CONFIRMATION, canSubmitMasterDataDeletion, type MasterDataDeletionStatus } from './masterDataDeletion';
import { getSubscriptionDisplaySummary, normalizeSubscriptionSummary, type SubscriptionDisplaySummary, type SubscriptionSummaryData } from './subscriptionSummary';

type SettingsRowProps = {
  label: string;
  caption?: string;
  href?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  danger?: boolean;
};

function SettingsRow({ label, caption, href, onClick, trailing, danger = false }: SettingsRowProps) {
  const className = 'flex min-h-14 w-full items-center gap-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2';
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <strong className={`block text-[15px] font-semibold ${danger ? 'text-red-600' : 'text-slate-800'}`}>{label}</strong>
        {caption ? <span className="mt-0.5 block text-[13px] font-normal leading-5 text-slate-500">{caption}</span> : null}
      </span>
      {trailing ?? <ChevronRight size={18} className="shrink-0 text-slate-400" aria-hidden />}
    </>
  );

  if (href?.startsWith('mailto:')) return <a href={href} className={className}>{content}</a>;
  if (href) return <Link href={href} className={className}>{content}</Link>;
  return <button type="button" onClick={onClick} className={className}>{content}</button>;
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[18px] font-semibold text-slate-900">{title}</h2>
      <div className="divide-y divide-slate-200 border-y border-slate-200">{children}</div>
    </section>
  );
}

function SubscriptionSummaryCard({ display, loadStatus, onRetry }: { display: SubscriptionDisplaySummary; loadStatus: 'loading' | 'ready' | 'error'; onRetry: () => void }) {
  if (loadStatus === 'error') {
    return (
      <div className="border-y border-slate-200 py-4">
        <p className="text-[14px] leading-6 text-slate-600">이용권 정보를 불러오지 못했습니다.</p>
        <button type="button" onClick={onRetry} className="mt-2 min-h-11 text-[14px] font-semibold text-[var(--spm-acc)]">다시 시도</button>
      </div>
    );
  }

  return (
    <div className="border-y border-slate-200 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <strong className="text-[17px] font-semibold text-slate-900">{loadStatus === 'loading' ? '확인 중' : display.planLabel}</strong>
            <span className="text-[13px] font-medium text-slate-500">{loadStatus === 'loading' ? '이용권 확인 중' : display.statusLabel}</span>
          </div>
          {display.dateLabel && display.dateText ? <p className="mt-1 text-[13px] text-slate-500">{display.dateLabel} {display.dateText}</p> : null}
          {display.warningText ? <p className="mt-2 text-[13px] leading-5 text-amber-700">{display.warningText}</p> : null}
        </div>
        {display.primaryHref ? (
          <Link href={display.primaryHref} className="flex min-h-11 shrink-0 items-center gap-1 text-[14px] font-semibold text-[var(--spm-acc)]">
            이용권 관리 <ChevronRight size={17} aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function ProfileSheet({ open, onClose, name, school, setName, setSchool, onSave, saving, saveError }: { open: boolean; onClose: () => void; name: string; school: string; setName: (value: string) => void; setSchool: (value: string) => void; onSave: () => void; saving: boolean; saveError: string | null }) {
  return (
    <BottomSheet open={open} title="계정 정보 편집" onClose={onClose}>
      <div className="space-y-4">
        <label className="block"><span className="mb-2 block text-[13px] font-medium text-slate-600">이름</span><input value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)]" /></label>
        <label className="block"><span className="mb-2 block text-[13px] font-medium text-slate-600">소속</span><input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="센터명, 학교명, 팀명" className="h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)]" /></label>
        {saveError ? <p className="text-[13px] text-red-600">{saveError}</p> : null}
        <button type="button" onClick={onSave} disabled={saving} className="spm-btn-primary h-11 w-full rounded-[10px] text-[14px] font-semibold disabled:opacity-50">{saving ? '저장 중...' : '저장'}</button>
      </div>
    </BottomSheet>
  );
}

function DeleteDataSheet({ open, onClose, confirmation, setConfirmation, status, error, onDelete }: { open: boolean; onClose: () => void; confirmation: string; setConfirmation: (value: string) => void; status: MasterDataDeletionStatus; error: string; onDelete: () => void }) {
  const canDelete = canSubmitMasterDataDeletion(confirmation, status);
  return (
    <BottomSheet open={open} title="MASTER 데이터 삭제" onClose={onClose} initialFocusSelector="input">
      <div>
        <div className="flex gap-3 rounded-[12px] bg-red-50 p-4"><ShieldAlert className="mt-0.5 shrink-0 text-red-600" size={19} /><p className="text-[14px] leading-6 text-slate-700">학생, 수업·출석 및 학생별 기록, 안내문, 즐겨찾기와 현재 기기의 MASTER 작업 데이터가 삭제됩니다. 로그인 계정, 이용권과 결제 기록은 삭제되지 않습니다.</p></div>
        <p className="mt-5 text-[14px] leading-6 text-slate-600">이 작업은 되돌릴 수 없습니다. 계속하려면 아래 문구를 정확히 입력해 주세요.</p>
        <label className="mt-4 block"><span className="mb-2 block text-[13px] font-semibold text-slate-700">{MASTER_DATA_DELETE_CONFIRMATION}</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-11 w-full rounded-[10px] border border-slate-300 px-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-red-500" /></label>
        {status === 'success' ? <p className="mt-3 text-[13px] font-medium text-emerald-700">MASTER 운영 데이터를 삭제했습니다.</p> : null}
        {error ? <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p> : null}
        <button type="button" onClick={onDelete} disabled={!canDelete} className="mt-5 h-11 w-full rounded-[10px] border border-red-300 bg-red-50 text-[14px] font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50">{status === 'submitting' ? '삭제 중...' : 'MASTER 데이터 삭제'}</button>
      </div>
    </BottomSheet>
  );
}

function SpokeduMasterProfileContent() {
  const profile = useProfile();
  const spomatShopAvailable = useSpomatShopAvailable();
  const setProfile = useMasterStore((state) => state.setProfile);
  const resetProfile = useMasterStore((state) => state.resetProfile);
  const clearCurrentOwnerLocalData = useMasterStore((state) => state.clearCurrentOwnerLocalData);
  const router = useRouter();
  const operationalData = useOperationalData();
  const explanationData = useExplanationData();
  const [profileOpen, setProfileOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(profile?.name ?? '선생님');
  const [school, setSchool] = useState(profile?.school ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<MasterDataDeletionStatus>('idle');
  const [deleteError, setDeleteError] = useState('');
  const [subscriptionSummary, setSubscriptionSummary] = useState<SubscriptionSummaryData | null>(null);
  const [subscriptionSummaryStatus, setSubscriptionSummaryStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const display = getSubscriptionDisplaySummary(subscriptionSummary);
  const initial = (profile?.name ?? '선생님').slice(0, 1);

  const loadSubscriptionSummary = useCallback(async () => {
    setSubscriptionSummaryStatus('loading');
    try { const response = await fetch('/api/spokedu-master/subscription', { cache: 'no-store' }); if (!response.ok) throw new Error(); setSubscriptionSummary(normalizeSubscriptionSummary(await response.json())); setSubscriptionSummaryStatus('ready'); }
    catch { setSubscriptionSummary(null); setSubscriptionSummaryStatus('error'); }
  }, []);
  useEffect(() => { void loadSubscriptionSummary(); }, [loadSubscriptionSummary]);

  const saveProfile = () => {
    if (profileSaving) return;
    const payload = { name: name.trim() || '선생님', school: school.trim(), role: profile?.role ?? 'teacher', ageGroups: profile?.ageGroups ?? [], programTypes: profile?.programTypes ?? [], onboardingDone: profile?.onboardingDone ?? false };
    setProfileSaving(true); setProfileSaveError(null);
    void fetch('/api/spokedu-master/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      .then(async (response) => { if (!response.ok) throw new Error(); setProfile({ name: payload.name, school: payload.school }); setProfileOpen(false); })
      .catch(() => setProfileSaveError('계정 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setProfileSaving(false));
  };
  const handleLogout = async () => { setLoggingOut(true); try { await getSupabaseBrowserClient().auth.signOut({ scope: 'local' }); } finally { clearLoginSessionMarkers(); resetProfile(); router.replace('/spokedu-master/landing'); } };
  const handleDeleteMasterData = async () => {
    if (!canSubmitMasterDataDeletion(deleteConfirmation, deleteStatus)) return;
    setDeleteStatus('submitting'); setDeleteError('');
    try {
      const response = await fetch('/api/spokedu-master/operational-data', { body: JSON.stringify({ confirmation: MASTER_DATA_DELETE_CONFIRMATION }), cache: 'no-store', headers: { 'content-type': 'application/json' }, method: 'DELETE' });
      if (!response.ok) throw new Error();
      clearCurrentOwnerLocalData(); await Promise.all([operationalData.reload(), explanationData.reload()]); setDeleteConfirmation(''); setDeleteStatus('success');
    } catch { setDeleteStatus('error'); setDeleteError('MASTER 데이터를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
      <main className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-8 sm:py-12">
        <header><p className="text-[13px] font-medium text-slate-500">계정과 설정</p><h1 className="mt-1 text-[30px] font-semibold leading-tight text-slate-950">프로필</h1></header>
        <div className="mt-10 space-y-10">
          <SettingsSection title="내 정보">
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-slate-200 text-[17px] font-semibold text-slate-700">{initial}</div>
                <dl className="min-w-0 flex-1 space-y-1 text-[14px]">
                  <div className="flex gap-3"><dt className="w-12 shrink-0 text-slate-500">이름</dt><dd className="min-w-0 truncate font-medium text-slate-800" title={profile?.name ?? '선생님'}>{profile?.name ?? '선생님'}</dd></div>
                  <div className="flex gap-3"><dt className="w-12 shrink-0 text-slate-500">이메일</dt><dd className="min-w-0 truncate text-slate-700" title={profile?.email || '이메일 정보 없음'}>{profile?.email || '이메일 정보 없음'}</dd></div>
                  <div className="flex gap-3"><dt className="w-12 shrink-0 text-slate-500">소속</dt><dd className="min-w-0 truncate text-slate-700" title={profile?.school || '미입력'}>{profile?.school || '미입력'}</dd></div>
                </dl>
              </div>
              <button type="button" onClick={() => setProfileOpen(true)} className="flex min-h-11 w-fit shrink-0 items-center gap-1.5 rounded-[10px] border border-slate-300 px-3 text-[14px] font-semibold text-slate-700"><Pencil size={15} />편집</button>
            </div>
          </SettingsSection>
          <section><h2 className="mb-2 text-[18px] font-semibold text-slate-900">이용권</h2><SubscriptionSummaryCard display={display} loadStatus={subscriptionSummaryStatus} onRetry={() => void loadSubscriptionSummary()} /></section>
          <SettingsSection title="서비스">{spomatShopAvailable ? <SettingsRow label="SPOMAT 스토어" caption="회원가와 구매 상품 확인" href="/spokedu-master/shop" /> : null}<SettingsRow label="고객센터" caption="문의 및 이용 도움" href={MASTER_CUSTOMER_SERVICE_HREF} /></SettingsSection>
          <SettingsSection title="정보 및 정책"><SettingsRow label="이용약관" href="/spokedu-master/terms?from=profile" /><SettingsRow label="개인정보처리방침" href="/spokedu-master/privacy?from=profile" /></SettingsSection>
          <SettingsSection title="계정"><SettingsRow label={loggingOut ? '로그아웃 중...' : '로그아웃'} onClick={() => void handleLogout()} trailing={<LogOut size={17} className="text-slate-400" />} /></SettingsSection>
          <SettingsSection title="데이터 관리"><SettingsRow label="MASTER 데이터 삭제" caption="수업 운영 데이터를 영구 삭제합니다" onClick={() => setDeleteOpen(true)} danger /></SettingsSection>
        </div>
      </main>
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} name={name} school={school} setName={setName} setSchool={setSchool} onSave={saveProfile} saving={profileSaving} saveError={profileSaveError} />
      <DeleteDataSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} confirmation={deleteConfirmation} setConfirmation={(value) => { setDeleteConfirmation(value); if (deleteStatus === 'success') setDeleteStatus('idle'); if (deleteError) setDeleteError(''); }} status={deleteStatus} error={deleteError} onDelete={() => void handleDeleteMasterData()} />
    </div>
  );
}

export default function SpokeduMasterProfilePage() {
  return <Suspense fallback={<div className="h-full bg-[var(--spm-bg)]" />}><SpokeduMasterProfileContent /></Suspense>;
}
