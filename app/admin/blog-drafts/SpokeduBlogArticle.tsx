"use client";

import React, { Fragment, useMemo } from "react";
import styles from "./SpokeduBlogArticle.module.css";

/** V3: deliberately restrained blog preview for the existing admin TipTap JSON. */
export type EditorNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: EditorNode[];
};

export type SpokeduBlogDraft = {
  id?: string;
  title: string;
  content: EditorNode;
  category?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  tags?: string[];
};
export type RelatedArticle = { title: string; url: string; category?: string; description?: string };
export type ArticleImage = { src: string; alt?: string; caption?: string };
export type ArticleProps = {
  draft: SpokeduBlogDraft;
  hero?: ArticleImage | null;
  /** Source Storage object path -> existing API's resolved private image URL. */
  imageUrls?: Record<string, string>;
  locationLabel?: string;
  activityDateLabel?: string;
  /** Retained only for compatibility with V2 callers. Light template omits this decoration. */
  summaryFacts?: Array<{ label: string; value: string }>;
  insight?: string;
  /** Retained for V2 caller compatibility; light template intentionally does not render CTA art. */
  ctaImageUrl?: string;
  related?: RelatedArticle[];
  onNavigate?: (url: string) => void;
};

function safeUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch { return undefined; }
}

function imageSrc(raw: string | undefined, urls: Record<string, string>): string | undefined {
  if (!raw) return undefined;
  const value = urls[raw] ?? raw;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return safeUrl(value);
}

function inline(nodes: EditorNode[] = []): React.ReactNode {
  return nodes.map((node, i) => {
    if (node.type === "hardBreak") return <br key={i} />;
    if (node.type !== "text") return null;
    let output: React.ReactNode = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") output = <strong>{output}</strong>;
      else if (mark.type === "code") output = <code>{output}</code>;
      else if (mark.type === "italic") output = <em>{output}</em>;
      else if (mark.type === "underline") output = <u>{output}</u>;
      else if (mark.type === "strike") output = <s>{output}</s>;
      else if (mark.type === "link") {
        const href = safeUrl(String(mark.attrs?.href ?? ""));
        if (href) output = <a href={href} target="_blank" rel="noopener noreferrer">{output}</a>;
      }
    }
    return <Fragment key={i}>{output}</Fragment>;
  });
}

function paragraphPlainText(node: EditorNode): string {
  return textOf(node).replace(/\s+/g, " ").trim();
}

/** Exact generic footer boilerplate only — never article-specific CTAs. */
function isGenericFooterDuplicate(node: EditorNode): boolean {
  if (node.type !== "paragraph") return false;
  const value = paragraphPlainText(node);
  return /아이와 현장의 조건에 맞는 체육수업/.test(value)
    || /^프로그램 살펴보기/.test(value);
}

function isRelatedSectionHeading(node: EditorNode): boolean {
  return node.type === "heading" && /함께 읽어볼/.test(paragraphPlainText(node));
}

function isTeachingPoint(node: EditorNode): boolean {
  return node.type === "blockquote" && /^TEACHING POINT/i.test(paragraphPlainText(node));
}

/**
 * Closing CTAs sit after the last TEACHING POINT and before the related-articles
 * heading. Mid-article "스포키듀는 …" narrative sentences stay untouched.
 */
function isClosingCustomCta(node: EditorNode, index: number, nodes: EditorNode[]): boolean {
  if (node.type !== "paragraph") return false;
  const value = paragraphPlainText(node);
  if (value.length < 10 || value.length > 360) return false;
  if (!/(spokedu\.kr|스포키듀|SPOKEDU)/i.test(value)) return false;
  if (isGenericFooterDuplicate(node)) return false;
  const relatedAt = nodes.findIndex(isRelatedSectionHeading);
  const lastTeachingAt = nodes.reduce((last, item, i) => (isTeachingPoint(item) ? i : last), -1);
  if (relatedAt !== -1 && index >= relatedAt) return false;
  if (lastTeachingAt !== -1 && index <= lastTeachingAt) return false;
  // Fallback when TEACHING POINT is missing: only the last brand paragraph before related links.
  if (lastTeachingAt === -1) {
    const windowEnd = relatedAt === -1 ? nodes.length : relatedAt;
    for (let i = windowEnd - 1; i >= 0; i -= 1) {
      const candidate = nodes[i];
      if (candidate.type !== "paragraph") continue;
      const text = paragraphPlainText(candidate);
      if (/(spokedu\.kr|스포키듀|SPOKEDU)/i.test(text)) return i === index;
    }
    return false;
  }
  return true;
}

function isBoldSectionParagraph(node: EditorNode): boolean {
  if (node.type !== "paragraph" || !node.content?.length) return false;
  const heading = textOf(node).trim();
  if (heading.length < 8 || heading.length > 95 || isGenericFooterDuplicate(node)) return false;
  return node.content.every(child => child.type === "text" &&
    child.marks?.some(mark => mark.type === "bold"));
}

function stripRepeatedClosingContact(nodes: EditorNode[]): EditorNode[] {
  // Preview/export only. Keep manuscript-specific CTAs; remove only trailing
  // generic footer duplicates that would collide with the shared CTA block.
  const result = [...nodes];
  const inspectStart = Math.max(0, nodes.length - 6);
  for (let i = result.length - 1; i >= inspectStart; i -= 1) {
    const item = result[i];
    if (item.type === "horizontalRule" && i === result.length - 1) {
      result.splice(i, 1);
    } else if (isGenericFooterDuplicate(item)) {
      result.splice(i, 1);
    }
  }
  return result;
}

function hasEmbeddedCustomCta(nodes: EditorNode[]): boolean {
  return nodes.some((node, index) => isClosingCustomCta(node, index, nodes));
}

function hasKakaoChannelLink(node?: EditorNode): boolean {
  if (!node) return false;
  const linked = (node.marks ?? []).some(mark => mark.type === "link" && /pf\.kakao\.com/i.test(String(mark.attrs?.href ?? "")));
  if (linked) return true;
  return (node.content ?? []).some(hasKakaoChannelLink);
}

function textOf(node?: EditorNode): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(textOf).join(" ").trim();
}

function formatDate(date?: string | null): string | null {
  if (!date) return null;
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function renderNode(node: EditorNode, key: string, urls: Record<string, string>, highlight: boolean, isLead: boolean): React.ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key} className={isLead ? styles.lead : styles.bodyCopy}>{inline(node.content)}</p>;
    case "heading":
      return <h3 key={key} className={styles.subHeading}>{inline(node.content)}</h3>;
    case "image": {
      const src = imageSrc(String(node.attrs?.src ?? ""), urls);
      if (!src) return null;
      const alt = String(node.attrs?.alt ?? "수업 현장사진");
      const caption = String(node.attrs?.title ?? node.attrs?.caption ?? "").trim();
      return <figure className={styles.fieldPhoto} key={key}>
        <img src={src} alt={alt} loading="lazy" />
        {caption && <figcaption>{caption}</figcaption>}
      </figure>;
    }
    case "blockquote":
      return <blockquote key={key} className={highlight ? styles.insight : styles.insightPlain}>
        {(node.content ?? []).map((part, i) => <p key={i}>{inline(part.content)}</p>)}
      </blockquote>;
    case "bulletList":
    case "orderedList": {
      const items = (node.content ?? []).map((item, i) => <li key={i}>
        {(item.content ?? []).map((nested, j) => <Fragment key={j}>
          {nested.type === "paragraph" ? inline(nested.content) : renderNode(nested, `${key}-item-${i}-${j}`, urls, false, false)}
        </Fragment>)}
      </li>);
      return node.type === "orderedList" ? <ol key={key} className={styles.list}>{items}</ol> : <ul key={key} className={styles.list}>{items}</ul>;
    }
    case "taskList":
      return <ul key={key} className={styles.taskList}>{(node.content ?? []).map((item, i) =>
        <li key={i}><input type="checkbox" checked={Boolean(item.attrs?.checked)} readOnly aria-label="완료 여부" />
          <span>{(item.content ?? []).map((nested, j) => <Fragment key={j}>
            {nested.type === "paragraph" ? inline(nested.content) : renderNode(nested, `${key}-task-${i}-${j}`, urls, false, false)}
          </Fragment>)}</span>
        </li>)}</ul>;
    case "codeBlock":
      return <pre key={key} className={styles.codeBlock}><code>{textOf(node)}</code></pre>;
    case "table":
      return <div key={key} className={styles.tableScroll}><table><tbody>{(node.content ?? []).map((row, i) =>
        <tr key={i}>{(row.content ?? []).map((cell, j) =>
          cell.type === "tableHeader" ? <th key={j} colSpan={Number(cell.attrs?.colspan || 1)} rowSpan={Number(cell.attrs?.rowspan || 1)}>{(cell.content ?? []).map((p, k) => <Fragment key={k}>{inline(p.content)}</Fragment>)}</th> :
            <td key={j} colSpan={Number(cell.attrs?.colspan || 1)} rowSpan={Number(cell.attrs?.rowspan || 1)}>{(cell.content ?? []).map((p, k) => <Fragment key={k}>{inline(p.content)}</Fragment>)}</td>)}</tr>)}</tbody></table></div>;
    case "horizontalRule": return <hr key={key} className={styles.rule} />;
    default: return null;
  }
}

export default function SpokeduBlogArticle({
  draft, hero, imageUrls = {}, locationLabel, activityDateLabel, insight, related = [], onNavigate,
}: ArticleProps) {
  const document = useMemo(() => {
    const intro: EditorNode[] = [];
    const sections: Array<{ title: string; nodes: EditorNode[] }> = [];
    const nodes = Array.isArray(draft.content?.content) ? draft.content.content : [];
    const cleaned = stripRepeatedClosingContact(nodes);
    const customCta = hasEmbeddedCustomCta(cleaned);
    const kakaoCta = cleaned.some(hasKakaoChannelLink);
    const hasH1orH2 = cleaned.some(node => node.type === "heading" && Number(node.attrs?.level ?? 3) <= 2);
    const hasAnyHeading = cleaned.some(node => node.type === "heading");
    for (const node of cleaned) {
      // Old Gemma drafts were stored as H3 instead of H2. When no H1/H2 exists,
      // promote H3 *for presentation only*, preserving their stored JSON.
      const sectionHeading = node.type === "heading" &&
        Number(node.attrs?.level ?? 3) <= (hasH1orH2 ? 2 : 3);
      const promotedBoldHeading = !hasAnyHeading && isBoldSectionParagraph(node);
      if (sectionHeading || promotedBoldHeading) {
        sections.push({ title: textOf(node), nodes: [] });
      } else if (sections.length) {
        sections[sections.length - 1].nodes.push(node);
      } else {
        intro.push(node);
      }
    }
    return { intro, sections, customCta, kakaoCta };
  }, [draft.content]);

  const cover = hero ? imageSrc(hero.src, imageUrls) : undefined;
  const displayDate = activityDateLabel ?? (draft.published_at ? `게시일 ${formatDate(draft.published_at)}` : null);
  let highlightUsed = false;
  const render = (node: EditorNode, key: string, lead = false) => {
    const strong = node.type === "blockquote" && !highlightUsed;
    if (strong) highlightUsed = true;
    return renderNode(node, key, imageUrls, strong, lead);
  };

  return <article className={styles.page}>
    <div className={styles.main}>
      <div className={styles.copyWidth}>
        <p className={styles.kicker} data-copy-exclude="admin">{draft.category || "수업 이야기"}</p>
        <h1 className={styles.title}>{draft.title}</h1>
        <div className={styles.meta} data-copy-exclude="admin">
          <span>SPOKEDU</span>
          {locationLabel && <><span className={styles.dot} /><span>{locationLabel}</span></>}
          {displayDate && <><span className={styles.dot} /><span>{displayDate}</span></>}
        </div>
      </div>
      {cover && <figure className={styles.hero}>
        <img src={cover} alt={hero?.alt ?? "수업 대표 이미지"} />
        {hero?.caption && <figcaption>{hero.caption}</figcaption>}
      </figure>}
      <div className={styles.copyWidth}>
        {document.intro.length > 0 && <div className={styles.leadArea}>
          {document.intro.map((node, i) => render(node, `intro-${i}`, true))}
        </div>}
        {document.sections.map((section, i) => <section key={i} className={styles.chapterGroup}>
          <header className={styles.chapter}><h2 className={styles.chapterHeading}>{section.title}</h2></header>
          {section.nodes.map((node, j) => render(node, `section-${i}-${j}`))}
        </section>)}
        {insight && !highlightUsed && <blockquote className={styles.insight}><p>{insight}</p></blockquote>}
        {/* Custom manuscript CTAs stay in the body above. Shared footer text is omitted to avoid duplication. */}
        {!document.kakaoCta && <footer className={styles.ctaSection}>
          {!document.customCta && (
            <p className={styles.ctaText}><strong>SPOKEDU · 스포키듀</strong>아이와 현장의 조건에 맞는 체육수업을 설계합니다.</p>
          )}
          <a href="https://spokedu.kr" className={styles.ctaLink} target="_blank" rel="noopener noreferrer">프로그램 살펴보기 →</a>
        </footer>}
        {related.length > 0 && <aside className={styles.related}>
          <h3>관련 콘텐츠</h3>
          <div className={styles.relatedList}>
            {related.slice(0, 3).map((item, i) => {
              const href = safeUrl(item.url);
              if (!href) return null;
              return <a className={styles.relatedItem} href={href} key={i}
                onClick={onNavigate ? e => { e.preventDefault(); onNavigate(href); } : undefined}>
                {item.title} →
              </a>;
            })}
          </div>
        </aside>}
      </div>
    </div>
  </article>;
}
