import Link from 'next/link';
import { HeroCtaStack } from '../components/hero-cta-stack';
import { RecordPhoto } from '../components/record-photo';
import { NAVER_BLOG_URL } from '../data/external-channels';
import { monthlyRecords } from '../data/monthly';
import { buildSpokeduPageMetadata, seoMetaMonthly } from '../data/seo';
import { cardInteractive, landingH1, landingHeroShell, landingPageStack, linkMuted } from '../lib/ui-classes';

export const metadata = buildSpokeduPageMetadata({
  ...seoMetaMonthly,
  canonical: '/spokedu/monthly',
  keywords: ['월간 스포키듀', '기관 체육수업', '체육 커리큘럼', 'SPOMOVE'],
});

export default function SpokeduMonthlyPage() {
  const featured = monthlyRecords[0];

  return (
    <div className={landingPageStack}>
      <section className={`${landingHeroShell} border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-lime-50`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Monthly SPOKEDU</p>
        <h1 className={`mt-2 sm:mt-3 ${landingH1} text-slate-950`}>월간 스포키듀</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
          단순 소식이 아니라, 수업 운영과 커리큘럼 개발의 원천이 되는 월간 기록입니다.
        </p>
        {featured ? (
          <div className="mt-4">
            <HeroCtaStack
              primary={{ href: `/spokedu/monthly/${featured.slug}`, label: '이번 달 기록 보기', track: 'cta-records-monthly' }}
              secondary={[{ href: '/spokedu/cases', label: '수업 사례', track: 'cta-records-cases' }]}
            />
          </div>
        ) : null}
      </section>

      {featured ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative hidden h-40 sm:block sm:h-48">
            <RecordPhoto
              src={featured.images[0]?.src}
              alt={featured.images[0]?.alt ?? featured.title}
              category="monthly"
              fill
              sizes="100vw"
            />
          </div>
          <div className="p-4 sm:p-6">
            <p className="text-xs font-semibold text-indigo-600">이번 달 하이라이트</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">{featured.title}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <h3 className="text-xs font-semibold uppercase text-slate-500">함께한 기관</h3>
                <p className="mt-1 text-sm text-slate-800">{featured.institutions.join(' · ')}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <h3 className="text-xs font-semibold uppercase text-slate-500">운영 프로그램</h3>
                <p className="mt-1 text-sm text-slate-800">{featured.programs.join(' · ')}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <h3 className="text-xs font-semibold uppercase text-slate-500">아이들이 경험한 움직임</h3>
                <ul className="mt-1 space-y-0.5 text-sm text-slate-800">
                  {featured.movementPoints.slice(0, 3).map((point) => (
                    <li key={point}>· {point}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <h3 className="text-xs font-semibold uppercase text-slate-500">교육 포인트</h3>
                <ul className="mt-1 space-y-0.5 text-sm text-slate-800">
                  {featured.educationPoints.slice(0, 2).map((point) => (
                    <li key={point}>· {point}</li>
                  ))}
                </ul>
              </div>
            </div>
            <Link href={`/spokedu/monthly/${featured.slug}`} data-track="cta-records-monthly" className={`mt-4 inline-flex text-sm ${linkMuted}`}>
              상세 기록 보기 →
            </Link>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">월간 아카이브</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {monthlyRecords.map((record) => (
            <li key={record.slug}>
              <article className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${cardInteractive}`}>
                <div className="relative h-28 sm:h-32">
                  <RecordPhoto
                    src={record.images[0]?.src}
                    alt={record.images[0]?.alt ?? record.title}
                    category="monthly"
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
                <div className="p-3.5 sm:p-4">
                  <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{record.title}</h3>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">{record.institutions.join(' · ')}</p>
                  <Link
                    href={`/spokedu/monthly/${record.slug}`}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white active:scale-[0.98] sm:mt-4"
                  >
                    상세 보기
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">더 깊은 후기</h2>
        <p className="mt-1 text-sm text-slate-600">네이버 블로그에서 수업 후기와 운영 이야기를 이어갑니다.</p>
        <a href={NAVER_BLOG_URL} target="_blank" rel="noreferrer" data-track="external-naver-blog" className={`mt-3 inline-flex text-sm ${linkMuted}`}>
          네이버 블로그 →
        </a>
      </section>
    </div>
  );
}
