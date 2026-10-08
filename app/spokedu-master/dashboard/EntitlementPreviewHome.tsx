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
import { spokeduLabIntroductionHref } from '@/app/spokedu/data/public-routes';
import {
  getEntitlementPaymentHref,
  getEntitlementPrimaryCtaLabel,
  type MasterAccessSnapshot,
} from '../lib/masterAccessModel';
import { MasterValueEvidencePanel } from '../components/value/MasterValueEvidencePanel';

const LITE_FEATURES = [
  'Library · 수업반 · 학생 · 일정 · 출석',
  '수업 메모 · 학생 관찰 · 다음 수업 기록',
  '지난 기록 활용 · 안내문 작성·복사',
] as const;

const PREMIUM_FEATURES = [
  'Lite의 모든 기능',
  'SPOMOVE 디지털 움직임 콘텐츠',
  'SPOMOVE 큰 화면 실행',
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
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: 'var(--spm-acc)' }}>
          SPOKEDU LAB
        </p>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
          {isLapsed ? '이용 기간이 종료되었습니다' : 'Lite로 수업 운영을 이어갈 수 있습니다'}
        </h1>
        <p className="mt-3 max-w-[560px] text-[14px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
          {isLapsed
            ? '놀이체육 둘러보기, 이번 주 첫 무료 수업 1개, 스탑워치·타이머·점수판은 계속 사용할 수 있습니다. 수업반·출석·기록 데이터는 유지되며, 다시 열려면 Lite를 선택해 주세요.'
            : '스탑워치·타이머·점수판과 놀이체육 둘러보기는 Free에서도 사용할 수 있습니다. 일반 수업관리와 기록은 Lite, SPOMOVE는 Premium에서 이용합니다.'}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={paymentHref}
            className="spm-btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-[13px] font-extrabold focus-visible:outline-none"
          >
            <ArrowRight size={16} />
            {primaryLabel}
          </Link>
          <Link
            href={spokeduLabIntroductionHref('plans')}
            className="inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[13px] font-extrabold"
            style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
          >
            플랜 비교 보기
          </Link>
        </div>
      </header>

      {isLapsed ? <MasterValueEvidencePanel plan={snapshot.plan} preservedContext surface="preserved" /> : null}

      <section>
        <h2 className="text-[18px] font-extrabold" style={{ color: 'var(--spm-t)' }}>
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
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>
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
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>Lite</p>
          <p className="mt-1 text-[22px] font-extrabold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
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
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: 'var(--spm-acc)' }}>프리미엄</p>
          <p className="mt-1 text-[22px] font-extrabold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
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
        <h2 className="text-[16px] font-extrabold" style={{ color: 'var(--spm-t)' }}>이용권으로 이어지는 수업 루프</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { icon: BookOpen, label: '수업 전', desc: '라이브러리에서 오늘 수업 고르기' },
            { icon: Timer, label: '수업 중', desc: '기본 도구 3종은 Free, 명단 도구는 Lite, SPOMOVE는 Premium' },
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
