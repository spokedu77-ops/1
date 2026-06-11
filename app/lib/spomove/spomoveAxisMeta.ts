/**
 * SPOMOVE 3대 반응시간 축 메타 (admin Training · spokedu-master 공유).
 * 근거·매핑: `app/admin/spomove/training/AXIS_TAXONOMY.md`
 */
export type SpomoveAxis = 'response' | 'attention' | 'executive';

export const SPOMOVE_AXIS_ORDER: readonly SpomoveAxis[] = ['response', 'attention', 'executive'];

export const SPOMOVE_AXIS_META: Record<
  SpomoveAxis,
  { title: string; enTitle: string; salesCopy: string; desc: string; tabSub: string }
> = {
  response: {
    title: '단순 반응',
    enTitle: 'Simple Reaction',
    salesCopy: '보고 바로 움직이는 단순 반응력',
    desc: '하나의 자극에 정해진 대응으로 즉시 연결하는 영역',
    tabSub: '시지각 반응 · 반응 인지',
  },
  attention: {
    title: '선택 반응',
    enTitle: 'Choice Reaction',
    salesCopy: '여러 대안 중 목표를 고르는 선택 반응력',
    desc: '방해·경쟁 자극 속에서 올바른 대응을 골라내는 영역',
    tabSub: '사이먼 효과 · 플랭커',
  },
  executive: {
    title: '복합 반응',
    enTitle: 'Complex Reaction',
    salesCopy: '규칙·기억을 겹쳐 수행하는 복합 반응력',
    desc: '억제·규칙 전환·작업기억이 동시에 요구되는 영역',
    tabSub: '스트룹 과제 · 순차 기억',
  },
};
