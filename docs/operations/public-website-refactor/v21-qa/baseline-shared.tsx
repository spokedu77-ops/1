import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import type { FieldRecordItem } from '../../data/field-records-catalog';

export function Section({ children, tone = '', id }: { children: ReactNode; tone?: string; id?: string }) {
  return <section id={id} className={`web-section ${tone}`}><div className="web-container">{children}</div></section>;
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return <div className="web-section-heading">{eyebrow && <p className="web-eyebrow">{eyebrow}</p>}<h2>{title}</h2>{children && <div className="web-lead">{children}</div>}</div>;
}

export function ActionLink({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return <Link href={href} className={`web-button${secondary ? ' web-button-secondary' : ''}`}>{children}<ArrowRight size={18} aria-hidden="true" /></Link>;
}

export function CTASection({ title, description, href, label, secondary }: { title: ReactNode; description: string; href: string; label: string; secondary?: { href: string; label: string } }) {
  return <Section><div className="web-cta"><h2>{title}</h2><p>{description}</p><div className="web-actions"><ActionLink href={href}>{label}</ActionLink>{secondary && <ActionLink href={secondary.href} secondary>{secondary.label}</ActionLink>}</div></div></Section>;
}

export function CaseCard({ record }: { record: FieldRecordItem }) {
  const external = record.href.startsWith('https://');
  return <article className="web-case-card" data-record-slug={record.slug}>
    <Link href={record.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="web-case-image" tabIndex={-1} aria-hidden="true">
      <img src={record.thumbnailSrc} alt="" loading="lazy" width={720} height={480} />
    </Link>
    <div className="web-case-body"><span className="web-tag">{record.operationType} · {record.programLabel}</span><h3><Link href={record.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{record.venue}</Link></h3><p className="web-case-meta">{record.meta}</p><p>{record.description}</p><Link className="web-text-link" href={record.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{record.ctaLabel}<ArrowRight size={17} aria-hidden="true" /></Link></div>
  </article>;
}
