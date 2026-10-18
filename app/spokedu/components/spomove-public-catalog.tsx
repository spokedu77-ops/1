import Image from 'next/image';
import Link from 'next/link';
import { HOME_MEDIA, type HomeMediaKey } from '../data/home-media';
import { spomovePublicCatalogPage } from '../data/spomove-public-catalog-page';
import {
  marketingButtonPrimary,
  marketingCardStatic,
  marketingHeroDisplay,
  marketingInteractiveTransition,
  brandFocusRing,
} from '../lib/ui-classes';

function ActivityCard({
  title,
  description,
  mediaKey,
  fit,
}: {
  title: string;
  description: string;
  mediaKey: HomeMediaKey;
  fit: 'cover' | 'contain';
}) {
  const media = HOME_MEDIA[mediaKey];
  const src = media?.src ?? media?.fallbackSrc;
  return (
    <article className={`${marketingCardStatic} flex h-full flex-col overflow-hidden`}>
      {src ? (
        <div className="relative aspect-[16/10] w-full bg-[#F7F9FD]">
          <Image
            src={src}
            alt={media?.alt ?? title}
            fill
            className={fit === 'contain' ? 'object-contain p-2' : 'object-cover'}
            style={media?.objectPosition ? { objectPosition: media.objectPosition } : undefined}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-2 px-4 py-4 sm:px-5 sm:py-5">
        <h3 className="text-base font-bold text-[#0B1F46]">{title}</h3>
        <p className="text-sm leading-relaxed text-[#536279] [text-wrap:pretty]">{description}</p>
        <p className="mt-auto text-xs font-semibold text-[#245DFF]">활동 예시 · SPOMOVE 수업</p>
      </div>
    </article>
  );
}

export function SpomovePublicCatalog() {
  const page = spomovePublicCatalogPage;

  return (
    <div className="site-container overflow-x-clip pb-16 pt-8 sm:pb-20 sm:pt-10">
      <header className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#245DFF]">{page.kicker}</p>
        <h1 className={`${marketingHeroDisplay} mt-2 text-[#0B1F46] !text-2xl sm:!text-3xl lg:!text-4xl`}>
          {page.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-[1.75] text-[#536279] sm:text-base [text-wrap:pretty]">
          {page.subtitle}
        </p>
      </header>

      <section className="mt-10 sm:mt-12" aria-labelledby="spomove-catalog-levels">
        <h2 id="spomove-catalog-levels" className="text-lg font-bold text-[#0B1F46] sm:text-xl">
          프로그램 분류
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#536279] [text-wrap:pretty]">{page.levelsIntro}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {page.levels.map((level) => (
            <article key={level.id} className={`${marketingCardStatic} px-4 py-5 sm:px-5 sm:py-6`}>
              <h3 className="text-base font-bold text-[#0B1F46]">{level.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#536279] [text-wrap:pretty]">{level.body}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {level.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-[#DCE3EE] bg-[#F7F9FD] px-2.5 py-0.5 text-[11px] font-semibold text-[#536279]"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 sm:mt-12" aria-labelledby="spomove-catalog-flow">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#245DFF]">{page.flowEyebrow}</p>
        <h2 id="spomove-catalog-flow" className="mt-1 text-lg font-bold text-[#0B1F46] sm:text-xl">
          SEE · DECIDE · MOVE
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {page.flowSteps.map((step) => (
            <li key={step.label} className={`${marketingCardStatic} px-4 py-4 sm:px-5`}>
              <p className="text-xs font-bold uppercase tracking-wide text-[#245DFF]">{step.label}</p>
              <p className="mt-1 text-sm font-semibold text-[#0B1F46]">{step.axis}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#536279]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 sm:mt-12" aria-labelledby="spomove-catalog-activities">
        <h2 id="spomove-catalog-activities" className="text-lg font-bold text-[#0B1F46] sm:text-xl">
          {page.activitySectionTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#536279] [text-wrap:pretty]">{page.activityIntro}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {page.activityCards.map((item) => (
            <ActivityCard
              key={item.title}
              title={item.title}
              description={item.description}
              mediaKey={item.mediaKey}
              fit={item.fit}
            />
          ))}
        </div>
      </section>

      <section className="mt-12 sm:mt-14" aria-labelledby="spomove-catalog-next">
        <h2 id="spomove-catalog-next" className="sr-only">
          다음 행동
        </h2>
        <div className={`${marketingCardStatic} flex flex-col gap-4 px-5 py-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-7`}>
          <Link href={page.ctas.primary.href} className={`${marketingButtonPrimary} sm:!w-auto`}>
            {page.ctas.primary.label}
          </Link>
          <Link
            href={page.ctas.secondary.href}
            className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[#DCE3EE] bg-white px-5 text-sm font-semibold text-[#0B1F46] ${marketingInteractiveTransition} ${brandFocusRing} hover:border-[#245DFF]/40`}
          >
            {page.ctas.secondary.label}
          </Link>
          <Link
            href={page.ctas.lab.href}
            className="text-sm font-semibold text-[#245DFF] underline-offset-4 hover:underline"
          >
            {page.ctas.lab.label}
          </Link>
        </div>
      </section>
    </div>
  );
}
