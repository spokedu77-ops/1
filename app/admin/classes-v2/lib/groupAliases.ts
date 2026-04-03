export type GroupAliasRule = {
  /** V2에서 표시할 그룹명(가상 그룹 키) */
  aliasTitle: string;
  /**
   * V2에서만 묶기 위한 매칭 규칙.
   * - group_id를 수동으로 입력하지 않기 위해 “수업명(정제된 제목)” 기반으로 매칭합니다.
   * - 오탐을 줄이기 위해 AND 조건(모두 포함) 형태를 유지하되,
   *   같은 alias에 여러 패턴(OR)을 허용합니다.
   */
  matchAny: Array<{ titleIncludesAll: string[] }>;
};

/**
 * V2에서만 여러 group_id를 하나의 “가상 그룹”으로 묶습니다.
 * - DB의 sessions.group_id는 변경하지 않습니다(기존 데이터 안전).
 * - 새 사이클/신규 개설은 V2에서 생성된 group_id로 정리되므로, 점차 alias 의존이 줄어듭니다.
 */
export const GROUP_ALIAS_RULES: GroupAliasRule[] = [
  {
    aliasTitle: '신사 11남 학교체육',
    matchAny: [
      { titleIncludesAll: ['신사', '11남', '학교체육'] },
    ],
  },
  {
    aliasTitle: '신사 10남 농구',
    matchAny: [
      { titleIncludesAll: ['신사', '10남', '농구'] },
    ],
  },
  {
    aliasTitle: '반포 10남 학교체육',
    // 예: '반포 10남 학교체육 (정재원 / 성연호)'
    matchAny: [{ titleIncludesAll: ['반포', '10남', '학교체육'] }],
  },
];

