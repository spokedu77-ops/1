/* eslint-disable @next/next/no-img-element -- Real field photography with art-directed crops. */
import Link from 'next/link';
import { HOME_FIELD_RECORDS, type HomeFieldRecord } from './home-web-assets';
import styles from './home-web.module.css';

function RecordTile({ record, primary = false }: { record: HomeFieldRecord; primary?: boolean }) {
  return (
    <Link
      href={record.href}
      className={`${styles.tile} ${primary ? styles.tilePrimary : ''}`}
      aria-label={`${record.title} — ${record.place} 사례 보기`}
    >
      <img
        src={record.src}
        alt={record.alt}
        style={{ objectPosition: record.objectPosition }}
        loading="lazy"
        decoding="async"
      />
      <span className={styles.tileCaption}>
        <strong>{record.title}</strong>
        <span>{record.place}</span>
      </span>
    </Link>
  );
}

/** Composition B — Evidence gallery: one primary case plus two supporting cases, one caption structure. */
export function FieldRecords() {
  const [primary, ...supporting] = HOME_FIELD_RECORDS;
  return (
    <section className={`${styles.section} ${styles.dark}`} aria-labelledby="home-records-heading">
      <div className={styles.rail}>
        <div className={styles.head}>
          <div className={styles.headTitle}>
            <p className={styles.eyebrow}>Field Records</p>
            <h2 id="home-records-heading" className={styles.displaySection}>
              수업은
              <br />
              현장에서 증명됩니다.
            </h2>
          </div>
          <p className={`${styles.lead} ${styles.headAside}`}>
            학교, 기관, 지역사회와 함께한 다양한 수업 사례를 통해 SPOKEDU의 가치를 확인할 수 있습니다.
          </p>
        </div>

        <div className={styles.gallery}>
          <RecordTile record={primary} primary />
          {supporting.map((record) => (
            <RecordTile key={record.href} record={record} />
          ))}
        </div>
      </div>
    </section>
  );
}
