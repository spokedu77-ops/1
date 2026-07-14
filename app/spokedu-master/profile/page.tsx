'use client';

import Link from 'next/link';
import {
  CreditCard,
  FileText,
  HelpCircle,
  LogOut,
  Mail,
  Package,
  Pencil,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { clearLoginSessionMarkers } from '@/app/lib/auth/sessionPersistence';
import { BottomSheet } from '../components/ui/BottomSheet';
import { useExplanationData } from '../explanations/ExplanationDataProvider';
import {
  MASTER_BUSINESS_INFO,
  MASTER_CUSTOMER_SERVICE_HREF,
} from '../lib/productCatalog';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useMasterStore, useProfile } from '../store';
import { useSpomatShopAvailable } from '../access/MasterAccessProvider';
import {
  MASTER_DATA_DELETE_CONFIRMATION,
  canSubmitMasterDataDeletion,
  type MasterDataDeletionStatus,
} from './masterDataDeletion';
import {
  getSubscriptionDisplaySummary,
  normalizeSubscriptionSummary,
  type SubscriptionDisplaySummary,
  type SubscriptionSummaryData,
} from './subscriptionSummary';
import { useRouter } from 'next/navigation';

type MenuRowProps = {
  icon: LucideIcon;
  label: string;
  caption: string;
  href?: string;
  onClick?: () => void;
};

function MenuRow({ icon: Icon, label, caption, href, onClick }: MenuRowProps) {
  const content = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s3)' }}>
        <Icon size={18} color="var(--spm-t2)" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>{label}</strong>
        <span className="mt-1 block text-[11px] font-semibold leading-4" style={{ color: 'var(--spm-t3)' }}>{caption}</span>
      </span>
    </>
  );

  const className = 'flex w-full items-center gap-3 rounded-[14px] p-3';
  const style = { background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' };

  if (href) {
    return <Link href={href} className={className} style={style}>{content}</Link>;
  }

  return <button type="button" onClick={onClick} className={className} style={style}>{content}</button>;
}

function SubscriptionSummaryCard({
  display,
  loadStatus,
  onRetry,
}: {
  display: SubscriptionDisplaySummary;
  loadStatus: 'loading' | 'ready' | 'error';
  onRetry: () => void;
}) {
  const isEmpty = display.state === 'none' || display.state === 'ended';

  return (
    <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>현재 이용권</p>
          <h2 className="mt-1 text-[24px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
            {loadStatus === 'loading' ? '확인 중' : display.planLabel}
          </h2>
        </div>
        <span className="rounded-full px-3 py-1 text-[11px] font-black" style={{ background: isEmpty ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.14)', color: isEmpty ? 'var(--spm-yel)' : 'var(--spm-grn)' }}>
          {loadStatus === 'loading' ? '확인 중' : display.statusLabel}
        </span>
      </div>

      {loadStatus === 'error' ? (
        <div className="mt-4 rounded-[14px] p-3" style={{ background: 'var(--spm-s3)' }}>
          <p className="text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
            이용권 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-[12px] px-4 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            다시 시도
          </button>
        </div>
      ) : (
        <>
          <p className="mt-3 text-[13px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>{display.description}</p>
          {display.dateLabel && display.dateText ? (
            <p className="mt-2 text-[13px] font-bold" style={{ color: 'var(--spm-t2)' }}>
              {display.dateLabel} <strong style={{ color: 'var(--spm-t)' }}>{display.dateText}</strong>
            </p>
          ) : null}
          {display.primaryHref && display.primaryLabel ? (
            <Link
              href={display.primaryHref}
              className="mt-4 flex min-h-11 items-center justify-center rounded-[12px] px-4 text-[13px] font-black text-white"
              style={{ background: 'var(--spm-acc)' }}
            >
              {display.primaryLabel}
            </Link>
          ) : null}
        </>
      )}
    </section>
  );
}

function ProfileSheet({
  open,
  onClose,
  name,
  school,
  setName,
  setSchool,
  onSave,
  saving,
  saveError,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  school: string;
  setName: (value: string) => void;
  setSchool: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  saveError: string | null;
}) {
  return (
    <BottomSheet open={open} title="프로필 편집" onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>이름</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none"
            style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>소속</span>
          <input
            value={school}
            onChange={(event) => setSchool(event.target.value)}
            placeholder="센터명, 학교명, 팀명"
            className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none"
            style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
          />
        </label>
        {saveError ? (
          <p className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--spm-red)' }}>
            {saveError}
          </p>
        ) : null}
        <button type="button" onClick={onSave} disabled={saving} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white disabled:opacity-50" style={{ background: 'var(--spm-acc)' }}>
          {saving ? '저장 중...' : '저장'}
        </button>
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
  const canDeleteMasterData = canSubmitMasterDataDeletion(deleteConfirmation, deleteStatus);

  const loadSubscriptionSummary = useCallback(async () => {
    setSubscriptionSummaryStatus('loading');
    try {
      const response = await fetch('/api/spokedu-master/subscription', { cache: 'no-store' });
      if (!response.ok) throw new Error('subscription summary failed');
      const json = await response.json();
      setSubscriptionSummary(normalizeSubscriptionSummary(json));
      setSubscriptionSummaryStatus('ready');
    } catch {
      setSubscriptionSummary(null);
      setSubscriptionSummaryStatus('error');
    }
  }, []);

  useEffect(() => {
    void loadSubscriptionSummary();
  }, [loadSubscriptionSummary]);

  const saveProfile = () => {
    if (profileSaving) return;
    const payload = {
      name: name.trim() || '선생님',
      school: school.trim(),
      role: profile?.role ?? 'teacher',
      ageGroups: profile?.ageGroups ?? [],
      programTypes: profile?.programTypes ?? [],
      onboardingDone: profile?.onboardingDone ?? false,
    };
    setProfileSaving(true);
    setProfileSaveError(null);
    void fetch('/api/spokedu-master/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.ok) {
          const json = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(json.error ?? 'profile save failed');
        }
        setProfile({ name: payload.name, school: payload.school });
        setProfileOpen(false);
      })
      .catch(() => {
        setProfileSaveError('프로필을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        setProfileSaving(false);
      });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = getSupabaseBrowserClient();
    try {
      await supabase.auth.signOut();
    } finally {
      clearLoginSessionMarkers();
      resetProfile();
      router.replace('/spokedu-master/landing');
    }
  };

  const handleDeleteMasterData = async () => {
    if (!canDeleteMasterData) return;

    setDeleteStatus('submitting');
    setDeleteError('');

    try {
      const response = await fetch('/api/spokedu-master/operational-data', {
        body: JSON.stringify({ confirmation: MASTER_DATA_DELETE_CONFIRMATION }),
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        method: 'DELETE',
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? 'MASTER data deletion failed');
      }

      clearCurrentOwnerLocalData();
      await Promise.all([
        operationalData.reload(),
        explanationData.reload(),
      ]);
      setDeleteConfirmation('');
      setDeleteStatus('success');
    } catch {
      setDeleteStatus('error');
      setDeleteError('MASTER 데이터를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-7" style={{ background: 'var(--spm-bg)' }}>
      <main className="mx-auto grid w-full max-w-[1040px] gap-5 px-5 py-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5">
          <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid h-[68px] w-[68px] place-items-center rounded-full text-[25px] font-black text-white" style={{ background: profile?.avatarColor ?? '#312e81', fontFamily: 'var(--spm-font-display)' }}>
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>계정 정보</p>
                <h1 className="mt-1 truncate text-[26px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
                  {profile?.name ?? '선생님'}
                </h1>
                <p className="mt-1 truncate text-[13px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{profile?.email || '이메일 정보 없음'}</p>
                {profile?.school ? (
                  <p className="mt-1 truncate text-[13px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{profile.school}</p>
                ) : null}
              </div>
              <button type="button" onClick={() => setProfileOpen(true)} className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] px-4 text-[14px] font-black" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
                <Pencil size={15} />
                편집
              </button>
            </div>
          </section>

          <SubscriptionSummaryCard
            display={display}
            loadStatus={subscriptionSummaryStatus}
            onRetry={() => void loadSubscriptionSummary()}
          />

          <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(239,68,68,0.12)' }}>
                <ShieldAlert size={18} color="var(--spm-red)" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>MASTER 데이터 삭제</h2>
                <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
                  학생 정보, 수업 기록, 저장한 안내문과 현재 기기의 MASTER 작업 데이터를 삭제합니다. 로그인 계정, 이용권, 결제 이력은 유지됩니다.
                </p>
                <label className="mt-4 block">
                  <span className="mb-2 block text-[11px] font-black" style={{ color: 'var(--spm-t3)' }}>
                    아래 문구를 입력해 주세요: {MASTER_DATA_DELETE_CONFIRMATION}
                  </span>
                  <input
                    value={deleteConfirmation}
                    onChange={(event) => {
                      setDeleteConfirmation(event.target.value);
                      if (deleteStatus === 'success') setDeleteStatus('idle');
                      if (deleteError) setDeleteError('');
                    }}
                    className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none"
                    style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleDeleteMasterData()}
                  disabled={!canDeleteMasterData}
                  className="mt-3 h-11 w-full rounded-[12px] text-[13px] font-black disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.35)', color: 'var(--spm-red)' }}
                >
                  {deleteStatus === 'submitting' ? '삭제 중...' : 'MASTER 데이터 삭제'}
                </button>
                {deleteStatus === 'success' ? (
                  <p className="mt-2 text-[12px] font-bold" style={{ color: 'var(--spm-grn)' }}>MASTER 운영 데이터를 삭제했습니다.</p>
                ) : null}
                {deleteError ? (
                  <p className="mt-2 text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>{deleteError}</p>
                ) : null}
              </div>
            </div>
          </section>
        </section>

        <aside className="space-y-3">
          <MenuRow icon={CreditCard} label="구독 관리" caption="현재 이용권과 해지 상태 확인" href="/spokedu-master/subscription" />
          {spomatShopAvailable ? (
            <MenuRow icon={Package} label="SPOMAT 스토어" caption="SPOMAT 구매 화면으로 이동" href="/spokedu-master/shop" />
          ) : null}
          <MenuRow icon={HelpCircle} label="고객센터" caption={MASTER_BUSINESS_INFO.customerServiceEmail} href={MASTER_CUSTOMER_SERVICE_HREF} />
          <MenuRow icon={FileText} label="이용약관" caption="SPOKEDU MASTER 이용 기준" href="/spokedu-master/terms" />
          <MenuRow icon={Mail} label="개인정보처리방침" caption="개인정보 처리 기준" href="/spokedu-master/privacy" />
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] px-4 text-[13px] font-black disabled:opacity-50"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t3)' }}
          >
            <LogOut size={15} />
            {loggingOut ? '로그아웃 중...' : '로그아웃'}
          </button>
        </aside>
      </main>

      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        name={name}
        school={school}
        setName={setName}
        setSchool={setSchool}
        onSave={saveProfile}
        saving={profileSaving}
        saveError={profileSaveError}
      />
    </div>
  );
}

export default function SpokeduMasterProfilePage() {
  return (
    <Suspense fallback={<div className="h-full" style={{ background: 'var(--spm-bg)' }} />}>
      <SpokeduMasterProfileContent />
    </Suspense>
  );
}
