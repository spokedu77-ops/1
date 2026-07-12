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
import { PROGRAMS } from '../lib/data';
import {
  getEntitlementPaymentHref,
  getEntitlementPrimaryCtaLabel,
  type MasterAccessSnapshot,
} from '../lib/masterAccessModel';

const PREVIEW_PROGRAMS = PROGRAMS.slice(0, 3);

const LITE_FEATURES = [
  '라이브러리 전체 탐색',
  '수업 도구 (타이머·팀 나누기 등)',
  '수업 기록·학생 명단',
  '안내문 작성·복사',
] as const;

const PREMIUM_FEATURES = [
  '라이트 전체',
  'SPOMOVE 큰 화면 실행',
  'Pro 수업 상세 자료',
  'SPOMAT 회원가 (연결 시)',
] as const;

function PreviewProgramCard({ title, category }: { title: string; category: string }) {
  return (
    <article
      className="rounded-[16px] border border-slate-200 bg-white p-4"
      style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s2)' }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>
        {category}
      </p>
      <h3 className="mt-2 text-[15px] font-black leading-snug" style={{ color: 'var(--spm-t)' }}>
        {title}
      </h3>
      <p className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
        이용권 시작 후 전체 자료·영상·기록 흐름을 열 수 있습니다.
      </p>
    </article>
  );
}

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
            ? '수업 자료, 기록, 안내문을 다시 쓰려면 이용권을 선택해 주세요. 기존 계정과 프로필은 그대로 유지됩니다.'
            : '라이브러리에서 수업을 고르고, 수업 중 도구로 진행하고, 기록과 안내문까지 이어지는 흐름은 활성 이용권에서 이용할 수 있습니다.'}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={paymentHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-[14px] font-black text-white"
            style={{ background: 'var(--spm-acc)' }}
          >
            <ArrowRight size={16} />
            {primaryLabel}
          </Link>
          <Link
            href="/spokedu-master/landing#pricing"
            className="inline-flex min-h-12 items-center justify-center rounded-[14px] px-5 text-[13px] font-black"
            style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
          >
            플랜 비교 보기
          </Link>
        </div>
      </header>

      <section>
        <h2 className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>
          수업 자료 미리보기
        </h2>
        <p className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
          결제 후 라이브러리에서 바로 열 수 있는 수업 유형입니다.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PREVIEW_PROGRAMS.map((program) => (
            <PreviewProgramCard key={program.id} title={program.title} category={program.category} />
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
          style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.28)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-acc)' }}>Premium</p>
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
            { icon: Timer, label: '수업 중', desc: '수업 도구·SPOMOVE(프리미엄)로 진행' },
            { icon: ClipboardList, label: '수업 후', desc: '출석·메모 기록 남기기' },
            { icon: FileText, label: '설명', desc: '학부모·기관용 안내문 작성·복사' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 rounded-[14px] p-3" style={{ background: 'var(--spm-s3)' }}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.12)' }}>
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
