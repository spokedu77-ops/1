import Image from 'next/image';
import Link from 'next/link';
import { listPublicRecordCards } from '@/app/lib/server/fieldRecords';
import type { RecordCard } from '@/app/lib/field-records/cards';
import { InlineConsultForm } from '../../contact/inline-consult-form';
import { spomoveIntroduction as copy, spomoveProgramPage, SPOMOVE_LANDING_CASE_SLUGS } from '../../data/spomove-program-page';
import { SPOKEDU_PATHS as paths, spokeduLabIntroductionHref } from '../../data/public-routes';
import { ConsultationLink } from '../components/ConsultationLink';
import { SpomatProductPhoto } from '../components/SpomoveVisual';
import { CaseCard } from '../components/shared';
import '../styles/spomove-introduction.css';

function Heading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="spmi-heading"><p className="spmi-eyebrow">{eyebrow}</p><h2>{title}</h2>{body && <p>{body}</p>}</div>;
}

export function SpomoveContent({ stories = [] }: { stories?: RecordCard[] }) {
  return <main id="main-content" className="website-page web-stitch web-spomove spmi">
    <section id="spomove-hero" className="spmi-hero"><div className="spmi-container spmi-split">
      <div><p className="spmi-badge">{copy.hero.badge}</p><h1>{copy.hero.lines.map(line => <span key={line}>{line}</span>)}</h1><p className="spmi-lead">{copy.hero.body}</p><p className="spmi-method">{copy.hero.method}</p>
        <div className="spmi-actions"><ConsultationLink className="spmi-button" href="/contact?type=spomove" data-track="spomove-hero-inquiry">{copy.hero.primary}</ConsultationLink><Link className="spmi-button spmi-secondary" href={paths.spomoveCatalog} data-track="spomove-hero-catalog">{copy.hero.secondary}</Link></div>
      </div>
      <figure className="spmi-hero-photo"><Image unoptimized src={copy.hero.photo.src} alt={copy.hero.photo.alt} width={1280} height={960} loading="eager" fetchPriority="high" /><figcaption>{copy.hero.caption}</figcaption></figure>
    </div></section>

    <section id="how-it-works" className="spmi-section"><div className="spmi-container">
      <Heading {...copy.flow} /><ol className="spmi-flow">{spomoveProgramPage.flow.steps.map((step, i) => <li key={step.label}><span className="spmi-step">{step.label}</span><h3>{copy.flow.titles[i]}</h3><p>{copy.flow.descriptions[i]}</p></li>)}</ol>
      <div className="spmi-flow-evidence"><Image unoptimized src={copy.flow.photo.src} alt={copy.flow.photo.alt} width={1280} height={960} loading="lazy" /><div><p>{copy.flow.note}</p><p className="spmi-note">{copy.relation}</p></div></div>
    </div></section>

    <section id="task-examples" className="spmi-section spmi-dark"><div className="spmi-container">
      <Heading {...copy.examples} /><div className="spmi-examples">{copy.examples.items.map(item => <article className={`spmi-example spmi-example-${item.kind}`} key={item.title}>
        <figure><Image unoptimized src={item.photo.src} alt={item.photo.alt} width={1600} height={item.kind === 'screen' ? 908 : 2133} loading="lazy" /><figcaption>{item.kind === 'screen' ? '실제 프로그램 화면' : '실제 현장 수업'}</figcaption></figure>
        <div><h3>{item.title}</h3><p>{item.body}</p></div>
      </article>)}</div><Link className="spmi-button" href={paths.spomoveCatalog} data-track="spomove-examples-catalog">{copy.examples.cta}</Link>
    </div></section>

    <section id="levels" className="spmi-section"><div className="spmi-container"><Heading {...copy.levels} />
      <div className="spmi-levels">{spomoveProgramPage.content.levels.map(level => <article key={level.id}><h3>{level.title}</h3><p>{level.body}</p><ul>{level.tags.map(tag => <li key={tag}>{tag}</li>)}</ul></article>)}</div>
      <p className="spmi-note">{copy.levels.distinction}</p><h3>{copy.levels.conditionTitle}</h3><ul className="spmi-conditions">{copy.levels.conditions.map(condition => <li key={condition}>{condition}</li>)}</ul><p className="spmi-note">{copy.levels.note}</p>
    </div></section>

    <section id="spomat" className="spmi-section spmi-tint"><div className="spmi-container spmi-split"><SpomatProductPhoto /><div>
      <Heading eyebrow="SPOMAT" title={copy.mat.title} body={copy.mat.body} /><ul className="spmi-features">{copy.mat.features.map(text => <li key={text}>{text}</li>)}</ul><p className="spmi-note">{copy.mat.note}</p><Link className="spmi-button" href={paths.spomat} data-track="spomove-spomat-detail">{copy.mat.cta}</Link>
    </div></div></section>

    <section id="applications" className="spmi-section"><div className="spmi-container"><Heading {...copy.applications} /><div className="spmi-applications">
      {copy.applications.items.map(item => <article key={item.title}><Image unoptimized src={item.photo.src} alt={item.photo.alt} width={900} height={675} loading="lazy" /><div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}
    </div><p className="spmi-note">{copy.applications.note}</p><Link className="spmi-text-link" href={paths.education}>{copy.applications.cta} →</Link></div></section>

    <section id="field-case" className="spmi-section spmi-tint"><div className="spmi-container"><Heading {...copy.cases} />
      <div className="spmi-cases">{stories.length ? stories.map(record => <CaseCard record={record} key={record.slug} />) : <p>{copy.cases.empty}</p>}</div><Link className="spmi-text-link" href={paths.records}>{copy.cases.cta} →</Link>
    </div></section>

    <section id="lab" className="spmi-section"><div className="spmi-container spmi-split"><figure className="spmi-lab-image"><Image unoptimized src={spomoveProgramPage.master.visualSrc} alt="SPOKEDU LAB에서 놀이체육과 SPOMOVE 콘텐츠를 탐색하는 실제 화면" width={1536} height={1004} loading="lazy" /></figure><div>
      <Heading {...copy.lab} /><p className="spmi-note">{copy.lab.note}</p><Link className="spmi-button" href={spokeduLabIntroductionHref()} data-track="spomove-lab-introduction">{copy.lab.cta}</Link>
    </div></div></section>

    <div className="spmi-consult"><div className="spmi-container spmi-consult-grid"><div className="spmi-consult-copy"><Heading {...copy.inquiry} /><p className="spmi-note">{copy.inquiry.note}</p><ConsultationLink className="spmi-text-link" href="/contact?type=spomove">{copy.inquiry.alternative} →</ConsultationLink></div><InlineConsultForm type="spomove" /></div></div>
  </main>;
}

export default async function SpomovePage() {
  const publicCards = await listPublicRecordCards();
  const stories = SPOMOVE_LANDING_CASE_SLUGS.flatMap(slug => publicCards.filter(record => record.slug === slug));
  return <SpomoveContent stories={stories} />;
}
