/* eslint-disable @next/next/no-img-element -- Real field photography with art-directed crops. */
import Link from 'next/link';
import { getFieldRecordCatalogItem } from '../../data/field-records-catalog';
import { externalLinkProps, isExternalHref } from '../../lib/external-link';
import { HOME_FIELD_RECORDS, type HomeFieldRecord } from './home-web-assets';
import styles from './home-web.module.css';

type HomeRecordCopy = {
  readonly venueLine: string;
  readonly contextLine: string;
  readonly description: string;
};

/** Phase 1-B2B approved home copy — keyed by catalog slug (images and hrefs stay in home-web-assets). */
const HOME_RECORD_COPY: Record<
  'dongjak-spomove' | 'donghaeng-special-pe' | 'maedong-sports-stepup',
  HomeRecordCopy
> = {
  'dongjak-spomove': {
    venueLine: '동작거점형 우리동네키움센터',
    contextLine: '초등학생 · 정규수업',
    description: '화면 신호를 보고 판단한 뒤 움직임으로 반응하는 SPOMOVE 수업을 운영했습니다.',
  },
  'donghaeng-special-pe': {
    venueLine: '서울 중구 찾아가는 동행 체육교실',
    contextLine: '찾아가는 수업',
    description: '참여자의 수행 수준에 맞춰 이동 거리와 속도, 활동 규칙 등을 조정했습니다.',
  },
  'maedong-sports-stepup': {
    venueLine: '매동초등학교',
    contextLine: '학교·늘봄 수업',
    description: '여러 스포츠 종목을 순환하며 운영한 연속 수업 사례입니다.',
  },
};

function recordLinkLabel(href: string): string {
  return isExternalHref(href) ? '블로그에서 보기 ↗' : '사례 자세히 보기 →';
}

function RecordTile({ record, primary = false }: { record: HomeFieldRecord; primary?: boolean }) {
  const catalog = getFieldRecordCatalogItem(record.slug);
  const copy = HOME_RECORD_COPY[record.slug as keyof typeof HOME_RECORD_COPY];
  const venueLine = copy?.venueLine ?? catalog.venue;
  const contextLine = copy?.contextLine ?? catalog.operationType;
  const description = copy?.description ?? catalog.description;
  const program = catalog.programLabel;
  const cta = recordLinkLabel(record.href);
  const external = isExternalHref(record.href);
  const ariaLabel = `${program} — ${venueLine} 사례 보기`;

  const className = `${styles.tile} ${styles.tileCard} ${primary ? styles.tilePrimary : ''}`;
  const body = (
    <>
      <div className={styles.tileMedia}>
        <img
          src={record.src}
          alt={record.alt}
          style={{ objectPosition: record.objectPosition }}
          loading="lazy"
          decoding="async"
        />
      </div>
      <span className={styles.tileInfo}>
        <span className={styles.tileProgram}>{program}</span>
        <span className={styles.tileVenue}>{venueLine}</span>
        <span className={styles.tileContext}>{contextLine}</span>
        <span className={styles.tileDescription}>{description}</span>
        <span className={styles.tileCta}>{cta}</span>
      </span>
    </>
  );

  if (external) {
    return (
      <a href={record.href} className={className} aria-label={ariaLabel} {...externalLinkProps}>
        {body}
      </a>
    );
  }

  return (
    <Link href={record.href} className={className} aria-label={ariaLabel}>
      {body}
    </Link>
  );
}

/** Evidence gallery: one primary case plus two supporting cases with verified operating context. */
export function FieldRecords() {
  const [primary, ...supporting] = HOME_FIELD_RECORDS;
  return (
    <section className={`${styles.section} ${styles.dark}`} aria-labelledby="home-records-heading">
      <div className={styles.rail}>
        <div className={styles.head}>
          <div className={styles.headTitle}>
            <p className={styles.eyebrow}>FIELD RECORDS</p>
            <h2 id="home-records-heading" className={styles.displaySection}>
              실제로 운영한 학교·기관 체육수업
            </h2>
          </div>
          <p className={`${styles.lead} ${styles.headAside}`}>
            학교와 기관에서 운영한 수업을 대상과 프로그램, 운영 방식과 함께 소개합니다.
          </p>
        </div>

        <div className={styles.gallery}>
          <RecordTile record={primary} primary />
          {supporting.map((record) => (
            <RecordTile key={record.slug} record={record} />
          ))}
        </div>
      </div>
    </section>
  );
}
