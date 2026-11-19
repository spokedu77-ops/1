export const HEALTH_LAB_PROGRAM_ID = 'movement-habit-8w';

export type LabWeek = {
  week: number;
  topic: string;
  mission: string;
  missionId?: string;
  domain?: string;
  difficulty?: string;
  version?: number;
  goal?: string;
  materials?: string;
  steps?: string[];
  safety?: string;
  duration?: string;
  audience?: string;
  guidance?: string[];
  available: boolean;
  required: boolean;
};

export const LAB_WEEKS: LabWeek[] = [
  {
    week: 1,
    topic: '초기 움직임 관찰',
    mission: '색상을 찾아 움직여요',
    goal: '시각적 목표를 구분하고 해당 위치로 이동하는 과정을 관찰한다.',
    materials: '빨강·노랑·초록·파랑 카드',
    steps: [
      '카드를 바닥에 일정한 간격으로 배치한다.',
      '보호자가 목표 색상을 제시한다.',
      '아동이 목표 색상을 확인한다.',
      '해당 위치까지 걸어서 이동한다.',
      '활동 후 보호자가 수행을 기록한다.',
    ],
    safety: '미끄럽지 않은 바닥에서 진행하고, 카드 사이를 뛰어넘거나 뛰지 않게 안내한다. 이동 경로에 장애물이 없는지 확인한다.',
    missionId: 'week1-color-move',
    domain: '초기 움직임 관찰',
    difficulty: '기초',
    version: 1,
    available: true,
    required: true,
  },
  {
    week: 2,
    topic: '기초 움직임 기술',
    mission: '발자국 길을 따라 움직여요',
    missionId: 'week2-footstep-path',
    domain: '기초 움직임 기술',
    goal: '시각적으로 제시된 이동 경로를 따라 걸으며 균형과 방향 조절을 경험한다.',
    materials: '발자국 카드 또는 미끄럽지 않은 바닥 표시',
    duration: '약 5분',
    audience: '만 3~6세',
    steps: [
      '안전한 바닥에 발자국 표시를 일렬로 배치한다.',
      '보호자와 함께 출발점과 도착점을 확인한다.',
      '아동이 발자국 표시를 따라 천천히 이동한다.',
      '이동 중 필요하면 보호자가 신체적 또는 언어적 도움을 제공한다.',
      '활동 후 수행 모습을 관찰해 기록한다.',
    ],
    guidance: [
      '발자국 간격은 아동의 신체 조건에 맞춰 조절한다.',
      '만 3~4세는 간격을 좁히고 직선 경로를 우선하며, 필요하면 보호자가 손을 잡아도 된다.',
      '만 5~6세는 익숙해지면 간격을 조절하고 단순한 방향 전환을 더할 수 있다. 속도보다 정확한 수행을 우선한다.',
      '연령만으로 난이도를 강제하지 않고 실제 수행 수준에 따라 조절한다.',
    ],
    safety: '미끄럽지 않은 평평한 바닥에서 진행한다. 높은 구조물이나 장애물 위에서는 걷지 않는다. 속도 경쟁과 시간 제한은 두지 않는다. 불편함이나 불안정성이 보이면 즉시 중단한다.',
    difficulty: '기초',
    version: 1,
    available: true,
    required: true,
  },
  { week: 3, topic: '선택적 주의', mission: '선택적 주의 미리보기', available: false, required: false },
  { week: 4, topic: '시지각-운동 협응', mission: '시지각-운동 협응 미리보기', available: false, required: false },
  { week: 5, topic: '반응 억제', mission: '반응 억제 미리보기', available: false, required: false },
  { week: 6, topic: '순차 기억', mission: '순차 기억 미리보기', available: false, required: false },
  { week: 7, topic: '보호자 협동', mission: '보호자 협동 미리보기', available: false, required: false },
  { week: 8, topic: '최종 수행 관찰', mission: '최종 수행 관찰 미리보기', available: false, required: false },
];

export const TOTAL_MISSIONS = LAB_WEEKS.length;
