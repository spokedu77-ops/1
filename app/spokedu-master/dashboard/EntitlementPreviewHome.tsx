'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  MonitorPlay,
  Timer,
} from 'lucide-react';
import { MASTER_PRODUCT_CATALOG } from '../lib/productCatalog';
import {
  getEntitlementPaymentHref,
  getEntitlementPrimaryCtaLabel,
  type MasterAccessSnapshot,
} from '../lib/masterAccessModel';

const LITE_FEATURES = [
  '오늘 수업을 찾고 현장에서 운영',
  '라이브러리 · 수업반 · 일정',
  '출석 기록과 다음 수업 이어가기',
] as const;

const PREMIUM_FEATURES = [
  '지난 수업이 다음 준비로 이어짐',
  '메모 · 학생 이력 · 안내문 작성·복사',
  'SPOMOVE 큰 화면 실행',
  'SPOMAT 회원가 (연결 시)',
] as const;

const LIBRARY_PREVIEW_CATEGORIES = [
  { label: '민첩·반응', desc: '거리 판단, 반응 전환, SPOMOVE 연계' },
  { label: '협동·팀빌딩', desc: '소통, 역할 분담, 팀 신뢰 활동' },
  { label: '유연·균형', desc: '코어 조절, 정적 균형, 체형 인식' },
  { label: '표현·리듬', desc: '리듬 감각, 신체 표현, 창의 동작' },
] as const;

export function EntitlementPreviewHome({ snapshot }: { snapshot: MasterAccessSnapshot }) {
  const paymentHref = getEntitlementPaymentHref(snapshot);
  const primaryLabel = getEntitlementPrimaryCtaLabel(snapshot);
  const isLapsed =
    snapshot.subscriptionStatus === 'expired' || snapshot.subscriptionStatus === 'cancelled';

  return (
    <main className="mx-auto flex h-full w-full max-w-[920px] flex-col gap-6 overflow-y-auto px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
      <header className="rounded-[22px] border p-6" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)' }}>
        <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-acc)' }}>
          SPOKEDU MASTER
        </p>
        <h1 className="mt-2 text-[28px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
          {isLapsed ? '이용 기간이 종료되었습니다' : '이용권이 필요합니다'}
        </h1>
        <p className="mt-3 max-w-[560px] text-[14px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
          {isLapsed
            ? '수업 라이브러리, 기록, 안내문을 다시 쓰려면 구독을 선택해 주세요. 기존 계정과 프로필은 그대로 유지됩니다.'
            : '수업 도구는 로그인 후 바로 써 볼 수 있습니다. 라이브러리·기록·안내문·SPOMOVE는 이용권에서 이어집니다.'}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={paymentHref}
            className="spm-btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-[13px] font-black focus-visible:outline-none"
          >
            <ArrowRight size={16} />
            {primaryLabel}
          </Link>
          <Link
            href="/spokedu-master/landing#pricing"
            className="inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[13px] font-black"
            style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
          >
            플랜 비교 보기
          </Link>
        </div>
      </header>

      <section>
        <h2 className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>
          이런 수업을 찾을 수 있어요
        </h2>
        <p className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
          대표 수업 유형입니다. 이용권 시작 후 전체 라이브러리를 탐색할 수 있습니다.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {LIBRARY_PREVIEW_CATEGORIES.map(({ label, desc }) => (
            <div
              key={label}
              className="rounded-[14px] border p-3.5"
              style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s2)' }}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>
                {label}
              </p>
              <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[18px] border p-5" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>Lite</p>
          <p className="mt-1 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
            {MASTER_PRODUCT_CATALOG.lite.priceLabel}
          </p>
          <ul className="mt-4 space-y-2">
            {LITE_FEATURES.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" color="var(--spm-grn)" />
                {item}
              </li>
            ))}
          </ul>
        </article>
        <article
          className="rounded-[18px] border p-5"
          style={{ background: 'var(--spm-acc-a08)', borderColor: 'var(--spm-acc-a28)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-acc)' }}>프리미엄</p>
          <p className="mt-1 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
            {MASTER_PRODUCT_CATALOG.premium.priceLabel}
          </p>
          <ul className="mt-4 space-y-2">
            {PREMIUM_FEATURES.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" color="var(--spm-acc)" />
                {item}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-[18px] border p-5" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)' }}>
        <h2 className="text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>이용권으로 이어지는 수업 루프</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { icon: BookOpen, label: '수업 전', desc: '라이브러리에서 오늘 수업 고르기' },
            { icon: Timer, label: '수업 중', desc: '수업 도구는 무료로, SPOMOVE는 프리미엄에서' },
            { icon: ClipboardList, label: '수업 후', desc: '관찰 남기고 같은 기록 보강하기' },
            { icon: FileText, label: '안내문', desc: '학부모·기관용 안내문 작성·복사' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 rounded-[14px] p-3" style={{ background: 'var(--spm-s3)' }}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'var(--spm-acc-a12)' }}>
                <Icon size={18} color="var(--spm-acc)" />
              </span>
              <span>
                <strong className="block text-[13px]" style={{ color: 'var(--spm-t)' }}>{label}</strong>
                <span className="mt-1 block text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>{desc}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
          <MonitorPlay size={14} color="var(--spm-acc)" />
          SPOMOVE 큰 화면 실행은 프리미엄 이용권에서 이용할 수 있습니다.
        </p>
      </section>
    </main>
  );
}
