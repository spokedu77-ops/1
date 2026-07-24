'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { brandFocusRing, koreanText } from '../lib/ui-classes';

type TabId = 'education' | 'special-pe' | 'catalog';

type InfoCard = {
  eyebrow?: string;
  title: string;
  body: string;
  note?: string;
};

type ImageItem = {
  src: string;
  alt: string;
  caption: string;
};

type SectionBlock = {
  eyebrow: string;
  title: string;
  lead?: string;
  tone?: 'paper' | 'white' | 'navy' | 'blue';
  cards?: InfoCard[];
  images?: ImageItem[];
  footnote?: string;
};

type TabContent = {
  id: TabId;
  label: string;
  description: string;
  sections: SectionBlock[];
};

const CONTACT_HREF = '/spokedu/contact?type=dispatch';

const responseStages: InfoCard[] = [
  {
    eyebrow: '01',
    title: '단순 반응',
    body: '하나의 자극을 보고 정해진 위치나 동작으로 즉시 연결합니다.',
    note: '시지각 반응 · 반응 인지',
  },
  {
    eyebrow: '02',
    title: '선택 반응',
    body: '여러 자극과 방해 정보 속에서 현재 규칙에 필요한 목표를 골라 움직입니다.',
    note: '사이먼 효과 · 플랭커',
  },
  {
    eyebrow: '03',
    title: '복합 반응',
    body: '규칙을 유지하고 익숙한 반응을 억제하며 순서를 기억해 수행합니다.',
    note: '스트룹 과제 · 순차 기억',
  },
  {
    eyebrow: '04',
    title: '몰입 프로그램',
    body: '화면 속 공간 안에서 달리고, 점프하고, 피하며 전신으로 반응합니다.',
    note: '3D DIVE MODE · 전신 움직임',
  },
];

const cognitiveTasks: InfoCard[] = [
  {
    eyebrow: 'SIMON EFFECT',
    title: '사이먼 효과',
    body: '자극이 보이는 위치와 실제 반응해야 하는 위치가 다를 때, 자동으로 움직이려는 반응을 멈추고 현재 규칙에 맞는 패드를 선택합니다.',
    note: '공간 정보 분리 · 자동 반응 억제',
  },
  {
    eyebrow: 'FLANKER TASK',
    title: '플랭커',
    body: '가운데 목표 주변에 방해 자극을 함께 제시해, 주변 정보에 흔들리지 않고 중심 목표만 찾아 반응하도록 구성합니다.',
    note: '선택적 주의 · 방해 자극 구분',
  },
  {
    eyebrow: 'STROOP TASK',
    title: '스트룹 과제',
    body: '글자의 의미, 색, 방향처럼 서로 다른 정보가 충돌할 때 정해진 기준만 선택해 반응하도록 설계합니다.',
    note: '규칙 유지 · 반응 통제 · 규칙 전환',
  },
];

const movementSkills: InfoCard[] = [
  {
    eyebrow: 'MOVE & STOP',
    title: '이동하고 멈추기',
    body: '움직인 뒤 정확한 위치에 멈추고 다음 이동을 준비하며 몸을 조절합니다.',
    note: '이동 · 정지 · 위치 조절',
  },
  {
    eyebrow: 'BALANCE & CONTROL',
    title: '균형과 자세 조절',
    body: '한 발 스텝, 양발 점프, 방향 전환 과정에서 착지와 무게중심을 조절합니다.',
    note: '스텝 · 점프 · 방향 전환 · 착지',
  },
  {
    eyebrow: 'OBJECT CONTROL',
    title: '다양한 교구',
    body: '화면 규칙과 공, 풍선, 컵, 콘, 후프, 원마커, 스카프, 타격 도구를 연결해 손과 발의 움직임으로 확장합니다.',
    note: '굴리기 · 던지기 · 옮기기 · 쌓기 · 치기 · 터치',
  },
];

const tabs: TabContent[] = [
  {
    id: 'education',
    label: '교육 소개',
    description: '4색 패드, 시지각 반응, 움직임 기술, 교구 확장, 연령별 현장 적용을 교육 관점에서 정리합니다.',
    sections: [
      {
        eyebrow: 'FOUR-COLOR PAD',
        title: '한 장의 4색 패드가 움직임의 기준이 됩니다.',
        lead:
          '빨강, 노랑, 초록, 파랑의 고정된 공간은 화면의 신호를 실제 발 위치로 연결합니다. 아이는 색을 맞히는 데서 끝나지 않고 목표 위치를 선택해 이동하고 멈추며 다음 동작을 준비합니다.',
        cards: [
          { eyebrow: '1', title: '인지', body: '화면의 색, 위치, 방향, 형태 변화를 확인합니다.' },
          { eyebrow: '2', title: '선택', body: '여러 정보 중 현재 규칙에 필요한 반응을 결정합니다.' },
          { eyebrow: '3', title: '수행', body: '선택한 반응을 스텝, 점프, 터치, 방향 전환으로 실행합니다.' },
          { eyebrow: '4', title: '조절', body: '리듬과 순서에 맞춰 움직임의 속도와 타이밍을 이어갑니다.' },
        ],
        images: [
          {
            src: '/spokedu/programs/spomove/assets/edu/edu-02.webp',
            alt: '빨강 노랑 초록 파랑 순서의 2x2 SPOMOVE 4색 패드',
            caption: '화면의 정보가 실제 발 위치와 연결되는 4색 패드',
          },
        ],
      },
      {
        eyebrow: 'VISUAL REACTION THEMES',
        title: '같은 4색도 제시 방식이 바뀌면 다른 게임이 됩니다.',
        lead:
          '시지각 반응 안에서도 자극의 흐름, 등장 시간, 위치, 배열, 속도를 바꿔 다양한 콘텐츠를 구성합니다. 리듬게임처럼 반복하고 몰입하지만, 매 순간 몸으로 반응해야 합니다.',
        tone: 'navy',
        cards: [
          { title: '리듬·흐름형', body: '플로우, 펄스, 러시처럼 일정한 박자와 흐름에 맞춰 연속 반응합니다.' },
          { title: '순간 탐지형', body: '플래시, 블랙아웃처럼 짧게 나타나는 목표를 빠르게 발견합니다.' },
          { title: '공간·패턴형', body: '패턴, 대각선, 스윕처럼 위치와 방향의 변화를 읽고 이동합니다.' },
          { title: '게임·몰입형', body: '심해 반응과 몰 두더지처럼 화면 연출과 타겟 탐색을 결합합니다.' },
        ],
        images: [
          { src: '/spokedu/programs/spomove/assets/edu/edu-07.webp', alt: '색 블록이 흐르듯 내려오는 플로우 화면', caption: 'FLOW · 흐름과 타이밍' },
          { src: '/spokedu/programs/spomove/assets/edu/edu-08.webp', alt: '파란 원이 순간적으로 등장하는 플래시 화면', caption: 'FLASH · 순간 탐지' },
          { src: '/spokedu/programs/spomove/assets/edu/edu-09.webp', alt: '네 방향에서 색 자극이 나타나는 패턴 화면', caption: 'PATTERN · 위치와 배열' },
          { src: '/spokedu/programs/spomove/assets/edu/edu-10.webp', alt: '3x3 칸에서 색 타겟을 찾는 몰 두더지 화면', caption: 'MOLE · 타겟 탐색' },
        ],
      },
      {
        eyebrow: 'CONTENT EXPANSION',
        title: '훈련에서 놀이로, 패드에서 교구로 확장됩니다.',
        lead:
          '기본 반응 구조는 그대로 유지하면서 화면 표현과 움직임 과제를 바꿉니다. 그래서 한 번 익힌 규칙을 여러 형태의 신체활동으로 반복하고 확장할 수 있습니다.',
        tone: 'blue',
        cards: [
          { title: '리듬 챌린지', body: '색과 박자에 맞춰 스텝, 점프, 터치를 이어가며 움직임의 시작과 정지 타이밍을 경험합니다.' },
          { title: '타겟 반응 놀이', body: '화면에서 목표 색과 위치를 찾아 이동한 뒤 두더지잡기, 타겟 터치, 정확히 치기와 같은 게임으로 연결합니다.' },
          { title: '교구 결합 미션', body: '색 신호에 따라 공을 굴리거나 던지고, 컵과 콘을 옮기고, 후프를 통과합니다.' },
          { title: '연상 움직임', body: '동물, 탈것, 자연물에서 떠오르는 색과 동작을 연결해 이야기가 있는 움직임 활동으로 확장합니다.' },
        ],
      },
      {
        eyebrow: 'FIELD APPLICATION',
        title: '미취학부터 중학생까지, 같은 콘텐츠를 다르게 설계합니다.',
        lead:
          'SPOMOVE는 제시 속도, 반복 횟수, 활동 시간, 자극 간격과 규칙의 수를 조절할 수 있습니다. 연령만으로 수업을 나누는 것이 아니라 참여자의 주의 지속 시간, 움직임 경험과 이해 수준에 맞춰 난이도를 설계합니다.',
        cards: [
          {
            title: '미취학 · 초등 저학년',
            body: '선명한 단일 자극과 충분한 반응 시간을 제공해 색 위치 찾기, 한 발 이동, 양발 점프, 멈추기, 교구 터치처럼 이해하기 쉬운 활동부터 시작합니다.',
            note: '기본 움직임 · 성공 경험 · 자연스러운 참여',
          },
          {
            title: '초등 고학년 · 중학생',
            body: '빠른 템포와 복수 자극, 규칙 전환, 팀 대항과 교구 미션을 결합합니다. 선택 과제를 경쟁·협력 게임으로 확장해 몰입과 성취감을 만듭니다.',
            note: '선택 반응 · 규칙 전환 · 도전과 성취',
          },
          {
            title: '특수교육 대상 아동 · 느린학습자',
            body: '화면의 변화에 시선을 두고, 다음 자극을 기다리며, 이동·터치·점프와 같은 움직임을 스스로 표현하는 참여 구조를 만듭니다.',
            note: '시선 집중 · 자발적 움직임 · 지속적인 참여',
          },
        ],
        images: [
          { src: '/spokedu/programs/spomove/assets/edu/edu-03.webp', alt: '여러 아동이 화면과 4색 패드를 함께 활용하는 SPOMOVE 단체수업', caption: '화면과 4색 패드를 함께 활용하는 단체수업' },
          { src: '/spokedu/programs/spomove/assets/edu/edu-04.webp', alt: '색과 위치 자극에 맞춰 패드 위에서 움직이는 아동들', caption: '색·위치 자극에 맞춘 선택 반응' },
          { src: '/spokedu/programs/spomove/assets/edu/edu-11.webp', alt: '원마커와 콘 등 다양한 교구를 함께 배치한 SPOMOVE 수업', caption: '교구와 결합한 움직임 확장' },
        ],
      },
    ],
  },
  {
    id: 'special-pe',
    label: '특수체육',
    description: '특수아동에게 SPOMOVE가 왜 유효한지, 어떤 원리로 단계화하고 현장에 맞게 커스터마이징하는지 정리합니다.',
    sections: [
      {
        eyebrow: 'SPECIAL PE CONTEXT',
        title: '더 많이 설명하기보다 더 명확하게 보여줍니다.',
        lead:
          '구두 설명을 듣고 기억한 뒤 움직이는 방식이 어려운 아동에게는 화면의 색 하나가 움직임의 시작점이 됩니다. SPOMOVE는 복잡한 지시를 줄이고 시각 정보와 바닥 위치를 직접 연결합니다.',
        cards: [
          { title: '말을 듣고 기억한 뒤 움직이는 수업', body: '언어 지시와 순서를 기억해야 하면 활동 시작 자체가 어려워질 수 있습니다.' },
          { title: '색을 확인하고 자신의 속도로 움직이는 수업', body: '화면에 보이는 색과 같은 패드로 이동하면 활동 구조를 직관적으로 이해할 수 있습니다.' },
          { title: '화면의 색 하나가 시작점', body: '처음에는 한 가지 색과 한 가지 움직임만 제시해 화면과 패드의 관계를 익힙니다.' },
        ],
      },
      {
        eyebrow: 'DESIGN PRINCIPLES',
        title: '특수아동의 움직임은 속도보다 구조가 중요합니다.',
        tone: 'navy',
        cards: [
          { eyebrow: '01', title: '단순 제시', body: '처음에는 한 가지 색과 한 가지 움직임만 제시해 화면과 패드의 관계를 이해하도록 합니다.', note: '색 하나 · 위치 하나 · 동작 하나' },
          { eyebrow: '02', title: '반응 시간 확보', body: '자극 간격과 제한 시간을 느리게 설정해 보고, 선택하고, 이동할 시간을 충분히 제공합니다.', note: '느린 속도 · 넉넉한 반응 시간' },
          { eyebrow: '03', title: '동일 규칙 반복', body: '규칙을 자주 바꾸지 않고 익숙한 활동을 반복해 스스로 시작하는 경험을 축적합니다.', note: '예측 가능한 구조 · 반복학습' },
          { eyebrow: '04', title: '단계적 변화', body: '안정적으로 참여하기 시작하면 색의 수, 위치, 속도, 방해 자극을 한 가지씩 추가합니다.', note: '작은 변화 · 점진적 확장' },
        ],
      },
      {
        eyebrow: 'SAME RULE · NEW THEME',
        title: '규칙은 유지하면서 수행 주제만 조금씩 바꿉니다.',
        lead:
          '화면에서 제시된 색을 보고 같은 색의 패드로 이동한다는 핵심 규칙은 유지합니다. 주제가 달라져도 아동이 수행해야 하는 구조가 같기 때문에 새로운 화면을 어렵지 않게 받아들일 수 있습니다.',
        tone: 'blue',
        cards: [
          { title: '본질은 하나', body: '반응 주제는 달라져도 색을 보고 움직이는 규칙은 같습니다.' },
          { title: '흥미 유지', body: '같은 규칙 안에서 시각 소재만 변화시키면 반복 활동에 대한 흥미를 유지할 수 있습니다.' },
          { title: '점진적 일반화', body: '익숙한 규칙을 다양한 화면과 움직임에 적용하며 수행 범위를 넓힙니다.' },
        ],
        images: [
          { src: '/spokedu/programs/spomove/assets/spe/spe-05.webp', alt: '과일 테마 화면을 보고 색 패드에서 활동하는 실제 수업 장면', caption: '규칙은 유지하고 화면 주제만 바꾸는 방식' },
          { src: '/spokedu/programs/spomove/assets/spe/spe-06.webp', alt: '교사와 함께 화면 신호를 확인하며 패드 활동을 익히는 실제 수업 장면', caption: '처음에는 함께 확인하고 점차 스스로 선택' },
        ],
      },
      {
        eyebrow: 'GRADUAL RESPONSE LEVEL',
        title: '단순한 색 반응에서 복합 반응으로 확장합니다.',
        cards: [
          { eyebrow: 'LEVEL 01', title: '단순 색지각', body: '화면의 한 가지 색을 보고 같은 색 패드로 이동합니다.', note: '색 확인 → 이동' },
          { eyebrow: 'LEVEL 02', title: '색·위치 선택', body: '여러 색과 위치 중 현재 제시된 타겟을 선택합니다.', note: '보기 → 고르기 → 움직이기' },
          { eyebrow: 'LEVEL 03', title: '사이먼 효과', body: '제시 위치와 반응 위치가 다를 때 현재 규칙에 맞게 선택합니다.', note: '자동 반응 억제 · 위치 선택' },
          { eyebrow: 'LEVEL 04', title: '플랭커', body: '주변의 방해 자극을 제외하고 가운데 목표 정보에 반응합니다.', note: '주의 선택 · 방해 자극 구분' },
          { eyebrow: 'LEVEL 05', title: '스트룹 과제', body: '색, 방향, 의미가 충돌할 때 현재 규칙에 맞는 반응을 선택합니다.', note: '규칙 전환 · 복합 반응' },
        ],
      },
      {
        eyebrow: 'LESSON STRUCTURE',
        title: 'SPOMOVE는 특수체육 수업의 중심 연결 단계가 됩니다.',
        tone: 'paper',
        cards: [
          { eyebrow: 'STEP 01', title: '기본 움직임기술', body: '걷기, 뛰기, 점프, 멈추기, 방향 전환 등 움직임의 기초를 먼저 경험합니다.' },
          { eyebrow: 'STEP 02', title: 'SPOMOVE', body: '화면의 색과 위치를 확인하며 앞에서 익힌 움직임을 스스로 선택하고 수행합니다.', note: '시각 정보와 신체 움직임을 연결하는 핵심 단계' },
          { eyebrow: 'STEP 03', title: '체험·조작운동기술', body: '공, 풍선, 후프, 컵, 콘, 스카프와 스포츠교구를 활용해 활동을 확장합니다.' },
        ],
      },
      {
        eyebrow: 'FIELD OBSERVATION',
        title: '정답 수행을 넘어 자발적인 움직임으로 이어졌습니다.',
        tone: 'navy',
        cards: [
          { title: '패드로 이동한 뒤 자연스럽게 춤추기', body: '정해진 위치에 도착한 뒤 화면의 리듬에 맞춰 몸을 흔들며 자신의 움직임을 표현했습니다.' },
          { title: '도착 후 계속 점프 이어가기', body: '색 패드로 이동한 뒤 동작을 멈추지 않고 반복 점프로 확장하는 모습을 보였습니다.' },
          { title: '같은 색만 찾아 스스로 이동하기', body: '여러 패드를 배치했을 때 같은 색의 위치를 찾아 자신만의 이동 경로를 만들었습니다.' },
          { title: '다음 화면을 기다리고 먼저 준비하기', body: '반복을 통해 활동 구조에 익숙해지면서 다음 자극을 기다리고 움직임을 준비했습니다.' },
        ],
        images: [
          { src: '/spokedu/programs/spomove/assets/spe/spe-07.webp', alt: '색 패드에 도착한 뒤 몸을 움직이며 춤추는 실제 수업 장면', caption: '도착 후 자연스럽게 이어지는 표현 움직임' },
          { src: '/spokedu/programs/spomove/assets/spe/spe-09.webp', alt: '여러 개의 색 패드를 오가며 움직이는 실제 수업 장면', caption: '같은 색을 찾아 스스로 이동하는 장면' },
          { src: '/spokedu/programs/spomove/assets/spe/spe-10.webp', alt: '교사의 안내에 따라 화면에 시선을 두고 다음 신호를 기다리는 실제 수업 장면', caption: '다음 화면을 기다리고 준비하는 모습' },
        ],
      },
      {
        eyebrow: 'INDIVIDUALIZED OPERATION',
        title: '아동과 기관에 맞춰 커스터마이징합니다.',
        lead:
          '수업 전 MOVE 리포트와 담당자 협의를 통해 참여 아동의 선호 활동, 반응 수준, 지원 필요를 확인하고 장애 특성과 기관 환경에 맞는 SPOMOVE, 기본 움직임, 교구 활동을 설계합니다.',
        cards: [
          { title: '커스터마이징 방식', body: 'MOVE 리포트 기반으로 사전 선호와 반응 특성을 파악하고, 사후 리포트와 수업 기록을 통해 단계별 커리큘럼을 조정합니다.' },
          { title: '현장 적용 경험', body: '서울시청 지원사업 찾아가는 동행 체육교실, 특수학교, 장애인복지관, 가족지원기관, 농아인복지관 등 다양한 현장에서 적용했습니다.' },
        ],
        images: [
          { src: '/spokedu/programs/spomove/assets/spe/spe-11.webp', alt: 'MOVE 리포트 커스터마이징 안내 이미지', caption: 'MOVE 리포트 기반 커스터마이징' },
          { src: '/spokedu/programs/spomove/assets/spe/spe-12.webp', alt: 'SPOMOVE 수업 후 참여 아동과 함께 촬영한 단체 사진', caption: '특수체육 현장 적용 경험' },
        ],
      },
    ],
  },
  {
    id: 'catalog',
    label: '공식 카탈로그',
    description: '도입 검토에 필요한 프로그램 구조, 난이도, DIVE, 스포매트, 구독과 가격 정보를 카탈로그 형식으로 정리합니다.',
    sections: [
      {
        eyebrow: 'WHAT IS SPOMOVE',
        title: '따라 하는 영상이 아니라 판단하고 움직이는 수업입니다.',
        lead:
          '화면에서 제공하는 것은 자극이고, 참여자가 수행하는 것은 반응입니다. 시각 정보가 실제 움직임으로 이어지는 과정에서 반응속도뿐 아니라 선택, 주의, 억제, 기억을 단계적으로 경험할 수 있습니다.',
        cards: [
          { title: '자극을 확인하고', body: '화면에 제시된 색상과 수행 정보를 확인합니다.' },
          { title: '올바른 반응을 선택하고', body: '현재 규칙에 맞는 목표자극, 위치, 방향, 신체 부위를 고릅니다.' },
          { title: '움직임으로 수행합니다', body: '점프, 이동, 손·발 동작과 교구 미션으로 반응을 완성합니다.' },
        ],
      },
      {
        eyebrow: 'HOW IT WORKS',
        title: '선택부터 수행까지, 수업 흐름이 단순합니다.',
        tone: 'blue',
        cards: [
          { eyebrow: 'STEP 01', title: '콘텐츠 선택', body: '반응 영역, 프로그램, 난이도와 수업 목적에 맞는 콘텐츠를 선택합니다.' },
          { eyebrow: 'STEP 02', title: '수업 설정', body: '권장 속도를 확인하고 화면 제시시간과 수행 동작을 참여자 수준에 맞게 조절합니다.' },
          { eyebrow: 'STEP 03', title: '화면 출력', body: '빔프로젝터, 전자칠판, 대형 모니터 등 수업 환경에 맞는 화면으로 출력합니다.' },
          { eyebrow: 'STEP 04', title: '실제 움직임', body: '참여자는 화면의 정보를 보고 선택한 뒤 점프, 이동, 손·발 동작 등으로 수행합니다.' },
        ],
      },
      {
        eyebrow: 'PROGRAM ARCHITECTURE',
        title: '반응의 복잡성에 따라 프로그램을 구분합니다.',
        tone: 'navy',
        cards: responseStages,
      },
      {
        eyebrow: 'RESPONSE PROGRAMS',
        title: '같은 반응이라도 요구되는 판단은 다릅니다.',
        cards: [
          { eyebrow: 'SIMPLE RESPONSE', title: '단순반응', body: '한 가지 자극과 정해진 대응을 연결해 화면을 확인하고 움직임을 시작하는 기본 영역입니다.', note: '자극 확인 → 정해진 반응 → 움직임 수행' },
          { eyebrow: 'CHOICE RESPONSE', title: '선택반응', body: '동시에 제시되는 여러 정보 중 목표를 고르고 방해자극과 자동적인 반응을 조절합니다.', note: '목표 확인 → 방해정보 구분 → 올바른 반응 선택' },
          { eyebrow: 'COMPLEX RESPONSE', title: '복합반응', body: '화면의 의미와 규칙을 기억하고, 익숙한 반응을 억제하거나 여러 정보를 순서대로 처리합니다.', note: '규칙 확인 → 기억·억제 → 복합 움직임 수행' },
        ],
      },
      {
        eyebrow: 'VISUAL STIMULUS TYPES',
        title: '화면의 자극은 여러 방식으로 제시됩니다.',
        lead:
          '자극 제시 유형은 화면이 정보를 보여주는 형식입니다. 실제 프로그램에서는 반응 영역과 수행 규칙에 맞춰 각 유형을 선택해 사용합니다.',
        cards: [
          { title: '색상 자극', body: '단일 색상, 복수 색상, 사분할 색상 등으로 색과 위치를 함께 인식합니다.' },
          { title: '방향 자극', body: '화살표와 이동 방향 정보를 확인하고 같은 방향 또는 반대 방향으로 반응합니다.' },
          { title: '형태·이미지 자극', body: '친숙한 이미지에서 대표 색을 연상하거나 특정 형태를 목표로 선택합니다.' },
          { title: '타이밍 자극', body: '등장 시간, 간격, 흐름 속도에 맞춰 반응의 시작과 정지를 조절합니다.' },
        ],
      },
      {
        eyebrow: 'DIFFICULTY & SPEED',
        title: '쉽게 선택하고, 세밀하게 조절합니다.',
        tone: 'blue',
        lead:
          '콘텐츠는 자극의 구조와 판단 요구량을 기준으로 쉬움, 보통, 어려움으로 분류합니다. 실제 수업 난이도는 화면 제시시간과 반복 간격에 따라 달라집니다.',
        cards: [
          { eyebrow: 'EASY', title: '보고 바로 움직이기', body: '화살표 방향이나 단일 색상처럼 한 가지 정보를 확인하고 정해진 방식으로 수행합니다.' },
          { eyebrow: 'NORMAL', title: '자극을 보고 결정하기', body: '전면 2패널 색상자극처럼 두 색상을 확인하고 양발로 각각 수행합니다.' },
          { eyebrow: 'HARD', title: '여러 규칙을 함께 처리하기', body: '변형 사분할 자극처럼 색상과 손·발 수행 정보를 함께 확인하고 신체 부위를 구분합니다.' },
          { eyebrow: 'DISPLAY TIME', title: '같은 콘텐츠도 속도에 따라 달라집니다', body: '3초로 운영하면 충분히 확인하는 쉬운 활동이 되지만, 1초로 줄이면 빠른 판단과 반응이 필요한 활동이 됩니다.' },
        ],
      },
      {
        eyebrow: 'IMMERSION / DIVE MODE',
        title: '패드 위 반응을 넘어, 화면 속 상황으로 들어갑니다.',
        tone: 'navy',
        lead:
          'DIVE는 단순반응, 선택반응, 복합반응의 상위 난이도가 아니라 별도로 구성된 3D 몰입형 전신활동 프로그램입니다.',
        cards: [
          { title: '달리기', body: '화면 속 이동 상황에 맞춰 전신으로 반응합니다.' },
          { title: '피하기', body: '장애물과 경로를 확인하고 몸의 방향과 위치를 조절합니다.' },
          { title: '숙이기', body: '상황에 따라 몸을 낮추며 반응 폭을 확장합니다.' },
          { title: '점프', body: '타이밍과 공간 정보를 연결해 전신 점프를 수행합니다.' },
        ],
        footnote: 'DIVE는 4색 스포매트가 없어도 진행 가능한 별도 프로그램입니다.',
      },
      {
        eyebrow: 'SPOMOVE PLAY ACTIVITIES',
        title: '프로그램을 활용해 놀이체육으로 확장합니다.',
        cards: [
          { title: '스포매트 필수 활동', body: '색상과 위치를 실제 스포매트에서 정확하게 수행한 뒤 교구 미션으로 연결합니다.' },
          { title: '스포매트 권장 활동', body: '스포매트가 있으면 공간 구분과 활동 운영이 효율적이지만 다른 색 마커로도 변형할 수 있습니다.' },
          { title: '매트 없이 가능한 활동', body: '방향, 형태, 타이밍 등의 화면 정보를 활용해 이동, 타격, 던지기, 협동 활동으로 확장합니다.' },
        ],
      },
      {
        eyebrow: 'SPO-MAT',
        title: '화면의 색과 위치를 바닥의 움직임으로 연결합니다.',
        lead:
          '스포매트는 스포무브를 가장 직관적이고 효율적으로 활용할 수 있게 돕는 대표 권장 교구입니다. 다만 모든 스포무브 프로그램에 반드시 필요한 것은 아닙니다.',
        tone: 'blue',
        cards: [
          { title: '규격', body: '60 x 60cm' },
          { title: '형태', body: '2 x 2 카펫형 컬러패드' },
          { title: '색 배치', body: '빨강, 노랑, 초록, 파랑' },
          { title: '활용', body: '점프, 이동, 손발 동작' },
        ],
      },
      {
        eyebrow: 'SUBSCRIPTION & PRICE',
        title: '필요한 수업 범위에 따라 구독과 스포매트를 선택합니다.',
        cards: [
          { eyebrow: 'FREE', title: '무료 이용자', body: '홈 화면 이번 주 추천 활동 1개와 기본 수업도구를 별도 구독 없이 이용합니다.', note: '0원' },
          { eyebrow: 'LIGHT', title: '라이트', body: '놀이체육 144개, 매월 추가 놀이체육 업데이트, 수업 기록 작성을 사용하는 기본 구독입니다.', note: '9,900원 / 1개월 · 108,900원 / 12개월' },
          { eyebrow: 'PREMIUM', title: '프리미엄', body: '라이트의 모든 기능과 SPOMOVE 전체 프로그램, 권장 난이도, 화면 제시시간 설정, 활용 놀이체육을 제공합니다.', note: '28,900원 / 1개월 · 289,000원 / 12개월' },
          { eyebrow: 'SPO-MAT', title: '스포매트 구매', body: '화면과 실제 움직임을 직관적으로 연결하는 대표 권장 교구입니다.', note: '단품 20,900원 · 프리미엄 이용 시 15,900원' },
        ],
        footnote: '스포매트 대량 구매는 수량과 이용 규모에 따라 별도 협의 후 진행됩니다.',
      },
    ],
  },
];

function getActiveTab(id: string | null) {
  return tabs.find((tab) => tab.id === id) ?? tabs[0];
}

export default function SpomoveCatalogTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = getActiveTab(searchParams.get('tab'));

  const setActiveTab = (id: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'education') params.delete('tab');
    else params.set('tab', id);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-10 sm:gap-12 sm:pb-14 lg:gap-16">
      <Hero />

      <CommonFoundation />

      <nav
        className="sticky top-[calc(3.75rem+env(safe-area-inset-top,0px))] z-30 -mx-5 border-y border-[#DCE3EE] bg-[#F5F7FB]/95 px-5 py-3 backdrop-blur-md sm:top-[calc(4.25rem+env(safe-area-inset-top,0px))] sm:-mx-8 sm:px-8"
        aria-label="SPOMOVE 자료 탭"
      >
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-1.5 rounded-full border border-[#DCE3EE] bg-white p-1.5 shadow-sm shadow-slate-900/[0.04]" role="tablist">
          {tabs.map((tab) => {
            const selected = tab.id === active.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="spomove-tab-panel"
                onClick={() => setActiveTab(tab.id)}
                className={`${brandFocusRing} min-h-11 rounded-full px-2 text-sm font-bold transition sm:px-4 ${
                  selected ? 'bg-[#0B1F46] text-white shadow-sm' : 'text-[#536279] hover:bg-[#F5F7FB] hover:text-[#0B1F46]'
                } ${koreanText}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <section id="spomove-tab-panel" role="tabpanel" className="scroll-mt-32 space-y-8 sm:space-y-10">
        <div className="rounded-[1.5rem] border border-[#DCE3EE] bg-white p-6 sm:p-8">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#245DFF]">CURRENT TAB</p>
          <h2 className={`mt-2 text-3xl font-black tracking-[-0.04em] text-[#14213A] ${koreanText}`}>{active.label}</h2>
          <p className={`mt-3 max-w-3xl text-base leading-[1.75] text-[#536279] ${koreanText}`}>{active.description}</p>
        </div>

        {active.sections.map((section) => (
          <Section key={`${active.id}-${section.eyebrow}`} section={section} />
        ))}

        <FinalCta activeLabel={active.label} />
      </section>
    </div>
  );
}

function Hero() {
  return (
    <section className="grid gap-7 rounded-[1.5rem] border border-[#DCE3EE] bg-white p-5 shadow-[0_18px_50px_rgba(15,33,70,0.06)] sm:p-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:p-8">
      <div>
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#245DFF]">SPOKEDU · SPOMOVE</p>
        <h1 className={`mt-4 text-[2.35rem] font-black leading-[1.04] tracking-[-0.055em] text-[#14213A] sm:text-[3.5rem] lg:text-[4.25rem] ${koreanText}`}>
          화면의 정보를 실제 움직임으로.
        </h1>
        <p className={`mt-5 max-w-2xl text-base leading-[1.78] text-[#536279] sm:text-[17px] ${koreanText}`}>
          SPOMOVE는 화면의 색, 위치, 방향, 순서 정보를 4색 패드와 신체 움직임으로 연결하는 스크린 기반 체육교육 프로그램입니다. 따라 하는 영상이 아니라, 보고 판단하고 움직이는 수업 구조를 만듭니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {['4색 패드', '시지각 반응', '선택과 억제', 'DIVE', '교구 확장'].map((chip) => (
            <span key={chip} className="rounded-full border border-[#DCE3EE] bg-[#F5F7FB] px-3 py-1.5 text-xs font-bold text-[#425069]">
              {chip}
            </span>
          ))}
        </div>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <Link
            href={CONTACT_HREF}
            data-track="contact"
            data-track-label="program-spomove-hero-contact"
            className={`${brandFocusRing} inline-flex min-h-12 items-center justify-center rounded-full bg-[#245DFF] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(36,93,255,0.22)] transition hover:bg-[#174BE6]`}
          >
            수업 문의하기
          </Link>
          <button
            type="button"
            onClick={() => document.getElementById('spomove-tab-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className={`${brandFocusRing} inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCE3EE] bg-white px-6 py-3 text-sm font-bold text-[#0B1F46] transition hover:bg-[#F5F7FB]`}
          >
            상세 자료 보기
          </button>
        </div>
      </div>

      <figure className="relative overflow-hidden rounded-[1.25rem] border border-[#DCE3EE] bg-[#EEF2F7]">
        <div className="relative aspect-[16/9]">
          <Image
            src="/spokedu/programs/spomove/assets/edu/edu-01.webp"
            alt="아이들이 네 장의 4색 패드 위에서 활동하는 SPOMOVE 메인 포스터"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 44rem"
            className="object-contain"
          />
        </div>
      </figure>
    </section>
  );
}

function CommonFoundation() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <Section
        section={{
          eyebrow: 'COMMON FOUNDATION',
          title: '공통 개념은 하나로 묶고, 탭에서는 관점별로 깊게 들어갑니다.',
          lead:
            '교육 소개, 특수체육, 공식 카탈로그가 반복해서 설명하던 기본 구조는 공통부로 빼냈습니다. 탭에서는 이 공통 구조를 바탕으로 교육 설계, 특수체육 적용, 도입 검토 정보를 각각 자세히 다룹니다.',
          tone: 'blue',
          cards: [
            { title: '화면 자극', body: '색, 위치, 방향, 형태, 이미지, 속도와 같은 정보를 화면에서 제시합니다.' },
            { title: '반응 선택', body: '참여자는 현재 규칙에 맞는 목표 정보를 고르고 방해 정보를 구분합니다.' },
            { title: '신체 수행', body: '선택한 반응을 이동, 점프, 터치, 방향 전환, 교구 조작으로 수행합니다.' },
            { title: '수업 조절', body: '속도, 반복 횟수, 제시 시간, 자극 간격, 규칙 수를 참여자 수준에 맞게 조정합니다.' },
          ],
        }}
      />

      <Section
        section={{
          eyebrow: 'RESPONSE ARCHITECTURE',
          title: '반응의 수준을 네 가지 영역으로 설계합니다.',
          lead:
            'SPOMOVE는 여러 게임을 단순히 모아 놓은 프로그램이 아닙니다. 하나의 자극에 바로 움직이는 단계부터 규칙, 억제, 기억이 필요한 과제와 몰입형 움직임까지 체계적으로 확장합니다.',
          tone: 'navy',
          cards: responseStages,
        }}
      />

      <Section
        section={{
          eyebrow: 'COGNITIVE TASKS',
          title: '일부러 헷갈리게 만들고, 알맞은 반응을 선택하게 합니다.',
          lead:
            '선택·복합 반응에서는 색, 위치, 방향, 글자처럼 서로 다른 정보가 일치하거나 충돌하도록 설계합니다. 아이는 눈에 먼저 들어오는 정보에 그대로 반응하지 않고 현재 규칙에 필요한 정보만 선택해 움직여야 합니다.',
          cards: cognitiveTasks,
        }}
      />

      <Section
        section={{
          eyebrow: 'MOVEMENT CONNECTION',
          title: '인지 과제는 실제 움직임 기술로 완성됩니다.',
          lead:
            '화면에서 정답을 찾는 것만으로는 끝나지 않습니다. 선택한 반응을 몸으로 정확히 실행해야 SPOMOVE의 과제가 완성됩니다.',
          cards: movementSkills,
          images: [
            { src: '/spokedu/programs/spomove/assets/edu/edu-12.webp', alt: '바나나 이미지를 보며 움직임으로 반응하는 아동들', caption: '친숙한 이미지와 움직임 반응의 연결' },
            { src: '/spokedu/programs/spomove/assets/edu/edu-13.webp', alt: '캐릭터 화면을 보며 4색 패드 위에서 참여하는 아동들', caption: '테마 화면을 활용한 참여 유도' },
          ],
        }}
      />
    </div>
  );
}

function Section({ section }: { section: SectionBlock }) {
  const dark = section.tone === 'navy';
  const blue = section.tone === 'blue';
  const paper = section.tone === 'paper';
  const shell = dark
    ? 'bg-[#0B1F46] text-white'
    : blue
      ? 'border border-[#DBE6FB] bg-[linear-gradient(180deg,#EEF4FF_0%,#F7F9FD_100%)] text-[#14213A]'
      : paper
        ? 'border border-[#DCE3EE] bg-[#F5F7FB] text-[#14213A]'
        : 'border border-[#DCE3EE] bg-white text-[#14213A]';
  const cards = section.cards ?? [];

  return (
    <section className={`rounded-[1.5rem] p-6 sm:p-8 lg:p-10 ${shell}`}>
      <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <div>
          <p className={`text-[12px] font-bold uppercase tracking-[0.16em] ${dark ? 'text-[#9FC0FF]' : 'text-[#245DFF]'}`}>{section.eyebrow}</p>
          <h2 className={`mt-3 text-2xl font-black leading-[1.14] tracking-[-0.04em] sm:text-4xl lg:text-[2.7rem] ${koreanText}`}>
            {section.title}
          </h2>
        </div>
        {section.lead ? (
          <p className={`max-w-3xl text-sm leading-[1.8] sm:text-base ${dark ? 'text-[#CFDAEA]' : 'text-[#536279]'} ${koreanText}`}>
            {section.lead}
          </p>
        ) : null}
      </div>

      {cards.length > 0 ? (
        <div className={`mt-7 grid gap-3 ${cards.length === 5 ? 'md:grid-cols-2 xl:grid-cols-5' : cards.length === 3 ? 'lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
          {cards.map((card) => (
            <article
              key={`${section.eyebrow}-${card.title}`}
              className={`flex min-h-[13rem] flex-col rounded-[1.1rem] p-5 ${
                dark ? 'border border-white/14 bg-white/[0.075]' : 'border border-[#DCE3EE] bg-white shadow-sm shadow-slate-900/[0.03]'
              }`}
            >
              {card.eyebrow ? (
                <p className={`text-xs font-black uppercase tracking-[0.08em] ${dark ? 'text-[#9FC0FF]' : 'text-[#245DFF]'}`}>{card.eyebrow}</p>
              ) : null}
              <h3 className={`mt-3 text-xl font-black leading-snug tracking-[-0.03em] ${dark ? 'text-white' : 'text-[#14213A]'} ${koreanText}`}>{card.title}</h3>
              <p className={`mt-3 text-sm leading-[1.72] ${dark ? 'text-[#CFDAEA]' : 'text-[#536279]'} ${koreanText}`}>{card.body}</p>
              {card.note ? (
                <p className={`mt-auto pt-5 text-xs font-bold leading-relaxed ${dark ? 'text-white' : 'text-[#0B1F46]'} ${koreanText}`}>{card.note}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {section.images ? <ImageGrid images={section.images} dark={dark} /> : null}

      {section.footnote ? (
        <p className={`mt-5 rounded-[1rem] px-4 py-3 text-sm font-bold leading-relaxed ${dark ? 'bg-white/10 text-[#E7EEF8]' : 'bg-white text-[#0B1F46]'} ${koreanText}`}>
          {section.footnote}
        </p>
      ) : null}
    </section>
  );
}

function ImageGrid({ images, dark }: { images: ImageItem[]; dark: boolean }) {
  return (
    <div className={`mt-7 grid gap-3 ${images.length === 1 ? 'max-w-xl' : images.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
      {images.map((image) => (
        <figure key={image.src} className={`overflow-hidden rounded-[1.1rem] border ${dark ? 'border-white/15 bg-white/10' : 'border-[#DCE3EE] bg-white'}`}>
          <div className="relative aspect-[4/3] bg-[#EEF2F7]">
            <Image src={image.src} alt={image.alt} fill sizes="(max-width: 1024px) 100vw, 24rem" className="object-cover" />
          </div>
          <figcaption className={`px-4 py-3 text-sm font-bold leading-snug ${dark ? 'text-white' : 'text-[#14213A]'} ${koreanText}`}>{image.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function FinalCta({ activeLabel }: { activeLabel: string }) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[#D6E3FF] bg-white shadow-[0_18px_50px_rgba(15,33,70,0.07)]">
      <div className="h-1.5 w-full bg-[#0B1F46]" aria-hidden />
      <div className="grid gap-6 px-6 py-7 sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-10">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#245DFF]">SPOMOVE BY SPOKEDU</p>
          <h2 className={`mt-3 text-2xl font-black leading-[1.14] tracking-[-0.04em] text-[#0B1F46] sm:text-4xl ${koreanText}`}>
            {activeLabel} 자료를 바탕으로 기관에 맞는 수업 형태를 설계합니다.
          </h2>
          <p className={`mt-4 max-w-2xl text-sm leading-[1.75] text-[#536279] sm:text-base ${koreanText}`}>
            공간, 인원, 대상 연령, 반응 수준, 수업 목적을 확인한 뒤 SPOMOVE 콘텐츠, 기본 움직임, 교구 활동, 스포매트 구성을 함께 제안합니다.
          </p>
        </div>
        <Link
          href={CONTACT_HREF}
          data-track="contact"
          data-track-label="program-spomove-final-contact"
          className={`${brandFocusRing} inline-flex min-h-12 items-center justify-center rounded-full bg-[#245DFF] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(36,93,255,0.22)] transition hover:bg-[#174BE6]`}
        >
          수업 문의하기
        </Link>
      </div>
    </section>
  );
}
