"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FieldRecordWithThumbnail } from "../lib/resolve-field-records";
import { SiteFooter } from "./home-web/site-footer";
import { SiteHeader } from "./home-web/site-header";
import styles from "./records-landing.module.css";

type RecordEntry = {
  number: string;
  venue: string;
  type: string;
  meta?: string;
  description: string;
  image: string;
  href: string;
  external?: boolean;
  category?: RecordFilter;
};

type RecordFilter = "all" | "regular" | "event";

const FILTERS: readonly { id: RecordFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "regular", label: "정규수업" },
  { id: "event", label: "원데이·행사" },
];

const FEATURED: readonly RecordEntry[] = [
  {
    number: "01",
    venue: "매동초등학교",
    type: "학교 · 정규수업",
    description:
      "학년과 인원에 맞춰 종목을 순환하며 연속적인 스포츠 수업을 운영했습니다.",
    image: "/images/spokedu/records/maedong-sports-stepup.jpg",
    href: "https://blog.naver.com/spokedutogether/224288711414",
    external: true,
  },
  {
    number: "02",
    venue: "서울 중구 찾아가는 동행 체육교실",
    type: "특수·통합 · 정규수업",
    description:
      "참여자의 수행 수준에 따라 거리, 속도, 규칙과 촉진 수준을 조정했습니다.",
    image: "/images/spokedu/records/donghaeng-special-pe-field.jpg",
    href: "https://blog.naver.com/spokedutogether/224338186918",
    external: true,
  },
  {
    number: "03",
    venue: "동작거점형 우리동네키움센터",
    type: "키움센터 · 정규수업",
    description:
      "스크린 신호를 보고 판단한 뒤 움직임으로 반응하도록 구성한 정규 수업입니다.",
    image: "/images/spokedu/records/dongjak-spomove.jpg",
    href: "/records/dongjak-spomove",
  },
];

const ARCHIVE: readonly RecordEntry[] = [
  {
    number: "01",
    venue: "동작거점형 우리동네키움센터",
    type: "정규수업 · SPOMOVE",
    meta: "초등학생 · SPOMOVE 에듀테크",
    description: "화면 신호를 보고 판단·반응하며 움직이는 SPOMOVE 정규수업.",
    image: "/images/spokedu/records/dongjak-spomove.jpg",
    href: "/records/dongjak-spomove",
    category: "regular",
  },
  {
    number: "02",
    venue: "양천거점형키움센터",
    type: "정규수업 · PAPS",
    meta: "초등 1~2학년 · PAPS 놀이체육",
    description: "PAPS 체력 요소를 놀이체육으로 재구성한 저학년 정규수업.",
    image: "/images/spokedu/records/yangcheon-paps.jpg",
    href: "/records/yangcheon-paps",
    category: "regular",
  },
  {
    number: "03",
    venue: "다사랑영등포지역아동센터",
    type: "원데이·행사",
    meta: "초등 2~6학년 · 90분 펑셔널 놀이체육",
    description:
      "학년 혼합 아동이 협동·기능 활동을 순환하도록 구성한 90분 원데이 수업.",
    image: "/images/spokedu/records/dasarang-oneday-field.jpg",
    href: "/records/dasarang-oneday",
    category: "event",
  },
  {
    number: "04",
    venue: "서대문구 독립문공원 어린이날 축제",
    type: "원데이·행사",
    meta: "SPOMOVE 체험부스 · 어린이날 행사",
    description:
      "가족과 아동이 짧은 시간에 참여할 수 있도록 구성한 회전형 체험부스.",
    image: "/images/spokedu/records/seodaemun-event-booth.jpg",
    href: "/records/seodaemun-event-booth",
    category: "event",
  },
  {
    number: "05",
    venue: "매동초등학교",
    type: "정규수업 · 스포츠 스텝업",
    meta: "6개월 늘봄 스포츠",
    description:
      "학년과 인원에 맞춰 여러 종목을 순환하며 운영한 연속 스포츠 수업.",
    image: "/images/spokedu/records/maedong-sports-stepup.jpg",
    href: "https://blog.naver.com/spokedutogether/224288711414",
    external: true,
    category: "regular",
  },
  {
    number: "06",
    venue: "찾아가는 동행 체육교실",
    type: "정규수업 · 특수체육",
    meta: "특수체육 · 찾아가는 동행체육",
    description:
      "수행 수준에 따라 거리와 속도, 규칙과 촉진 수준을 조정한 체육수업.",
    image: "/images/spokedu/records/donghaeng-special-pe-field.jpg",
    href: "https://blog.naver.com/spokedutogether/224338186918",
    external: true,
    category: "regular",
  },
  {
    number: "07",
    venue: "강동구 보건소 연계 수업",
    type: "정규수업 · 일반체육",
    meta: "일반체육 · 보건소 연계",
    description:
      "지역 보건소와 연계해 참여자의 조건과 현장 환경에 맞춰 운영한 정규수업.",
    image: "/images/spokedu/records/gangdong-health-pe.jpg",
    href: "https://blog.naver.com/spokedu77/224119622722",
    external: true,
    category: "regular",
  },
  {
    number: "08",
    venue: "신월 2동 주민센터",
    type: "원데이·행사 · 전연령 통합체육",
    meta: "전연령 · 통합체육 · 주민센터",
    description:
      "여러 연령이 한 현장에서 함께 참여할 수 있도록 구성한 통합 체육활동.",
    image: "/images/spokedu/records/shinwol-integrated-pe.jpg",
    href: "https://blog.naver.com/spokedu77/224104727469",
    external: true,
    category: "event",
  },
];

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
  const [activeFilter, setActiveFilter] = useState<RecordFilter>("all");
  const [isFiltering, setIsFiltering] = useState(false);
  const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRecords =
    activeFilter === "all"
      ? ARCHIVE
      : ARCHIVE.filter((entry) => entry.category === activeFilter);

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
      <SiteHeader />
      <main>
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
            <dl className={styles.stats}>
              <div>
                <dt>{String(caseCount).padStart(2, "0")}</dt>
                <dd>공개 운영 사례</dd>
              </div>
              <div>
                <dt>07</dt>
                <dd>기관 유형</dd>
              </div>
              <div>
                <dt>02</dt>
                <dd>운영 방식</dd>
              </div>
            </dl>
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
                  key={entry.number}
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
                    <span className={styles.featuredType}>
                      {entry.number} &nbsp; {entry.type}
                    </span>
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

        <section className={styles.archive} aria-labelledby="archive-title">
          <div className={styles.rail}>
            <div className={styles.archiveIntro}>
              <div>
                <p className={styles.eyebrow}>전체 수업사례</p>
                <h2 id="archive-title">
                  운영 형태별로
                  <br />
                  수업사례를 확인해보세요.
                </h2>
              </div>
              <p>
                정규수업부터 원데이·행사까지
                <br />
                공개된 운영 기록을 확인할 수 있습니다.
              </p>
            </div>
            <nav className={styles.filters} aria-label="사례 필터">
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
              {visibleRecords.map((entry) => (
                <RecordLink
                  key={entry.number}
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
                    <span>{entry.number}</span>
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
      </main>
      <SiteFooter />
    </div>
  );
}
