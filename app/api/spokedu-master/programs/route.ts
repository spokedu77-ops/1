import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import type { Program } from '@/app/spokedu-master/types';
import { pickBestHeroUrl } from '@/app/spokedu-master/lib/program-visual';
import {
  applyTrustedReferenceVideo,
  resolveTrustedReferenceVideoUrl,
} from '@/app/spokedu-master/lib/verified-program-video';

const FALLBACK_COLORS: [string, string, string, string][] = [
  ['#312e81', '#3730a3', '#4338ca', '#4f46e5'],
  ['#064e3b', '#047857', '#16a34a', '#86efac'],
  ['#713f12', '#92400e', '#b45309', '#d97706'],
  ['#1e1b4b', '#2d2a6e', '#3730a3', '#6366f1'],
  ['#1c1917', '#292524', '#44403c', '#78716c'],
];

const CATEGORY_COLORS: Record<string, [string, string, string, string]> = {
  경쟁형: ['#111827', '#1d4ed8', '#f97316', '#facc15'],
  민첩성: ['#1e1035', '#312e81', '#4338ca', '#818cf8'],
  '반응 속도': ['#1c0a2e', '#4c1d95', '#7c3aed', '#a78bfa'],
  협동: ['#052e16', '#065f46', '#059669', '#34d399'],
  협응력: ['#0c2a4a', '#0369a1', '#0ea5e9', '#7dd3fc'],
  균형: ['#052e16', '#14532d', '#16a34a', '#86efac'],
  표현활동: ['#3f0000', '#7f1d1d', '#be123c', '#fb7185'],
  집중력: ['#1a1333', '#3730a3', '#6366f1', '#c7d2fe'],
};

function categoryToColors(category: string): [string, string, string, string] {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = ((hash << 5) - hash + category.charCodeAt(i)) | 0;
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  return match?.[1] ?? null;
}

const INVALID_VIDEO_VALUES = new Set(['', '-', '0', '123', 'none', 'null', 'undefined', '없음', '영상없음']);

function normalizeVideoUrl(value: string | null | undefined): string | undefined {
  const text = (value ?? '').trim();
  if (!text || INVALID_VIDEO_VALUES.has(text.toLowerCase().replace(/\s+/g, ''))) return undefined;

  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? text : undefined;
  } catch {
    return undefined;
  }
}

function buildThumbnailUrl(videoUrl: string | null | undefined): string | undefined {
  const normalized = normalizeVideoUrl(videoUrl);
  if (!normalized) return undefined;
  const id = extractYouTubeId(normalized);
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : undefined;
}

function inferRelatedSpomoveIds(input: { title: string; category: string; tags: string[]; description: string; steps: string[] }): string[] {
  const text = [input.title, input.category, input.description, ...input.tags, ...input.steps].join(' ');
  const hasExplicitScreenCue = /SPOMOVE|스포무브|화면 활동|화면 신호|색 신호|출발 신호/i.test(text);

  if (/펀스틱|펜싱|fencing|funstick|찌르기|상대|거리|타이밍/i.test(text)) return ['reactTrain', 'simon'];
  if (hasExplicitScreenCue && /민첩|스피드|반응|출발|방향|전환|순발|사다리|스프린트/i.test(text)) return ['reactTrain', 'basic'];
  if (hasExplicitScreenCue && /균형|자세|밸런스|멈춤|정지|중심/i.test(text)) return ['gonogo'];
  if (hasExplicitScreenCue && /리듬|박자|표현|음악|거울|패턴 전환/i.test(text)) return ['flow'];

  return [];
}

function normalizeSpomoveIds(ids: string[]): string[] {
  const legacyMap: Record<string, string[]> = {
    'SR-05': ['reactTrain'],
    'SR-06': ['basic'],
    'RS-05': ['basic', 'taskswitch'],
    'IC-05': ['gonogo'],
    'RC-05': ['flow'],
    'SM-05': ['spatial'],
    'SM-06': ['stroop'],
  };
  return [...new Set(ids.flatMap((id) => legacyMap[id] ?? [id]))].slice(0, 3);
}

function inferFocus(program: Program) {
  const text = [program.title, program.category, program.description, ...program.tags].join(' ');
  if (/펀스틱|펜싱|경쟁|상대|타이밍|거리/.test(text)) return '거리 판단 / 반응 타이밍 / 균형 유지 / 스포츠맨십';
  if (/민첩|순발|방향|전환|스피드/.test(text)) return '민첩성 / 방향 전환 / 시각 신호 반응';
  if (/협동|팀|릴레이|역할/.test(text)) return '협동성 / 출발 반응 / 역할 수행';
  if (/균형|자세|중심|멈춤/.test(text)) return '균형 감각 / 자세 조절 / 충동 조절';
  if (/리듬|표현|박자|음악/.test(text)) return '리듬 감각 / 표현 움직임 / 신체 협응';
  return '신체 협응 / 집중력 / 참여 경험';
}

function inferObjective(program: Program) {
  const focus = inferFocus(program);
  return `${program.title} 활동을 통해 ${focus}을(를) 놀이 흐름 안에서 경험합니다.`;
}

function buildParentNote(program: Program) {
  const focus = inferFocus(program);
  return `오늘은 "${program.title}" 활동으로 ${focus}을(를) 연습했습니다. 아이들이 규칙을 이해하고, 몸을 조절하며, 친구들과 함께 움직이는 경험을 했습니다.`;
}

function buildContentQuality(program: Program): Program {
  const detail = program.lessonDetail;
  if (!detail) return program;

  const rules = detail.rules?.length ? detail.rules : program.steps;
  const relatedSpomoveIds = detail.relatedSpomoveIds.length
    ? normalizeSpomoveIds(detail.relatedSpomoveIds)
    : inferRelatedSpomoveIds({
      title: program.title,
      category: program.category,
      tags: program.tags,
      description: program.description,
      steps: program.steps,
    });

  return {
    ...program,
    description: program.description || detail.objective || inferObjective(program),
    tags: [...new Set([...program.tags, ...(relatedSpomoveIds.length > 0 ? ['SPOMOVE'] : [])])],
    lessonDetail: {
      ...detail,
      recommendedAge: detail.recommendedAge || program.grade || '대상 확인 필요',
      recommendedPlayers: detail.recommendedPlayers || '현장 규모에 맞게 조정',
      objective: detail.objective || inferObjective(program),
      developmentFocus: detail.developmentFocus || inferFocus(program),
      coachScript:
        detail.coachScript ||
        `${program.title}은(는) 속도보다 규칙 이해와 안전한 움직임을 먼저 잡는 것이 중요합니다. 첫 라운드는 천천히 진행하고, 이후 움직임 정확도와 참여 밀도를 올립니다.`,
      parentNote: detail.parentNote || buildParentNote(program),
      fieldTips: detail.fieldTips.length > 0 ? detail.fieldTips : [
        '첫 라운드는 성공 경험을 만드는 데 집중합니다.',
        '대기 학생에게 관찰 역할을 주면 참여 밀도가 유지됩니다.',
      ],
      variations: detail.variations.length > 0 ? detail.variations : [
        '초급: 이동 거리와 제한 시간을 줄입니다.',
        '중급: 역할이나 이동 조건을 추가해 판단 요소를 늘립니다.',
        '고급: 팀전 또는 라운드제로 확장합니다.',
      ],
      safetyNotes: detail.safetyNotes.length > 0 ? detail.safetyNotes : [
        '시작 전 이동 방향과 안전 구역을 먼저 안내합니다.',
        '충돌을 막기 위해 출발 간격과 대기 위치를 분리합니다.',
      ],
      relatedSpomoveIds,
      briefingNotes: detail.briefingNotes?.length ? detail.briefingNotes : [
        '오늘 활동의 목표와 성공 기준을 30초 안에 안내합니다.',
        relatedSpomoveIds.length > 0 ? '화면 활동을 사용할 구간과 멈춤 기준을 미리 정합니다.' : '활동 중 관찰할 움직임 포인트를 먼저 정합니다.',
      ],
      rules: rules.length > 0 ? rules : [
        '활동 구역과 대기 구역을 나눕니다.',
        '시범을 한 번 보여준 뒤 짧은 라운드로 시작합니다.',
        '라운드가 끝나면 성공 기준과 안전 규칙을 다시 확인합니다.',
      ],
      setupNotes: detail.setupNotes?.length ? detail.setupNotes : [
        '시작선과 반환 지점을 명확히 표시합니다.',
        '대기 학생이 활동 구역 안으로 들어오지 않도록 위치를 분리합니다.',
      ],
    },
  };
}

function applyPremiumContentOverlay(program: Program): Program {
  return program;

  const key = [program.title, program.category, program.description, ...program.tags].join(' ').toLowerCase();
  if (!/(펀스틱|funstick|펜싱|fencing)/i.test(key)) return program;

  const rules = [
    '두 명이 안전거리를 두고 마주 선 뒤, 펀스틱은 전방 목표물 쪽으로만 향하게 합니다.',
    '한 손에는 펀스틱, 다른 손에는 라바콘과 공을 든 상태로 균형을 유지합니다.',
    '상대의 공을 정확히 찌르면 1점, 자신의 공을 떨어뜨리거나 안전선을 넘으면 공격권을 넘깁니다.',
    '1라운드는 30초로 짧게 운영하고, 라운드 사이에 공격 거리와 방어 자세를 바로 피드백합니다.',
  ];
  const current = program.lessonDetail;

  return {
    ...program,
    title: '펀스틱 펜싱 Funstick Fencing',
    category: '경쟁형',
    grade: '초등 3학년 이상',
    duration: program.duration || 20,
    space: '실내 체육관 · 넓은 활동 공간',
    description:
      '부드러운 펀스틱으로 상대의 목표물을 겨냥하며 거리 판단, 타이밍, 균형 유지, 공격·방어 전환을 익히는 경쟁형 놀이체육 프로그램입니다.',
    steps: rules,
    equipment: ['펀스틱 2개', '라바콘 2개', '공 2개', '접시콘 12~15개'],
    tags: [...new Set(['경쟁형', '민첩성', '순발력', '거리 판단', '타이밍', 'SPOMOVE 연계', ...program.tags])],
    colors: ['#111827', '#1d4ed8', '#f97316', '#facc15'],
    isHot: true,
    thumbnailUrl: '/images/spokedu-master/programs/funstick-fencing/hero.jpeg',
    lessonDetail: {
      recommendedAge: '초등 3학년 이상',
      recommendedPlayers: '2명씩 페어 · 6~20명 순환 운영',
      objective: '거리 판단, 반응 타이밍, 균형 유지, 공격·방어 전환을 안전한 경쟁 놀이로 경험합니다.',
      developmentFocus: '민첩성 / 협응력 / 집중력 / 스포츠맨십',
      coachScript:
        current?.coachScript ||
        '오늘은 세게 찌르는 수업이 아니라, 거리와 타이밍을 읽는 수업입니다. 상대 공을 보되 몸이 앞으로 쏠리지 않게 균형을 먼저 잡아주세요.',
      parentNote:
        current?.parentNote ||
        '오늘은 펀스틱 펜싱 활동으로 거리 판단과 반응 타이밍을 연습했습니다. 아이들이 규칙을 지키며 경쟁하고, 공격과 방어를 번갈아 경험했습니다.',
      fieldTips: [
        '처음 1라운드는 득점보다 안전거리와 자세를 확인하는 데 씁니다.',
        '공격이 과격해지면 "천천히 정확하게" 라운드로 전환합니다.',
        '대기 학생에게 관찰 역할을 주면 수업 밀도가 떨어지지 않습니다.',
        ...(current?.fieldTips ?? []),
      ],
      variations: [
        '초급: 정지 상태에서 목표물 찌르기만 진행합니다.',
        '중급: 발을 한 번만 이동할 수 있게 제한합니다.',
        '고급: SPOMOVE 신호에 맞춰 공격권 또는 이동 방향을 바꿉니다.',
      ],
      safetyNotes: [
        '얼굴과 목 방향으로 펀스틱을 들지 않도록 시작 전에 금지선을 명확히 안내합니다.',
        '접시콘으로 경기 구역을 넓게 표시하고, 대기 학생은 구역 밖에서 기다립니다.',
        '펀스틱은 휘두르지 않고 목표물을 향해 "밀어 찌르기"로만 사용합니다.',
      ],
      relatedSpomoveIds:
        (current?.relatedSpomoveIds?.length ?? 0) > 0 ? normalizeSpomoveIds(current?.relatedSpomoveIds ?? []) : ['reactTrain', 'simon'],
      videoUrl: normalizeVideoUrl(current?.videoUrl),
      heroImageUrl: current?.heroImageUrl,
      setupImageUrl: current?.setupImageUrl,
      galleryImageUrls: current?.galleryImageUrls ?? [],
      briefingNotes: [
        '구독자가 모달을 열자마자 활동 가치, 준비물, 안전 기준, 실행 순서를 한 번에 판단할 수 있어야 합니다.',
        '현장 사진은 신뢰를 만들고, 배치도는 수업 직전 준비 시간을 줄이는 역할을 합니다.',
      ],
      rules,
      setupNotes: [
        '접시콘으로 직사각형 경기장을 만들고, 중앙에 두 명이 마주 보는 시작선을 둡니다.',
        '각 학생은 라바콘 위 공을 들고, 상대는 펀스틱으로 공만 겨냥합니다.',
        '대기자는 측면 안전 구역에서 다음 라운드를 준비합니다.',
      ],
    },
  };
}

function hasBrokenText(value: string | null | undefined) {
  if (!value) return false;
  return value.includes(String.fromCharCode(0xfffd)) || /怨|諛|吏|媛|蹂|鍮|湲|醫|嫄|珥|諛|湲|由|誘/.test(value);
}

function cleanText(value: string | null | undefined, fallback: string) {
  const text = (value ?? '').trim();
  if (!text || hasBrokenText(text)) return fallback;
  return text;
}

function cleanList(items: string[] | null | undefined, fallback: string[]) {
  const cleaned = (items ?? []).map((item) => item.trim()).filter((item) => item && !hasBrokenText(item));
  return cleaned.length > 0 ? cleaned : fallback;
}

function inferCleanCategory(text: string) {
  if (/펀스틱|펜싱|fencing|funstick|민첩|반응|스피드|방향/.test(text)) return '민첩·반응';
  if (/협동|팀|릴레이|관계/.test(text)) return '협동';
  if (/균형|밸런스|자세|정지/.test(text)) return '균형 조절';
  if (/리듬|표현|음악|창의/.test(text)) return '리듬·표현';
  return '일반 체육';
}

function inferCleanFocus(category: string) {
  if (category.includes('민첩')) return '민첩성 / 반응 조절 / 방향 전환';
  if (category.includes('협동')) return '협동성 / 역할 수행 / 팀 커뮤니케이션';
  if (category.includes('균형')) return '균형 감각 / 자세 조절 / 충동 조절';
  if (category.includes('리듬')) return '리듬 감각 / 표현 움직임 / 신체 조절';
  return '신체 조절 / 집중력 / 참여 경험';
}

function cleanFunstickProgram(program: Program): Program {
  return program;

  return {
    ...program,
    title: cleanText(program.title, '펀스틱 활동'),
    category: cleanText(program.category, '민첩·반응'),
    grade: cleanText(program.grade, '대상 확인 필요'),
    duration: program.duration || 20,
    space: '실내 체육관 · 넓은 활동 공간',
    description:
      '부드러운 펀스틱으로 상대의 목표물을 겨냥하며 거리 판단, 타이밍, 균형 조절, 공격·방어 전환을 경험하는 대체 펜싱 프로그램입니다.',
    steps: [
      '두 명이 안전거리를 두고 마주 섭니다. 펀스틱은 얼굴 방향이 아니라 목표물 방향으로만 사용합니다.',
      '한 명은 펀스틱을 들고, 다른 한 명은 라바콘과 공을 들고 균형을 유지합니다.',
      '상대의 공을 정확히 찌르면 1점입니다. 자신의 공을 떨어뜨리거나 안전선을 넘으면 공격권을 넘깁니다.',
      '1라운드는 30초로 짧게 운영하고, 라운드 사이에 거리와 자세를 바로 피드백합니다.',
    ],
    equipment: ['펀스틱 2개', '라바콘 2개', '공 2개', '접시콘 12~15개'],
    tags: ['펜싱', '민첩성', '거리 판단', '타이밍', '균형 조절', 'SPOMOVE 연계'],
    colors: ['#111827', '#1d4ed8', '#f97316', '#facc15'],
    isHot: true,
    thumbnailUrl: '/images/spokedu-master/programs/funstick-fencing/hero.jpeg',
    lessonDetail: {
      recommendedAge: '초등 3학년 이상',
      recommendedPlayers: '2명 페어 · 6~20명 순환 운영',
      objective: '거리 판단, 반응 타이밍, 균형 유지, 공격·방어 전환을 안전한 펜싱 형태로 경험합니다.',
      developmentFocus: '민첩성 / 반응 조절 / 집중력 / 스포츠맨십',
      coachScript:
        '오늘은 세게 찌르는 수업이 아닙니다. 거리를 보고, 타이밍을 읽고, 몸이 앞으로 쏠리지 않게 균형을 잡는 수업입니다.',
      parentNote:
        '오늘은 펀스틱 펜싱 활동으로 거리 판단과 반응 전환을 연습했습니다. 아이들이 규칙을 지키며 공격과 방어를 번갈아 경험했습니다.',
      fieldTips: [
        '처음 1라운드는 점수보다 안전거리와 자세 확인에 집중합니다.',
        '공격이 과격해지면 “천천히, 정확하게” 라운드로 전환합니다.',
        '대기 학생에게 관찰 역할을 주면 수업 집중도가 유지됩니다.',
      ],
      variations: [
        '초급: 정지 상태에서 목표물 찌르기만 진행합니다.',
        '중급: 발을 한 번만 이동할 수 있게 제한합니다.',
        '고급: SPOMOVE 신호에 맞춰 공격권이나 이동 방향을 바꿉니다.',
      ],
      safetyNotes: [
        '얼굴과 목 방향으로 펀스틱이 향하지 않도록 시작 전에 금지선을 명확히 안내합니다.',
        '접시콘으로 경기 구역을 넓게 표시하고 대기 학생은 구역 밖에서 기다립니다.',
        '펀스틱은 휘두르지 않고 목표물을 향한 가벼운 찌르기로만 사용합니다.',
      ],
      relatedSpomoveIds: ['reactTrain', 'simon'],
      videoUrl: normalizeVideoUrl(program.lessonDetail?.videoUrl),
      heroImageUrl: program.lessonDetail?.heroImageUrl,
      setupImageUrl: program.lessonDetail?.setupImageUrl,
      galleryImageUrls: program.lessonDetail?.galleryImageUrls ?? [],
      briefingNotes: [
        '현장 사진은 신뢰를 만들고, 배치도는 수업 직전 준비 시간을 줄입니다.',
        '구독자는 활동 가치, 준비물, 안전 기준, 실행 순서를 한 번에 판단할 수 있어야 합니다.',
      ],
      rules: [
        '목표물은 공으로 제한하고 얼굴·목·몸통은 공격 대상에서 제외합니다.',
        '안전선 밖으로 나가거나 공을 떨어뜨리면 공격권을 넘깁니다.',
        '라운드가 끝나면 서로 인사하고 다음 페어로 교대합니다.',
      ],
      setupNotes: [
        '접시콘으로 직사각형 경기장을 만들고 중앙에 두 명이 마주 보는 시작선을 둡니다.',
        '각 학생은 라바콘과 공을 들고, 상대는 펀스틱으로 공만 겨냥합니다.',
        '대기자는 측면 안전 구역에서 다음 라운드를 준비합니다.',
      ],
    },
  };
}

function normalizeProgramForMaster(program: Program, index: number): Program {
  const identity = `${program.id} ${program.title} ${program.thumbnailUrl ?? ''}`.toLowerCase();
  if (/funstick|fencing|펀스틱|펜싱/.test(identity)) return cleanFunstickProgram(program);

  const title = cleanText(program.title, `수업 패키지 ${index + 1}`);
  const category = cleanText(program.category, inferCleanCategory(`${title} ${program.description} ${program.tags.join(' ')}`));
  const focus = cleanText(program.lessonDetail?.developmentFocus, inferCleanFocus(category));
  const equipment = cleanList(program.equipment, ['현장 기본 도구']);
  const steps = cleanList(program.steps, [
    '공간과 준비물을 확인합니다.',
    '규칙을 짧게 설명하고 시범을 보여줍니다.',
    '기본 라운드로 시작한 뒤 난이도를 단계적으로 올립니다.',
  ]);
  const relatedSpomoveIds = program.lessonDetail?.relatedSpomoveIds?.length
    ? normalizeSpomoveIds(program.lessonDetail.relatedSpomoveIds)
    : inferRelatedSpomoveIds({
      title,
      category,
      tags: program.tags,
      description: program.description,
      steps,
    });
  const description = cleanText(
    program.description,
    `${title} 활동으로 ${focus}을 자연스럽게 경험하는 체육 수업 패키지입니다.`,
  );
  const youtubeThumb = buildThumbnailUrl(program.lessonDetail?.videoUrl);
  const thumbnailUrl = pickBestHeroUrl(program.thumbnailUrl, youtubeThumb);

  return {
    ...program,
    title,
    category,
    grade: cleanText(program.grade, '대상 확인 필요'),
    space: cleanText(program.space, '공간 확인 필요'),
    description,
    steps,
    equipment,
    thumbnailUrl,
    tags: [...new Set(cleanList(program.tags, [category, focus.split('/')[0].trim()]).concat(relatedSpomoveIds.length > 0 ? ['SPOMOVE'] : []))],
    lessonDetail: {
      recommendedAge: cleanText(program.lessonDetail?.recommendedAge, cleanText(program.grade, '대상 확인 필요')),
      recommendedPlayers: cleanText(program.lessonDetail?.recommendedPlayers, '현장 규모에 맞게 조정'),
      objective: cleanText(program.lessonDetail?.objective, `${title}을 통해 ${focus}을 경험합니다.`),
      developmentFocus: focus,
      coachScript: cleanText(program.lessonDetail?.coachScript, `${title}은 속도보다 규칙 이해와 안전한 움직임을 먼저 확인한 뒤 진행합니다.`),
      parentNote: cleanText(program.lessonDetail?.parentNote, `오늘은 ${title} 활동으로 ${focus}을 연습했습니다. 아이들이 규칙을 이해하고 움직임을 조절하는 과정을 함께 확인했습니다.`),
      fieldTips: cleanList(program.lessonDetail?.fieldTips, ['처음 라운드는 성공 경험을 만들고, 이후 이동 거리, 역할, 난이도를 조정합니다.']),
      variations: cleanList(program.lessonDetail?.variations, ['도구 수를 줄여 난이도를 낮춥니다.', '개인전에서 팀전으로 확장합니다.']),
      safetyNotes: cleanList(program.lessonDetail?.safetyNotes, ['충돌 위험이 있는 구간은 대기선과 이동선을 분리합니다.']),
      relatedSpomoveIds,
      videoUrl: normalizeVideoUrl(program.lessonDetail?.videoUrl),
      heroImageUrl: pickBestHeroUrl(program.lessonDetail?.heroImageUrl, thumbnailUrl),
      setupImageUrl: program.lessonDetail?.setupImageUrl,
      galleryImageUrls: program.lessonDetail?.galleryImageUrls ?? [],
      briefingNotes: cleanList(program.lessonDetail?.briefingNotes, ['수업 목표, 안전 기준, 진행 순서를 수업 전에 짧게 확인합니다.']),
      rules: cleanList(program.lessonDetail?.rules, steps),
      setupNotes: cleanList(program.lessonDetail?.setupNotes, [`공간: ${cleanText(program.space, '공간 확인 필요')}`, `준비물: ${equipment.join(', ')}`]),
    },
  };
}

export async function GET() {
  const supabase = getServiceSupabase();
  const { data: curriculumRows, error: currErr } = await supabase
    .from('curriculum')
    .select('id,title,url,check_list,equipment,steps,expert_tip,display_order')
    .eq('is_sub', false)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('id', { ascending: false });

  if (currErr || !curriculumRows) {
    return NextResponse.json({ error: currErr?.message ?? 'DB error' }, { status: 500 });
  }

  const curriculumIds = (curriculumRows as { id: number }[]).map((row) => row.id);

  type MetaRow = {
    curriculum_id: number;
    sm_tags: string[] | null;
    sm_theme: string | null;
    sm_grade: string | null;
    sm_space: string | null;
    sm_duration: number | null;
    sm_is_pro: boolean;
    sm_is_new: boolean;
    sm_is_hot: boolean;
    sm_display_order: number;
    sm_colors: string[] | null;
    sm_objective: string | null;
    sm_development_focus: string | null;
    sm_coach_script: string | null;
    sm_parent_note: string | null;
    sm_related_spomove_ids: string[] | null;
  };

  const metaByCurriculumId = new Map<number, MetaRow>();
  if (curriculumIds.length > 0) {
    const { data: metaRows } = await supabase
      .from('spokedu_master_program_meta')
      .select('curriculum_id,sm_tags,sm_theme,sm_grade,sm_space,sm_duration,sm_is_pro,sm_is_new,sm_is_hot,sm_display_order,sm_colors,sm_objective,sm_development_focus,sm_coach_script,sm_parent_note,sm_related_spomove_ids')
      .in('curriculum_id', curriculumIds);
    for (const meta of (metaRows ?? []) as MetaRow[]) {
      metaByCurriculumId.set(meta.curriculum_id, meta);
    }
  }

  type OverlayRow = {
    source_center_curriculum_id: number | null;
    video_url: string | null;
    activity_tip: string | null;
    activity_method: string | null;
    equipment: string | null;
    checklist: string | null;
    updated_at: string | null;
    function_type: string | null;
    function_types: string[] | null;
    main_theme: string | null;
    group_size: string | null;
  };

  const overlayByCurriculumId = new Map<number, OverlayRow>();
  if (curriculumIds.length > 0) {
    const { data: overlayRows } = await supabase
      .from('spokedu_pro_programs')
      .select('source_center_curriculum_id,video_url,activity_tip,activity_method,equipment,checklist,updated_at,function_type,function_types,main_theme,group_size')
      .in('source_center_curriculum_id', curriculumIds);
    for (const overlay of (overlayRows ?? []) as OverlayRow[]) {
      const curriculumId = overlay.source_center_curriculum_id;
      if (curriculumId == null) continue;
      const prev = overlayByCurriculumId.get(curriculumId);
      if (!prev) {
        overlayByCurriculumId.set(curriculumId, overlay);
        continue;
      }
      const prevTime = prev.updated_at ? Date.parse(prev.updated_at) : 0;
      const nextTime = overlay.updated_at ? Date.parse(overlay.updated_at) : 0;
      if (nextTime >= prevTime) overlayByCurriculumId.set(curriculumId, overlay);
    }
  }

  type CurrRow = {
    id: number;
    title: string | null;
    url: string | null;
    check_list: string[] | null;
    equipment: string[] | null;
    steps: string[] | null;
    expert_tip: string | null;
    display_order: number | null;
  };

  const programs: Program[] = (curriculumRows as CurrRow[]).map((row, index) => {
    const meta = metaByCurriculumId.get(row.id);
    const overlay = overlayByCurriculumId.get(row.id);
    const title = (row.title ?? '').trim() || `커리큘럼 #${row.id}`;
    const categoryName = (meta?.sm_theme ?? overlay?.main_theme ?? '일반').trim() || '일반';
    const programForTrust = { id: String(row.id), title };
    const rawVideoUrl = normalizeVideoUrl(overlay?.video_url) ?? normalizeVideoUrl(row.url);
    const videoUrl = resolveTrustedReferenceVideoUrl(rawVideoUrl, programForTrust);
    const equipment = overlay?.equipment
      ? String(overlay.equipment).split('\n').map((item) => item.trim()).filter(Boolean)
      : (row.equipment ?? []).filter(Boolean);
    const steps = overlay?.activity_method
      ? String(overlay.activity_method).split('\n').map((item) => item.trim()).filter(Boolean)
      : (row.steps ?? []).filter(Boolean);
    const coachScript = (overlay?.activity_tip ?? row.expert_tip ?? '').trim() || '';
    const fieldTips = overlay?.checklist
      ? String(overlay.checklist).split('\n').map((item) => item.trim()).filter(Boolean)
      : (row.check_list ?? []).filter(Boolean);

    const smColors = meta?.sm_colors;
    const colors: [string, string, string, string] =
      Array.isArray(smColors) && smColors.length === 4
        ? [smColors[0], smColors[1], smColors[2], smColors[3]]
        : categoryToColors(categoryName);

    const proTags: string[] = [
      ...(Array.isArray(overlay?.function_types) && overlay.function_types.length > 0
        ? overlay.function_types
        : overlay?.function_type ? [overlay.function_type] : []),
      ...(overlay?.main_theme ? [overlay.main_theme] : []),
      ...(overlay?.group_size ? [overlay.group_size] : []),
    ];
    const smTags = meta?.sm_tags ?? [];
    const inferredRelatedSpomoveIds = inferRelatedSpomoveIds({
      title,
      category: categoryName,
      tags: [...proTags, ...smTags],
      description: coachScript,
      steps,
    });
    const tags = [...new Set([...proTags, ...smTags, ...(inferredRelatedSpomoveIds.length > 0 ? ['SPOMOVE'] : [])])];
    const relatedSpomoveIds =
      (meta?.sm_related_spomove_ids?.length ?? 0) > 0
        ? (meta!.sm_related_spomove_ids as string[])
        : inferredRelatedSpomoveIds;
    const thumbnailUrl = buildThumbnailUrl(videoUrl);

    const program: Program = {
      id: String(row.id),
      curriculumId: row.id,
      title,
      category: categoryName,
      grade: meta?.sm_grade ?? '대상 확인 필요',
      duration: meta?.sm_duration ?? 20,
      space: meta?.sm_space ?? '공간 확인 필요',
      description: coachScript,
      steps,
      equipment,
      tags,
      colors,
      isPro: meta?.sm_is_pro ?? false,
      isNew: meta?.sm_is_new ?? false,
      isHot: meta?.sm_is_hot ?? false,
      homeSortOrder: meta?.sm_display_order ?? (typeof row.display_order === 'number' ? row.display_order : 5000 + index),
      thumbnailUrl,
      lessonDetail: {
        recommendedAge: meta?.sm_grade ?? '대상 확인 필요',
        recommendedPlayers: overlay?.group_size ?? '현장 규모에 맞게 조정',
        objective: meta?.sm_objective ?? '',
        developmentFocus: meta?.sm_development_focus ?? meta?.sm_theme ?? '',
        coachScript: meta?.sm_coach_script ?? coachScript,
        parentNote: meta?.sm_parent_note ?? '',
        fieldTips,
        variations: [],
        safetyNotes: [],
        relatedSpomoveIds,
        videoUrl,
        heroImageUrl: thumbnailUrl,
        setupImageUrl: undefined,
        galleryImageUrls: [],
        briefingNotes: [],
        rules: steps,
        setupNotes: [],
      },
    };

    return normalizeProgramForMaster(
      applyTrustedReferenceVideo(buildContentQuality(applyPremiumContentOverlay(program))),
      index,
    );
  });

  return NextResponse.json({ data: programs, total: programs.length });
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const idRaw = searchParams.get('id');
  const curriculumId = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(curriculumId) || curriculumId <= 0) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const allowed = ['sm_tags', 'sm_theme', 'sm_grade', 'sm_space', 'sm_duration', 'sm_is_pro', 'sm_is_new', 'sm_is_hot', 'sm_display_order', 'sm_colors', 'sm_objective', 'sm_development_focus', 'sm_coach_script', 'sm_parent_note', 'sm_related_spomove_ids'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_program_meta')
    .upsert({ curriculum_id: curriculumId, ...patch }, { onConflict: 'curriculum_id' })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
