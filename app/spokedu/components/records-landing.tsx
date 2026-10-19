"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FIELD_RECORD_CATALOG,
  RECORDS_LANDING_FEATURED_SLUGS,
  type FieldRecordCatalogItem,
} from "../data/field-records-catalog";
import type { FieldRecordWithThumbnail } from "../lib/resolve-field-records";
import styles from "./records-landing.module.css";

type RecordFilter = "all" | "regular" | "event";

type RecordEntry = {
  slug: string;
  venue: string;
  type: string;
  meta?: string;
  description: string;
  image: string;
  href: string;
  external?: boolean;
  category?: RecordFilter;
};

const FILTERS: readonly { id: RecordFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "regular", label: "정규수업" },
  { id: "event", label: "원데이·행사" },
];

const FEATURED_SLUGS = new Set<string>(RECORDS_LANDING_FEATURED_SLUGS);

function recordFilterFromCatalog(item: FieldRecordCatalogItem): RecordFilter {
  if (item.filters.includes("oneday") || item.operationType.includes("원데이")) {
    return "event";
  }
  return "regular";
}

function catalogToEntry(item: FieldRecordCatalogItem): RecordEntry {
  const external = item.href.startsWith("http");
  return {
    slug: item.slug,
    venue: item.venue,
    type: `${item.operationType} · ${item.programLabel}`,
    meta: item.meta,
    description: item.description,
    image: item.thumbnailSrc ?? `/images/spokedu/records/${item.slug}.jpg`,
    href: item.href,
    external,
    category: recordFilterFromCatalog(item),
  };
}

const ALL_RECORD_ENTRIES: readonly RecordEntry[] = FIELD_RECORD_CATALOG.map(catalogToEntry);

const FEATURED: readonly RecordEntry[] = RECORDS_LANDING_FEATURED_SLUGS.map((slug) => {
  const item = ALL_RECORD_ENTRIES.find((e) => e.slug === slug);
  if (!item) throw new Error(`Missing featured record: ${slug}`);
  return item;
});

const OTHER_RECORDS: readonly RecordEntry[] = ALL_RECORD_ENTRIES.filter(
  (entry) => !FEATURED_SLUGS.has(entry.slug),
);

function RecordLink({
  entry,
  className,
  children,
}: {
  entry: RecordEntry;
  className: string;
  children: ReactNode;
}) {
  if (entry.external) {
    return (
      <a
        className={className}
        href={entry.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={entry.href}>
      {children}
    </Link>
  );
}

export function RecordsLanding({
  fieldRecords,
}: {
  fieldRecords: FieldRecordWithThumbnail[];
}) {
  const caseCount = fieldRecords.length;
  const otherCount = OTHER_RECORDS.length;
  const [activeFilter, setActiveFilter] = useState<RecordFilter>("all");
  const [isFiltering, setIsFiltering] = useState(false);
  const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleRecords = useMemo(() => {
    if (activeFilter === "all") return [...OTHER_RECORDS];
    return OTHER_RECORDS.filter((entry) => entry.category === activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    const readFilterFromUrl = () => {
      const type = new URL(window.location.href).searchParams.get("type");
      setActiveFilter(type === "regular" || type === "event" ? type : "all");
      setIsFiltering(false);
    };

    readFilterFromUrl();
    window.addEventListener("popstate", readFilterFromUrl);
    return () => {
      window.removeEventListener("popstate", readFilterFromUrl);
      if (filterTimer.current) clearTimeout(filterTimer.current);
    };
  }, []);

  const changeFilter = (nextFilter: RecordFilter) => {
    if (nextFilter === activeFilter || isFiltering) return;
    setIsFiltering(true);
    if (filterTimer.current) clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => {
      const url = new URL(window.location.href);
      if (nextFilter === "all") url.searchParams.delete("type");
      else url.searchParams.set("type", nextFilter);
      window.history.pushState({}, "", url);
      setActiveFilter(nextFilter);
      setIsFiltering(false);
    }, 180);
  };

  return (
    <div className={styles.page}>
      <div>
        <section className={styles.hero} aria-labelledby="records-title">
          <div className={styles.rail}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>FIELD RECORDS</p>
              <h1 id="records-title">
                수업은
                <br />
                현장에서 증명됩니다.
              </h1>
              <p className={styles.heroBody}>
                학교와 키움센터, 복지기관과 지역 현장에서
                <br />
                대상과 공간, 운영 목적에 맞춰 진행한
                <br />
                SPOKEDU의 실제 수업 기록입니다.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.featured} aria-labelledby="featured-title">
          <div className={styles.rail}>
            <p className={styles.eyebrow}>주요 수업사례</p>
            <h2 id="featured-title">
              서로 다른 현장에서
              <br />
              다르게 운영했습니다.
            </h2>
            <div className={styles.featuredGrid}>
              {FEATURED.map((entry, index) => (
                <RecordLink
                  key={entry.slug}
                  entry={entry}
                  className={
                    index === 0 ? styles.featuredLarge : styles.featuredSmall
                  }
                >
                  <Image
                    src={entry.image}
                    alt={`${entry.venue} 수업 현장`}
                    fill
                    sizes={index === 0 ? "760px" : "500px"}
                    priority
                  />
                  <span className={styles.featuredShade} aria-hidden="true" />
                  <span className={styles.featuredCaption}>
                    <span className={styles.featuredType}>{entry.type}</span>
                    <strong>{entry.venue}</strong>
                    <span className={styles.featuredDescription}>
                      {entry.description}
                    </span>
                    <span className={styles.arrow} aria-hidden="true">
                      {entry.external ? "↗" : "→"}
                    </span>
                  </span>
                </RecordLink>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.metaStrip} aria-label="사례 안내">
          <div className={styles.rail}>
            <ul className={styles.metaList}>
              <li>
                <span className={styles.metaLabel}>공개 사례</span>
                <span className={styles.metaValue}>{caseCount}건</span>
              </li>
              <li>
                <span className={styles.metaLabel}>운영 형태</span>
                <span className={styles.metaValue}>정규수업 · 원데이 · 행사</span>
              </li>
              <li>
                <span className={styles.metaLabel}>확인 방법</span>
                <span className={styles.metaValue}>사진 · 상세 · 후기 링크</span>
              </li>
            </ul>
          </div>
        </section>

        <section className={styles.archive} aria-labelledby="archive-title">
          <div className={styles.rail}>
            <div className={styles.archiveIntro}>
              <div>
                <p className={styles.eyebrow}>그 외 수업사례</p>
                <h2 id="archive-title">
                  운영 형태별로
                  <br />
                  수업사례를 확인해보세요.
                </h2>
              </div>
              <p>
                주요 사례 {FEATURED.length}건을 제외한 {otherCount}건입니다.
                <br />
                아래 필터는 이 목록({otherCount}건)에만 적용됩니다.
              </p>
            </div>
            <nav className={styles.filters} aria-label="그 외 사례 필터">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={
                    activeFilter === filter.id ? styles.filterActive : undefined
                  }
                  aria-pressed={activeFilter === filter.id}
                  onClick={() => changeFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </nav>
            <div
              className={`${styles.archiveGrid} ${isFiltering ? styles.archiveGridFiltering : ""}`}
              aria-live="polite"
              aria-busy={isFiltering}
            >
              {visibleRecords.map((entry, index) => (
                <RecordLink
                  key={entry.slug}
                  entry={entry}
                  className={styles.archiveItem}
                >
                  <div className={styles.archiveImage}>
                    <Image
                      src={entry.image}
                      alt={`${entry.venue} 수업 현장`}
                      fill
                      sizes="617px"
                    />
                  </div>
                  <div className={styles.archiveHeading}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{entry.type}</p>
                  </div>
                  <h3>{entry.venue}</h3>
                  <p className={styles.archiveMeta}>{entry.meta}</p>
                  <p className={styles.archiveDescription}>
                    {entry.description}
                  </p>
                  <strong className={styles.archiveLink}>
                    {entry.external ? "현장 후기 보기 ↗" : "사례 보기 →"}
                  </strong>
                </RecordLink>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.inquiry} aria-labelledby="inquiry-title">
          <div className={styles.rail}>
            <div>
              <p className={styles.eyebrow}>기관 체육수업 문의</p>
              <h2 id="inquiry-title">
                비슷한 조건의
                <br />
                수업을 찾고 계신가요?
              </h2>
            </div>
            <div className={styles.inquiryActions}>
              <p>
                대상 연령과 인원, 공간과 운영 목적을 알려주시면
                <br />
                가능한 수업 형태부터 함께 확인합니다.
              </p>
              <div>
                <Link className={styles.primaryCta} href="/contact">
                  기관 체육수업 문의하기 <span aria-hidden="true">→</span>
                </Link>
                <Link className={styles.secondaryCta} href="/education">
                  기관 체육수업 알아보기 <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
