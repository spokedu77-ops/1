import Link from 'next/link';
import { HeroCtaStack } from '../components/hero-cta-stack';
import { RecordPhoto } from '../components/record-photo';
import { cases } from '../data/cases';
import { getProgramBySlug } from '../data/programs';
import { buildSpokeduPageMetadata, seoMetaCases } from '../data/seo';
import { cardInteractive, landingH1, landingHeroShell, landingPageStack, linkMuted } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

export const metadata = buildSpokeduPageMetadata({
  ...seoMetaCases,
  canonical: '/spokedu/cases',
  keywords: ['수업 사례', '키움센터 체육 프로그램', 'SPOMOVE', '기관 체육수업'],
});

export default function SpokeduCasesPage() {
  return (
    <div className={landingPageStack}>
      <section className={`${landingHeroShell} border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-lime-50`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Case Archive</p>
        <h1 className={`mt-2 sm:mt-3 ${landingH1} text-slate-950`}>실제 운영 사례</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
          기관·행사·프로그램별로 어떻게 수업을 설계·실행했는지, 카드로 빠르게 비교합니다.
        </p>
        <div className="mt-4">
          <HeroCtaStack
            primary={{ href: '/spokedu/contact?type=dispatch', label: '기관 제안 문의', track: 'cta-dispatch' }}
            secondary={[{ href: '/spokedu/records', label: '현장기록 허브', track: 'cta-records' }]}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">대표 사례</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((item) => {
            const related = getProgramBySlug(item.relatedProgram);
            const inquiryHref = related?.inquiryHref ?? '/spokedu/contact?type=dispatch';
            return (
              <li key={item.slug}>
                <article className={`flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white ${cardInteractive}`}>
                  <div className="relative h-32 sm:h-36">
                    <RecordPhoto
                      src={item.images[0]?.src}
                      alt={item.images[0]?.alt ?? `${item.title} 현장`}
                      category="cases"
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                    <p className="text-xs font-medium text-slate-500">{item.institution}</p>
                    <h3 className="mt-0.5 text-sm font-semibold text-slate-900 sm:text-base">{item.title}</h3>
                    <dl className="mt-2 space-y-1 text-[11px] text-slate-600 sm:text-xs">
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-medium text-slate-500">대상</dt>
                        <dd>{item.target}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-medium text-slate-500">프로그램</dt>
                        <dd>{item.program}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-medium text-slate-500">움직임</dt>
                        <dd className="line-clamp-1">{item.movementGoals[0]}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2 pt-3">
                      <Link
                        href={item.href}
                        data-track={inferTrackFromHref(item.href)}
                        className={`text-sm ${linkMuted}`}
                      >
                        상세 보기 →
                      </Link>
                      <Link
                        href={inquiryHref}
                        data-track={inferTrackFromHref(inquiryHref)}
                        className="text-sm font-semibold text-indigo-700"
                      >
                        문의
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
