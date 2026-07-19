import type { MoveReportLocale } from '../lib/locale';

export type MoveReportUi = {
  loadingPage: string;
  intro: {
    coachBanner: string;
    lead: string;
    reportWord: string;
    meta: string;
    copyBefore: string;
    copyAccent: string;
    copyAfter: string;
    moveTypes: string;
    stats: { n: string; l: string }[];
    fineprint: string;
    strip: string;
    cta: string;
    footHint: string;
  };
  setup: {
    back: string;
    title: string;
    lead: string;
    nameLabel: string;
    nameOptional: string;
    namePlaceholder: string;
    ageLabel: string;
    startWithName: (name: string) => string;
    defaultName: string;
  };
  survey: {
    midHalf: string;
    midAlmost: string;
  };
  loading: {
    preparing: (owner: string) => string;
  };
  result: {
    ownerSub: string;
    highlightStrong: (label: string) => string;
    scrollHint: string;
    retry: string;
    anotherChild: string;
    tabReport: string;
    tabSolution: string;
    radarTitle: (owner: string) => string;
    radarSub: string;
    expand: string;
    collapse: string;
    axisTitle: string;
    axisSocial: string;
    axisExplore: string;
    axisMotive: string;
    axisEnergy: string;
    dominantSuffix: string;
    thinkTitle: string;
    bestLabel: string;
    careLabel: string;
    tipTitle: (owner: string) => string;
    envTitle: (owner: string) => string;
    weakTitle: (owner: string) => string;
    brandBlurb: (owner: string) => string;
    igTitle: string;
    igSub: string;
    footerNote: string;
    consultBody: string;
    consultCta: string;
    consultSummaryTitle: string;
    consultName: string;
    consultType: string;
    consultLine: string;
    consultApproach: string;
  };
  share: {
    leadTitle: (owner: string) => string;
    leadBody: (owner: string) => string;
    openCard: string;
    copyLink: string;
    copying: string;
    copied: string;
    copyFail: string;
  };
  shareCard: {
    ownerSub: string;
    posterSub: (owner: string) => string;
    tipLabel: (owner: string) => string;
  };
  shared: {
    loading: string;
    errorTitle: string;
    errorBody: string;
    startCta: string;
    copyLink: string;
    copied: string;
    copyFail: string;
    anonLabel: string;
  };
};

const KO: MoveReportUi = {
  loadingPage: '로딩 중...',
  intro: {
    coachBanner:
      '선생님 전용 링크로 참여 중이에요. 응답은 유형만 익명 집계되며, 개별 이름은 저장되지 않습니다.',
    lead: '우리 아이는 어떤 움직임 타입일까요?',
    reportWord: '리포트',
    meta: '3분 · 12문항 · 16가지 유형 · 무료',
    copyBefore: '아이마다 몸이 빛나는 순간이 ',
    copyAccent: '다릅니다.',
    copyAfter: '짧은 질문으로 움직임 성향을 살펴보세요.',
    moveTypes: 'Movement · 16가지 관찰형 유형',
    stats: [
      { n: '12', l: '부모 질문' },
      { n: '16', l: '움직임 유형' },
      { n: '3분', l: '대략 소요' },
    ],
    fineprint: '스포키듀 현장 수업 경험을 담은 관찰형 가이드 · 진단·검사가 아닙니다',
    strip: '연세대 체육교육학과 출신 개발 · 무료',
    cta: '3분 체크 시작하기',
    footHint: '3분 · 12문항 · 16가지 유형 · 무료',
  },
  setup: {
    back: '뒤로',
    title: '아이 정보 입력',
    lead: '연령대에 맞춰 질문이 달라집니다.',
    nameLabel: '이름 또는 애칭',
    nameOptional: '(선택)',
    namePlaceholder: '예: 지아, 씩씩이',
    ageLabel: '연령대',
    startWithName: (name) =>
      !name || name === '아이' || name === '우리 아이' ? '질문 시작하기' : `${name} 질문 시작하기`,
    defaultName: '아이',
  },
  survey: {
    midHalf: '잘하고 있어요! 절반쯤 왔어요',
    midAlmost: '거의 다 왔어요! 마지막 4문항이에요',
  },
  loading: {
    preparing: (owner) => `${owner}의 MOVE 리포트를\n준비하고 있어요`,
  },
  result: {
    ownerSub: '움직임 성향 결과',
    highlightStrong: (label) => `${label} 성향이 특히 잘 보여요`,
    scrollHint: '아래로 내려 자세히 보기',
    retry: '다시하기',
    anotherChild: '다른 아이로',
    tabReport: '무브 리포트',
    tabSolution: '집에서 쓸 팁',
    radarTitle: (owner) => `${owner}의 움직임 성향 맵`,
    radarSub: '방금 답한 내용을 바탕으로 그렸어요',
    expand: '자세히 보기',
    collapse: '접기',
    axisTitle: '성향이 기운 쪽',
    axisSocial: '사회성',
    axisExplore: '탐구',
    axisMotive: '동기',
    axisEnergy: '에너지',
    dominantSuffix: ' 우세',
    thinkTitle: '눈에 띄는 강점',
    bestLabel: '✨ 잘 맞는 유형',
    careLabel: '🤝 맞춰보면 좋은 점',
    tipTitle: (owner) => `${owner}에게 통하는 한 마디`,
    envTitle: (owner) => `${owner}에게 잘 맞는 환경`,
    weakTitle: (owner) => `${owner}에게 더 키워주면 좋은 부분`,
    brandBlurb: (owner) =>
      `${owner}의 놀이·체육 움직임을 읽는 관찰 가이드예요. 같은 체육도 아이마다 접근이 달라야 합니다.`,
    igTitle: '스포키듀 인스타그램',
    igSub: '@spokedu_kids · 수업 현장 영상 보러가기 →',
    footerNote: '스포키듀 현장 수업 경험을 담은 관찰형 가이드입니다. 의료·심리 진단이 아닙니다.',
    consultBody:
      '개인·소그룹 수업 상담 페이지로 이동합니다. 아이 상황과 희망 종목을 적어 주시면 맞춰 안내해 드려요.',
    consultCta: '개인수업 상담 신청하기',
    consultSummaryTitle: '[MOVE REPORT 요약]',
    consultName: '이름',
    consultType: '유형',
    consultLine: '한 줄 설명',
    consultApproach: '권장 접근',
  },
  share: {
    leadTitle: (owner) => `${owner}의 결과 공유하기`,
    leadBody: (owner) =>
      `${owner}의 움직임 성향을 친구에게 보내고, 다른 아이는 어떤 유형인지도 함께 확인해 보세요.`,
    openCard: '결과 카드 보기',
    copyLink: '링크 복사',
    copying: '복사 중…',
    copied: '링크가 복사되었어요',
    copyFail: '복사에 실패했어요. 링크를 길게 눌러 직접 복사해 보세요.',
  },
  shareCard: {
    ownerSub: '움직임 성향 결과',
    posterSub: (owner) => `${owner}의 움직임 성향`,
    tipLabel: (owner) => `${owner}에게 잘 통하는 말`,
  },
  shared: {
    loading: '불러오는 중…',
    errorTitle: '결과를 불러오지 못했어요',
    errorBody: '링크가 잘못되었을 수 있어요. MOVE REPORT를 다시 시작해 주세요.',
    startCta: '다른 친구 해보기',
    copyLink: '링크 복사',
    copied: '링크가 복사되었어요',
    copyFail: '복사에 실패했어요. 주소창의 링크를 길게 눌러 복사해 보세요.',
    anonLabel: '우리 아이',
  },
};

const EN: MoveReportUi = {
  loadingPage: 'Loading…',
  intro: {
    coachBanner:
      'You’re joining via a teacher link. Only anonymous type totals are saved — individual names are never stored.',
    lead: 'How does your child like to move?',
    reportWord: 'REPORT',
    meta: '3 min · 12 questions · 16 styles · Free',
    copyBefore: 'Kids don’t all light up in the ',
    copyAccent: 'same moments.',
    copyAfter: 'This short check helps you notice their movement style.',
    moveTypes: 'Movement · 16 observation-based styles',
    stats: [
      { n: '12', l: 'Parent questions' },
      { n: '16', l: 'Movement styles' },
      { n: '3 min', l: 'Typical time' },
    ],
    fineprint: 'An observation guide from real PE and play settings — not a medical or psychological test',
    strip: 'Built from classroom PE experience · Free',
    cta: 'Start the 3-minute check',
    footHint: '3 min · 12 questions · 16 styles · Free',
  },
  setup: {
    back: 'Back',
    title: 'About your child',
    lead: 'We’ll match the questions to the age group you choose.',
    nameLabel: 'Name or nickname',
    nameOptional: '(optional)',
    namePlaceholder: 'e.g. Mia, Buddy',
    ageLabel: 'Age group',
    startWithName: (name) =>
      !name || name === 'child' || name.toLowerCase() === 'your child'
        ? 'Start the questions'
        : `Start with ${name}`,
    defaultName: 'child',
  },
  survey: {
    midHalf: 'Nice work — you’re almost halfway',
    midAlmost: 'Almost done — 4 questions left',
  },
  loading: {
    preparing: (owner) => `Putting together\n${owner}'s MOVE Report…`,
  },
  result: {
    ownerSub: 'Movement style snapshot',
    highlightStrong: (label) => `${label} stands out`,
    scrollHint: 'Scroll for the full picture',
    retry: 'Start over',
    anotherChild: 'Another child',
    tabReport: 'Move Report',
    tabSolution: 'Tips for home',
    radarTitle: (owner) => `${owner}'s activity style map`,
    radarSub: 'Based on the answers you just gave',
    expand: 'Show more detail',
    collapse: 'Hide detail',
    axisTitle: 'Where their style leans',
    axisSocial: 'Social',
    axisExplore: 'Exploration',
    axisMotive: 'Motivation',
    axisEnergy: 'Energy',
    dominantSuffix: ' stronger',
    thinkTitle: 'Strengths to notice',
    bestLabel: '✨ Easy pairing',
    careLabel: '🤝 Worth a heads-up',
    tipTitle: (owner) => `A phrase that often lands with ${owner}`,
    envTitle: (owner) => `Settings that often suit ${owner}`,
    weakTitle: (owner) => `A growth edge for ${owner}`,
    brandBlurb: (owner) =>
      `Use this as a practical lens on how ${owner} moves in play and PE — patterns teachers often notice, not a diagnosis.`,
    igTitle: 'SPOKEDU on Instagram',
    igSub: '@spokedu_kids · Real class moments →',
    footerNote:
      'Observation-based guidance from SPOKEDU classroom experience. Not a medical, clinical, or psychological assessment.',
    consultBody:
      'Opens the private lesson consult page. Tell us about your child and preferred activities, and we’ll guide the next step.',
    consultCta: 'Request a private lesson consult',
    consultSummaryTitle: '[MOVE REPORT SUMMARY]',
    consultName: 'Name',
    consultType: 'Type',
    consultLine: 'One-liner',
    consultApproach: 'Best approach',
  },
  share: {
    leadTitle: (owner) => `Share ${owner}'s result`,
    leadBody: (owner) =>
      `Send ${owner}'s movement style to a friend — then try it for another kid too.`,
    openCard: 'View result card',
    copyLink: 'Copy link',
    copying: 'Copying…',
    copied: 'Link copied',
    copyFail: 'Couldn’t copy. Long-press the link to copy it yourself.',
  },
  shareCard: {
    ownerSub: 'Movement style snapshot',
    posterSub: (owner) => `${owner}'s movement style`,
    tipLabel: (owner) => `A phrase that often works with ${owner}`,
  },
  shared: {
    loading: 'Loading…',
    errorTitle: 'We couldn’t open this result',
    errorBody: 'The link may be incomplete. Start a new MOVE Report instead.',
    startCta: 'Try for another friend',
    copyLink: 'Copy link',
    copied: 'Link copied',
    copyFail: 'Couldn’t copy. Long-press the address bar link instead.',
    anonLabel: 'Your child',
  },
};

export function getMoveReportUi(locale: MoveReportLocale): MoveReportUi {
  return locale === 'en' ? EN : KO;
}
