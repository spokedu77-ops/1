import Link from 'next/link';
import { ImagePlaceholder } from './image-placeholder';
import type {
  ContactType,
  PhilosophyCardItem,
  ProgramAssetItem,
  ProofItem,
  TrackItem,
} from '../data/content';

type HeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeader({ eyebrow, title, description }: HeaderProps) {
  return (
    <div className="mx-auto w-full max-w-3xl text-center">
      {eyebrow ? <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">{eyebrow}</p> : null}
      <h2 className="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">{title}</h2>
      {description ? <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{description}</p> : null}
    </div>
  );
}

type SiteHeroProps = {
  title: string;
  description: string;
  keywords: string[];
  highlights: { title: string; description: string }[];
  heroVisual?: { slot: string; title: string; caption: string; alt: string; src?: string };
  ctas: { label: string; href: string }[];
};

export function SiteHero({ title, description, keywords, highlights, heroVisual, ctas }: SiteHeroProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-lime-50 p-6 sm:p-10">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <span key={keyword} className="rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                {keyword}
              </span>
            ))}
          </div>
          <h1 className="max-w-3xl whitespace-pre-line text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">{title}</h1>
          <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base">{description}</p>
          <div className="flex flex-wrap gap-3">
            {ctas.map((cta) => (
              <Link
                key={cta.href}
                href={cta.href}
                className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
              >
                {cta.label}
              </Link>
            ))}
          </div>
        </div>
        <aside className="grid gap-3">
          {heroVisual ? (
            <ImagePlaceholder
              slot={heroVisual.slot}
              alt={heroVisual.alt}
              src={heroVisual.src}
              title={heroVisual.title}
              caption={heroVisual.caption}
              className="h-48"
            />
          ) : null}
          {highlights.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </aside>
      </div>
    </section>
  );
}

export function TrackCard({ title, subtitle, description, href, cta }: TrackItem) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">{title}</p>
      <h3 className="mt-2 text-xl font-semibold text-slate-900">{subtitle}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      <Link href={href} className="mt-4 inline-flex text-sm font-semibold text-slate-900 hover:text-indigo-700">
        {cta} →
      </Link>
    </article>
  );
}

export function PhilosophyCard({ code, title, description }: PhilosophyCardItem) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{code}</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </article>
  );
}

export function ProgramAssetCard({ title, description, linksTo, effects, href, imageSlot, imageAlt, imageSrc }: ProgramAssetItem) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <ImagePlaceholder
        slot={imageSlot}
        alt={imageAlt}
        src={imageSrc}
        title={`${title} 대표 이미지`}
        caption="프로그램 대표 사진으로 교체하세요."
        className="mb-4 h-40"
      />
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      <p className="mt-4 text-xs font-medium text-slate-500">연결 축: {linksTo.join(' / ')}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">핵심 효과: {effects.join(', ')}</p>
      <Link href={href} className="mt-4 inline-flex text-sm font-semibold text-slate-900 hover:text-indigo-700">
        자세히 보기 →
      </Link>
    </article>
  );
}

export function ProofCard({ title, description, imageSlot, imageAlt, imageSrc }: ProofItem) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-3 pb-0">
        <ImagePlaceholder
          slot={imageSlot}
          alt={imageAlt}
          src={imageSrc}
          title={`${title} 이미지`}
          caption="실제 현장 사진으로 교체하세요."
          className="h-28"
        />
      </div>
      <div className="p-5">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </article>
  );
}

export function ProcessSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {steps.map((step, index) => (
        <li key={step} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <span className="mr-2 font-semibold text-indigo-600">{String(index + 1).padStart(2, '0')}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}

export function FAQList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {item}
        </li>
      ))}
    </ul>
  );
}

type SplitCTAProps = {
  title: string;
  description: string;
  buttons: { label: string; href: string }[];
};

export function SplitCTA({ title, description, buttons }: SplitCTAProps) {
  return (
    <section className="rounded-3xl bg-slate-900 px-6 py-8 text-slate-100 sm:px-10 sm:py-10">
      <h2 className="whitespace-pre-line text-2xl font-semibold leading-tight sm:text-3xl">{title}</h2>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {buttons.map((button) => (
          <Link
            key={button.href}
            href={button.href}
            className="rounded-full border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-indigo-400 hover:bg-slate-700"
          >
            {button.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ContactTypeCard({ title, description, requiredFields, cta, href }: ContactType) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {requiredFields.map((field) => (
          <li key={field}>- {field}</li>
        ))}
      </ul>
      <Link href={href} className="mt-5 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900">
        {cta}
      </Link>
    </article>
  );
}
