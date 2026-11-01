/**
 * SPOKEDU final copy assignment for Stitch DOM slots (draft for approval — not public fact confirmation).
 */
import { normVisible } from './stitch-dom-parse.mjs';

const BRAND = {
  company: 'SPOKEDU',
  tagline: '아동·청소년 체육교육 운영 브랜드',
  email: 'spokedu77@gmail.com',
  phone: '010-4437-9294',
  legal: '© SPOKEDU. 사업자등록번호 311-63-00356',
  hours: '상담 가능 시간: 평일 09:00–18:00 (주말·공휴일은 채널 안내 기준)',
};

const NAV = {
  home: 'SPOKEDU',
  education: '기관·학교 수업',
  private: '개인·소그룹 수업',
  spomove: 'SPOMOVE',
  records: '수업사례',
  about: 'SPOKEDU 소개',
  contact: '문의하기',
  lab: 'SPOKEDU LAB',
};

/** Verifiable catalog-backed cases (field-records-catalog SSOT) */
export const FIELD_CASES = [
  {
    venue: '동작거점형 우리동네키움센터',
    title: '키움센터 정규 SPOMOVE 수업',
    body: '거점형 키움센터에서 SPOMOVE 프로그램을 정기 운영한 사례입니다.',
    href: '/records/dongjak-spomove',
  },
  {
    venue: '양천거점형키움센터',
    title: 'PAPS·체력 중심 기관 수업',
    body: '기관 환경에 맞춘 PAPS·체력 활동을 운영한 사례입니다.',
    href: '/records/yangcheon-paps',
  },
  {
    venue: '매동초등학교',
    title: '학교 체육 프로그램 Step Up',
    body: '학교 현장 조건에 맞춰 설계·운영한 체육수업 사례입니다.',
    href: '/records/maedong-sports-stepup',
  },
];

export const PUBLIC_CASE_COUNT = FIELD_CASES.length;

const FABRICATED =
  /UNIST|서울대\s*체육|CVPR|IEEE|국가대표|김서준|42\s*%\s*감소|99\.|94\.2|14\s*만|120\s*프레임|0\.12|SPOMOVE\s*OS|바이오메카닉|contact@spomove|1588-4920|SPOMOVE\s*Inc|Intellectual Sports AI|스포무브 하나면|차세대 에듀테크 연구|국가지원 연구개발|verified_user|지도사 자격 검증 완료 코치 100/i;

function pickCrosswalk(row) {
  if (!row) return null;
  const edit = row.stage7_edit_decision ?? '';
  const proposed = (row.proposed_copy_draft ?? '').trim();
  const original = (row.original_live_text ?? '').replace(/^#+\s*/, '').trim();
  if (edit === '수정 제안' && proposed) return { text: proposed, id: row.baseline_text_id, basis: 'Stage7 수정 제안' };
  if (original) return { text: original, id: row.baseline_text_id, basis: edit === '유지' ? 'Stage7 유지·LIVE' : 'Stage7 archive' };
  return null;
}

function matchCrosswalk(text, rows) {
  const n = normVisible(text).replace(/[#*]/g, '');
  for (const row of rows) {
    for (const field of [row.original_live_text, row.audit_review_text, row.proposed_copy_draft]) {
      const nf = normVisible(field).replace(/[#*]/g, '');
      if (nf && (n === nf || (nf.length >= 8 && n.includes(nf)))) return pickCrosswalk(row);
    }
  }
  return null;
}

function designImpact(stitch, copy, role) {
  const parts = ['TEXT_SLOT_LOCKED'];
  if (role === 'image') parts[0] = 'IMAGE_FRAME_LOCKED';
  if (role === 'metric_display' || role === 'decorative_number') parts.push('METRIC_GRAPHIC_PRESERVED');
  if ((copy?.length ?? 0) > (stitch?.length ?? 0) * 1.4) parts.push('LINE_WRAP_RISK');
  return parts.join(';');
}

/** Route-level hero / section defaults when Stitch fiction must be replaced */
const ROUTE_DEFAULTS = {
  '/': {
    hero_badge: { text: 'SPOKEDU · 아동·청소년 맞춤 체육교육', basis: 'FACT-BRAND-001; HOME-001', id: 'HOME-001' },
    hero_h1: {
      text: '움직임으로 아이의 성장을 설계합니다.',
      basis: 'app/spokedu/components/home-web/home-web-landing.tsx (LIVE hero)',
      id: 'HOME-LIVE-HERO',
    },
    hero_lead: {
      text: '전문 지도자가 학교·기관과 개인 수업을 직접 설계하고 운영합니다. 현장의 경험은 SPOMOVE와 SPOKEDU LAB으로 이어집니다.',
      basis: 'home-web-landing.tsx heroLead',
      id: 'HOME-LIVE-HERO',
    },
    module1_h2: {
      text: '연령과 현장에 맞춘 체육수업 설계',
      basis: 'SSOT §02; HOME-029 proposed direction',
      id: 'HOME-029',
    },
    module1_p: {
      text: '아이의 움직임 수준과 수업 환경을 고려해 활동을 구성합니다. 필요에 따라 자체 개발 프로그램 SPOMOVE를 활용합니다.',
      basis: 'HOME-004 proposed',
      id: 'HOME-004',
    },
    module2_h2: { text: '검증·교육받은 지도자의 현장 수업', basis: 'PUBLIC_V0_METRICS.instructors.label', id: 'HOME-020' },
    module2_p: {
      text: '학교·키움센터·복지관 등 기관 조건에 맞춰 지도자가 출강·운영합니다. 결원·대체 등 운영 절차는 본사 기준에 따릅니다.',
      basis: 'education-hub.ts hero.lead',
      id: 'EDU-HERO',
    },
    module3_h2: { text: '수업 기록과 운영 도구', basis: 'SPOKEDU LAB scope', id: 'HOME-025' },
    module3_p: {
      text: '지도자는 SPOKEDU LAB에서 활동을 찾고 수업반·일정·출석·기록을 관리할 수 있습니다. (권한·요금은 LAB 약관 기준)',
      basis: 'HOME-025 proposed',
      id: 'HOME-025',
    },
    stories_h2: { text: '현장에서 운영한 수업 사례', basis: 'records-page.ts hero', id: 'RC-I001' },
    cta_h2: {
      text: '학교·기관·가정에서 필요한 체육수업을 상담해 보세요.',
      basis: 'records-page.ts cta tone',
      id: 'RC-CTA',
    },
    cta_p: {
      text: '대상 연령, 인원, 공간, 운영 목적을 확인한 뒤 적합한 수업 형태를 제안드립니다.',
      basis: 'records-page.ts cta.description',
      id: 'RC-CTA',
    },
  },
  '/education': {
    hero_h1: {
      text: '움직이고 싶게 만드는 기관 체육수업',
      basis: 'education-hub.ts hero.lines',
      id: 'EDU-HERO',
    },
    hero_lead: {
      text: '학교·키움센터·복지관 등 기관의 대상, 인원, 공간에 맞춰 지도자가 현장에서 직접 체육수업을 운영합니다.',
      basis: 'education-hub.ts hero.lead',
      id: 'EDU-HERO',
    },
  },
  '/private': {
    hero_h1: { text: '1:1·소그룹 맞춤 체육수업', basis: 'private-v0 positioning', id: 'PRV-HERO' },
    hero_lead: {
      text: '아이의 움직임 수준과 목표에 맞춰 1:1 또는 소그룹으로 진행하는 맞춤 체육수업입니다.',
      basis: 'HOME-014 proposed; home AUDIENCE_PATHS',
      id: 'HOME-014',
    },
  },
  '/spomove': {
    hero_h1: {
      text: '화면 신호에 반응하며 몸으로 움직이는 SPOMOVE',
      basis: 'spomove-v0 steps; HOME-031 proposed',
      id: 'HOME-031',
    },
    hero_lead: {
      text: '시지각·인지·운동을 연결하는 자체 개발 프로그램입니다. SPOMAT은 필요에 따라 함께 사용하는 물리적 교구입니다.',
      basis: 'SSOT §02; HOME-032 proposed',
      id: 'HOME-032',
    },
  },
  '/records': {
    hero_h1: { text: '현장에서 운영한 수업 사례', basis: 'records-page.ts', id: 'RC-I001' },
    hero_lead: {
      text: '초등학교, 거점형 키움센터, 복지관, 특수학교부터 지자체 행사까지. 현장 조건에 맞춰 설계·운영한 기록입니다.',
      basis: 'records-page.ts hero.subtitle',
      id: 'RC-I001',
    },
  },
  '/about': {
    hero_h1: { text: '스포키듀 소개 · 놀고, 생각하고, 성장하기', basis: 'AB-L001', id: 'AB-L001' },
    hero_lead: {
      text: 'SPOKEDU는 직접 운영하는 체육교육을 기반으로, 현장 수업에 필요한 콘텐츠와 지도자용 수업 시스템을 만드는 체육교육 브랜드입니다.',
      basis: 'docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md §01',
      id: 'FACT-BRAND-001',
    },
  },
};

function metricReplacement(stitch, role) {
  if (/\b500\s*\+|\b2,500|2500|98\s*%|7\s*일|94\.2/i.test(stitch)) {
    if (/누적 출강|학교 및 기관/i.test(stitch)) {
      return {
        text: `${PUBLIC_CASE_COUNT}`,
        basis: `공개 FIELD_RECORD_CATALOG 사례 수(${PUBLIC_CASE_COUNT}); 500+는 marketing-public-metrics·Stage7 G08 검증 전`,
        id: 'RC-CATALOG-COUNT',
        fact: 'VERIFIED_CATALOG_COUNT; NOT_500_PLUS',
      };
    }
    if (/누적 운영 클래스/i.test(stitch)) {
      return {
        text: '—',
        basis: 'Stage7 G08: 회기 집계 공개 수치 승인 전; 그래픽 슬롯 유지·숫자 비활성',
        id: 'RC-I005',
        fact: 'BLOCKED_UNTIL_LEDGER',
      };
    }
    if (/재계약|세팅 기간/i.test(stitch)) {
      return {
        text: '—',
        basis: 'Stitch 허위/미검증 지표; 중립 표기',
        id: 'FACT-STAGE7-G08',
        fact: 'BLOCKED_UNTIL_LEDGER',
      };
    }
    return {
      text: '—',
      basis: '미검증 Stitch 지표 → 숫자 비활성',
      id: 'FACT-STAGE7-G08',
      fact: 'BLOCKED_UNTIL_LEDGER',
    };
  }
  if (role === 'decorative_number' && /^\d{2}$/.test(normVisible(stitch))) {
    return { text: stitch.trim(), basis: 'Stitch watermark decoration — design SSOT', id: 'DESIGN-ONLY', fact: 'DESIGN_ONLY' };
  }
  return null;
}

function navFooter(stitch, slot) {
  const t = normVisible(stitch);
  const map = {
    홈: NAV.home,
    '교육 프로그램': NAV.education,
    '프라이빗 레슨': NAV.private,
    '스포무브 시스템': NAV.spomove,
    '현장 스토리/기록': NAV.records,
    '회사 소개': NAV.about,
    '수업 문의하기': NAV.contact,
    SPOMOVE: BRAND.company,
    SSPOMOVE: BRAND.company,
    SPOKEDU: BRAND.company,
    'contact@spomove.ai': BRAND.email,
    '02-1588-4920': BRAND.phone,
  };
  for (const [k, v] of Object.entries(map)) {
    if (t === k || t.includes(k)) {
      return { text: v, basis: 'site.ts / brandProfile CODE_SSOT', id: 'FACT-NAV-001', fact: 'CODE_SSOT' };
    }
  }
  if (t.includes('©') && t.includes('SPOMOVE')) {
    return { text: BRAND.legal, basis: 'brandProfile + footer legal', id: 'FACT-BIZ-001', fact: 'CODE_SSOT' };
  }
  if (t.includes('09:00') && t.includes('18:00')) {
    return { text: BRAND.hours, basis: '운영 안내 — 법적 확정 아님', id: 'FOOTER-HOURS', fact: 'PENDING_APPROVAL' };
  }
  if (['개인정보처리방침', '이용약관'].includes(t)) {
    return { text: t, basis: 'Footer legal links — URL은 구현 시 SSOT', id: 'FOOTER-LEGAL', fact: 'PENDING_APPROVAL' };
  }
  if (t === '학술연구윤리준칙') {
    return {
      text: '파트너·협업',
      basis: 'Stitch fiction link → footer partners (IA)',
      id: 'FOOTER-PARTNERS',
      fact: 'PENDING_APPROVAL',
    };
  }
  const footerLinks = {
    'AI 기초 신체 밸런스': NAV.spomove,
    '엘리트 전담 맞춤 코칭': NAV.private,
    '정밀 모션 추적 진단': NAV.spomove,
    '모션 AI 비전 알고리즘': NAV.spomove,
    '현장 분석 데이터 로그': NAV.lab,
    '연구 협력 기관 (UNIST 등)': NAV.about,
    '센터 대관 및 레슨 예약': NAV.contact,
  };
  if (footerLinks[t]) {
    return { text: footerLinks[t], basis: 'footerNavGroups semantic map', id: 'FOOTER-IA', fact: 'PENDING_APPROVAL' };
  }
  return null;
}

function routePattern(slot, stitch) {
  const route = slot.route;
  const sec = slot.page_section ?? '';
  const t = normVisible(stitch);
  const defs = ROUTE_DEFAULTS[route];
  if (!defs) return null;

  if (slot.role === 'cta') {
    if (/무료|상담|문의/.test(t)) return { text: '수업 상담하기', basis: 'siteHeaderCta + home hero', id: 'HOME-CTA', fact: 'PENDING_APPROVAL' };
    if (/프로그램|보기|둘러보/.test(t)) return { text: '수업 유형 살펴보기', basis: 'HOME-008', id: 'HOME-008', fact: 'PENDING_APPROVAL', href: '/#audience' };
    if (/전체 기록/.test(t)) return { text: '수업사례 전체 보기', basis: 'records index', id: 'RC-I001', fact: 'PENDING_APPROVAL' };
    if (/제안서|다운로드/.test(t)) return { text: '기관 체육수업 상담하기', basis: 'education-hub primaryCta', id: 'EDU-CTA', fact: 'PENDING_APPROVAL' };
  }

  if (sec.includes('SECTION 1') || sec.includes('HERO') || sec.includes('MINIMAL HERO')) {
    if (slot.tag === 'h1') return { ...defs.hero_h1, fact: 'PENDING_APPROVAL' };
    if (/AI 모션|에듀테크 솔루션/.test(t)) return { ...(defs.hero_badge ?? ROUTE_DEFAULTS['/'].hero_badge), fact: 'PENDING_APPROVAL' };
    if (slot.tag === 'p' && t.length > 40) return { ...defs.hero_lead, fact: 'PENDING_APPROVAL' };
  }

  if ((sec.includes('SECTION 2') || sec.includes('SHOWCASE')) && slot.tag === 'h2') return { ...(defs.module1_h2 ?? defs.hero_h1), fact: 'PENDING_APPROVAL' };
  if ((sec.includes('SECTION 2') || sec.includes('SHOWCASE')) && slot.tag === 'p' && t.length > 30) return { ...(defs.module1_p ?? defs.hero_lead), fact: 'PENDING_APPROVAL' };

  if (/ITEM 02|02/.test(sec) && slot.tag === 'h2') return { ...(defs.module2_h2 ?? defs.hero_h1), fact: 'PENDING_APPROVAL' };
  if (/ITEM 02|02/.test(sec) && slot.tag === 'p') return { ...(defs.module2_p ?? defs.hero_lead), fact: 'PENDING_APPROVAL' };

  if (/ITEM 03|03/.test(sec) && slot.tag === 'h2') return { ...(defs.module3_h2 ?? defs.hero_h1), fact: 'PENDING_APPROVAL' };
  if (/ITEM 03|03/.test(sec) && slot.tag === 'p') return { ...(defs.module3_p ?? defs.hero_lead), fact: 'PENDING_APPROVAL' };

  if (sec.includes('PHOTO GRID') && slot.tag === 'h2') return { ...(defs.stories_h2 ?? defs.hero_h1), fact: 'PENDING_APPROVAL' };
  if (sec.includes('PHOTO GRID') && slot.tag === 'h3') {
    const idx = slot.dom_path.match(/h3\[(\d+)\]/)?.[1];
    const i = idx ? (Number(idx) - 1) % FIELD_CASES.length : 0;
    const c = FIELD_CASES[i];
    return { text: c.title, basis: `field-records-catalog ${c.href}`, id: 'FIELD-CATALOG', fact: 'VERIFIED_CATALOG' };
  }
  if (sec.includes('PHOTO GRID') && slot.tag === 'p' && t.length > 30) {
    const idx = slot.dom_path.match(/p\[(\d+)\]/)?.[1];
    const i = idx ? (Number(idx) - 1) % FIELD_CASES.length : 0;
    return { text: FIELD_CASES[i].body, basis: 'field-records-catalog', id: 'FIELD-CATALOG', fact: 'VERIFIED_CATALOG' };
  }

  if (sec.includes('BOTTOM CTA') && slot.tag === 'h2') return { ...(defs.cta_h2 ?? defs.hero_h1), fact: 'PENDING_APPROVAL' };
  if (sec.includes('BOTTOM CTA') && slot.tag === 'p') return { ...(defs.cta_p ?? defs.hero_lead), fact: 'PENDING_APPROVAL' };

  return null;
}

export function resolveSlotCopy(slot, crosswalkRows) {
  const stitch = slot.stitch_original ?? '';
  const t = normVisible(stitch);

  if (slot.role === 'image') {
    return {
      spokedu_copy: '(이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)',
      basis: 'Image slot; alt/prompt replaced at implementation',
      stage7_ids: 'DEC-PACK-05',
      fact_status: 'IMAGE_PROVENANCE_REVIEW',
      approval: 'PENDING_APPROVAL',
      design_impact: 'IMAGE_FRAME_LOCKED',
      cta_href: '',
    };
  }

  const m = metricReplacement(stitch, slot.role);
  if (m) {
    return {
      spokedu_copy: m.text,
      basis: m.basis,
      stage7_ids: m.id,
      fact_status: m.fact,
      approval: 'PENDING_APPROVAL',
      design_impact: designImpact(stitch, m.text, slot.role),
      cta_href: slot.data_path ? ctaTarget(slot.data_path) : '',
    };
  }

  const rpEarly = routePattern(slot, stitch);
  if (rpEarly) {
    return {
      spokedu_copy: rpEarly.text,
      basis: rpEarly.basis,
      stage7_ids: rpEarly.id,
      fact_status: rpEarly.fact ?? 'PENDING_APPROVAL',
      approval: 'PENDING_APPROVAL',
      design_impact: designImpact(stitch, rpEarly.text, slot.role),
      cta_href: slot.data_path ? ctaTarget(slot.data_path) : '',
    };
  }

  const nf = navFooter(stitch, slot);
  if (nf && slot.role !== 'cta') {
    return {
      spokedu_copy: nf.text,
      basis: nf.basis,
      stage7_ids: nf.id,
      fact_status: nf.fact,
      approval: 'PENDING_APPROVAL',
      design_impact: designImpact(stitch, nf.text, slot.role),
      cta_href: '',
    };
  }

  if (FABRICATED.test(stitch)) {
    return {
      spokedu_copy: neutralForFabricated(t, slot),
      basis: 'Stitch fiction removed — neutral SPOKEDU slot copy',
      stage7_ids: 'FACT-STAGE7-G07|G08|G09',
      fact_status: 'FABRICATED_REPLACED',
      approval: 'PENDING_APPROVAL',
      design_impact: designImpact(stitch, '', slot.role),
      cta_href: '',
    };
  }

  const cw = matchCrosswalk(stitch, crosswalkRows);
  if (cw) {
    return {
      spokedu_copy: cw.text,
      basis: cw.basis,
      stage7_ids: cw.id,
      fact_status: 'STAGE7_REFERENCED',
      approval: 'PENDING_APPROVAL',
      design_impact: designImpact(stitch, cw.text, slot.role),
      cta_href: slot.data_path ? ctaTarget(slot.data_path) : '',
    };
  }

  if (t.startsWith('#')) {
    return {
      spokedu_copy: t.replace(/#/g, '#').slice(0, 80),
      basis: 'Hashtag chip — align with LIVE card tags in Phase C',
      stage7_ids: 'TAG-CHIP',
      fact_status: 'PENDING_APPROVAL',
      approval: 'PENDING_APPROVAL',
      design_impact: 'TEXT_SLOT_LOCKED',
      cta_href: '',
    };
  }

  if (t.length <= 4 && /^\d+$/.test(t)) {
    return {
      spokedu_copy: t,
      basis: 'Decorative index / step number',
      stage7_ids: 'DESIGN-ONLY',
      fact_status: 'DESIGN_ONLY',
      approval: 'PENDING_APPROVAL',
      design_impact: 'DECORATIVE_NUMBER_LOCKED',
      cta_href: '',
    };
  }

  return {
    spokedu_copy: t.length <= 120 ? t : t.slice(0, 117) + '…',
    basis: 'Stitch display text retained where no conflict (brand-normalize pass in Phase C)',
    stage7_ids: 'STITCH-RETAIN',
    fact_status: 'REVIEW_RETAINED',
    approval: 'PENDING_APPROVAL',
    design_impact: designImpact(stitch, t, slot.role),
    cta_href: slot.data_path ? ctaTarget(slot.data_path) : '',
  };
}

function neutralForFabricated(t, slot) {
  if (/report|리포트|성장/i.test(t)) return '수업 기록 예시 (데모 UI — 실제 데이터 아님)';
  if (/coach|코치|지도/i.test(t)) return '지도자 현장 수업';
  if (/연구|UNIST|대학/i.test(t)) return '프로그램·운영 안내';
  if (slot.role === 'metric_display') return '—';
  return 'SPOKEDU 체육교육 · SPOMOVE 프로그램';
}

export function ctaTarget(dataPath) {
  const map = {
    home: '/',
    'education-program': '/education',
    'private-lesson': '/private',
    'spomove-system': '/spomove',
    'field-records': '/records',
    about: '/about',
    inquiry: '/contact',
  };
  return map[dataPath] ?? '/contact';
}
