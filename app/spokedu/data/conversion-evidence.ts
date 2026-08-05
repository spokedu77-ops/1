import type { HomeMediaKey } from './home-media';
import type { FieldRecordSlug } from './field-records-catalog';

/** 주장(mustProve)별 증거 — Records 링크만이 아니라 유형을 구분한다. */
export type EvidenceSource =
  | {
      type: 'record';
      recordSlug: FieldRecordSlug;
      label: string;
    }
  | {
      type: 'asset';
      mediaKey: HomeMediaKey;
      label: string;
    }
  | {
      type: 'policy';
      policyId: string;
      label: string;
    }
  | {
      type: 'product';
      href: string;
      label: string;
    }
  | {
      type: 'history';
      /** curriculum-page serviceExamples 등 페이지 내 이력 키 */
      historyId: string;
      label: string;
    }
  | {
      type: 'missing';
      note: string;
    };
