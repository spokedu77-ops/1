import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FIELD_RECORD_SECTIONS, recordMediaSrc, type RecordBlock, type RecordContent, type RecordInline } from '@/app/lib/field-records/contract';
import { ActionLink } from './shared';
import '../styles/field-records.css';

function Inline({ content }: { content: string | RecordInline[] }) {
  if (typeof content === 'string') return <>{content}</>;
  return <>{content.map((item, index) => {
    if (item.type === 'link') return <a key={index} href={item.href} {...(item.href.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}><Inline content={item.content} /></a>;
    let text: ReactNode = item.text;
    if (item.styles.bold) text = <strong>{text}</strong>;
    if (item.styles.italic) text = <em>{text}</em>;
    if (item.styles.underline) text = <u>{text}</u>;
    if (item.styles.strike) text = <s>{text}</s>;
    if (item.styles.code) text = <code>{text}</code>;
    return <span key={index}>{text}</span>;
  })}</>;
}
export function RecordBlocks({ blocks }: { blocks: RecordBlock[] }) {
  const result: ReactNode[] = [];
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index]; const text = <Inline content={block.content} />;
    if (block.type === 'bulletListItem' || block.type === 'numberedListItem') {
      const type = block.type; const items: RecordBlock[] = [block];
      while (blocks[index + 1]?.type === type) items.push(blocks[++index]);
      const children = items.map((item, itemIndex) => <li key={item.id ?? itemIndex}><Inline content={item.content} />{item.children?.length ? <RecordBlocks blocks={item.children} /> : null}</li>);
      result.push(type === 'bulletListItem' ? <ul key={index}>{children}</ul> : <ol key={index}>{children}</ol>);
    } else {
      result.push(block.type === 'heading' ? block.props?.level === 3 ? <h4 key={block.id ?? index}>{text}</h4> : <h3 key={block.id ?? index}>{text}</h3> : <p key={block.id ?? index}>{text}</p>);
      if (block.children?.length) result.push(<RecordBlocks key={`children-${index}`} blocks={block.children} />);
    }
  }
  return <>{result}</>;
}

export function FieldRecordDetail({ content, preview = false }: { content: RecordContent; preview?: boolean }) {
  return <main id="main-content" className="website-page web-field-record">
    <article className="web-container">
      <header className="web-field-record-header">
        <Link className="web-text-link" href="/records">← 전체 현장 기록</Link>
        <p className="web-tag">{content.operationType} · {content.programLabel}</p>
        <h1>{content.venue}</h1>
        <p className="web-lead">{content.title}</p>
        <p>{content.subtitle}</p>
        <dl className="web-field-record-facts">
          <div><dt>교육 대상</dt><dd>{content.audience}</dd></div>
          <div><dt>운영 기관 및 형태</dt><dd>{content.operator}</dd></div>
          {content.period && <div><dt>운영 기간</dt><dd>{content.period}</dd></div>}
        </dl>
        {content.keywords.length > 0 && <ul className="web-field-record-keywords">{content.keywords.map(keyword => <li key={keyword}>{keyword}</li>)}</ul>}
      </header>
      {content.hero && <figure className="web-field-record-hero"><Image unoptimized src={recordMediaSrc(content.hero, preview)} alt={content.hero.alt} width={1600} height={1000} priority />{content.hero.caption && <figcaption>{content.hero.caption}</figcaption>}</figure>}
      <div className="web-field-record-sections">
        {content.sections.filter(section => section.visible).map(section => <section key={section.id} aria-labelledby={`record-${section.id}`}>
          <p className="web-eyebrow">{String(FIELD_RECORD_SECTIONS.findIndex(item => item.id === section.id) + 1).padStart(2, '0')}</p>
          <h2 id={`record-${section.id}`}>{section.title}</h2>
          <div className="web-field-record-prose"><RecordBlocks blocks={section.blocks} /></div>
          {section.id === 'gallery' && content.gallery.length > 0 && <div className="web-field-record-gallery">{content.gallery.map((media, index) => <figure key={media.id ?? media.localKey ?? index}><Image unoptimized src={recordMediaSrc(media, preview)} alt={media.alt} width={1200} height={900} loading="lazy" />{media.caption && <figcaption>{media.caption}</figcaption>}</figure>)}</div>}
        </section>)}
      </div>
      <div className="web-cta"><h2>{content.ctaTitle}</h2><div className="web-actions"><ActionLink href={content.relatedProgram}>{content.programCtaLabel}</ActionLink><ActionLink href={content.contactHref} secondary>{content.contactCtaLabel}</ActionLink></div></div>
      <Link className="web-text-link" href="/records">← 전체 현장 기록으로 돌아가기</Link>
    </article>
  </main>;
}
