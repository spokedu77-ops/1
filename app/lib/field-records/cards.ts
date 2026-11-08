import { FIELD_RECORD_CATALOG, type FieldRecordItem } from '@/app/spokedu/data/field-records-catalog';
import { recordMediaSrc, type PublicFieldRecord } from './contract';

export type RecordCard = FieldRecordItem & { categories: string[]; imageAlt?: string };

export function legacyRecordCards(): RecordCard[] {
  return FIELD_RECORD_CATALOG.map(record => {
    const overrides = record.slug === 'maedong-sports-stepup'
      ? { operationType: '학교 체육교육', programLabel: '정규수업', description: '다양한 스포츠 종목을 경험하며 기본운동기술을 익히고 종목별 움직임을 단계적으로 확장합니다.' }
      : record.slug === 'dongjak-spomove'
        ? { operationType: '키움센터', programLabel: '시지각 움직임 교육', description: '화면의 시각정보를 인식하고 적절한 반응을 선택해 움직임으로 수행하는 활동을 진행합니다.', thumbnailSrc: '/images/spokedu/home/field-editorial/dongjak-spomove-class-20261021.webp' }
        : record.slug === 'donghaeng-special-pe'
          ? { operationType: '특수체육', programLabel: '찾아가는 교육', meta: '서울 중구 · 특수교육 대상 학생 맞춤 체육', description: '학생별 수행 수준과 과제 이해 정도에 맞춰 활동의 난이도와 규칙을 조정하고 단계적으로 지도합니다.' }
          : {};
    return { ...record, ...overrides, trackLabel: record.recordsTrackLabel, categories: ['institution', ...(record.proves.includes('특수체육') ? ['special'] : []), ...(record.programLabel === 'SPOMOVE' ? ['spomove'] : [])] };
  });
}

export function cmsRecordCard(record: PublicFieldRecord): RecordCard {
  const content = record.content;
  return { slug: record.slug, venue: content.venue, meta: content.subtitle, operationType: content.operationType, programLabel: content.programLabel, description: content.summary,
    mediaKey: 'proofDongjak', href: `/records/${record.slug}`, ctaLabel: '사례 자세히 보기', trackLabel: `records-${record.slug}`, filters: [], categories: content.categories,
    thumbnailSrc: content.hero ? recordMediaSrc(content.hero) : undefined, imageAlt: content.hero?.alt };
}
