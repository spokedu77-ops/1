import Image from 'next/image';
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Layers3,
  Play,
  RotateCcw,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { TrackedLink } from '@/app/spokedu/components/home/tracked-link';
import { CLASS_TOOLS, FREE_CLASS_TOOL_IDS } from '../../lib/classTools';
import { LANDING_FAQS } from '../landingFaq';
import type { LandingPlan } from '../models/landingProduct';
import type { ReturnTypeOfLandingModel } from './types';
import { LandingConversionActions } from './LandingAuthControls';
import styles from '../landing.module.css';

const ASSETS = {
  home: '/images/spokedu/home/field-editorial/home-master-ui.png',
  library: '/images/spokedu/subscription/library-program-cards-20261008-final.png',
  lesson: '/images/spokedu/subscription/prepare-lesson-plan-20261008-final.png',
  tools: '/images/spokedu/subscription/prepare-class-tools.png',
  build: '/images/spokedu-master/landing/build-session.png',
  session: '/images/spokedu-master/landing/run-session.png',
  attendance: '/images/spokedu-master/landing/run-attendance.png',
  gear: '/images/spokedu/subscription/prepare-gear-setting.webp',
  spomove: '/images/spokedu/home/field-editorial/home-spomove-field.webp',
  field: '/images/spokedu/home/home-hero-spomove-class.JPG',
} as const;

const WORKFLOW = [
  ['01', '수업 찾기', '오늘 수업에 맞는 놀이체육을 찾습니다.'],
  ['02', '수업 준비', '영상, 준비물, 진행 방법을 확인합니다.'],
  ['03', '수업 구성', '수업반과 일정에 프로그램을 추가합니다.'],
  ['04', '현장 운영', '출석과 활동 순서를 확인하며 수업을 진행합니다.'],
] as const;

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className={styles.sectionHeading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function ProductFrame({ src, alt, ratio = 'wide', priority = false, position }: {
  src: string;
  alt: string;
  ratio?: 'wide' | 'portrait' | 'square';
  priority?: boolean;
  position?: string;
}) {
  return (
    <div className={`${styles.productFrame} ${styles[ratio]}`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 86vw, 760px"
        style={{ objectPosition: position }}
      />
    </div>
  );
}

export function LandingHero({ product }: { product: ReturnTypeOfLandingModel }) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>유아·초등 체육 교사와 강사를 위한 수업 운영</p>
        <h1>놀이체육을 찾고,<br />수업을 구성하고,<br />현장에서 운영합니다.</h1>
        <p className={styles.heroBody}>
          필요한 놀이체육 프로그램을 찾아 수업반과 일정에 담으세요. 수업 당일에는 출석과 활동 순서를 한 화면에서 확인하며 운영할 수 있습니다.
        </p>
        <div className={styles.heroActions}>
          <LandingConversionActions loginHref={product.handoff.loginHref} freeStartHref={product.handoff.freeStartHref} placement="hero" />
          <a href="#plans" className={styles.secondaryButton}>
            요금 보기 <ArrowDown size={17} aria-hidden />
          </a>
        </div>
        <p className={styles.freeNote}>놀이체육 둘러보기 · 지정된 놀이체육 프로그램 1개 미리보기 · 스탑워치·타이머·점수판 이용</p>
      </div>
      <div className={styles.heroVisual} aria-label="SPOKEDU LAB 실제 홈 화면">
        <div className={styles.heroHalo} />
        <ProductFrame src={ASSETS.home} alt="최근 활동, 이번 주 놀이체육 추천과 SPOMOVE가 보이는 SPOKEDU LAB 홈" priority />
        <div className={styles.heroCaption}>
          <span>실제 SPOKEDU LAB 화면</span>
          <strong>수업 준비와 현장 운영이 한 흐름에</strong>
        </div>
      </div>
    </section>
  );
}

export function ProductOverview() {
  return (
    <section id="workflow" className={styles.overview}>
      <SectionHeading
        eyebrow="자료를 보는 데서 끝나지 않습니다"
        title="오늘의 수업이 다음 준비로 이어지는 방식"
        body="찾기부터 다음 준비까지, SPOKEDU LAB이 연결하는 수업의 전체 흐름입니다."
      />
      <ol className={styles.workflowList}>
        {WORKFLOW.map(([number, title, body], index) => (
          <li key={number}>
            <span>{number}</span>
            <div><h3>{title}</h3><p>{body}</p></div>
            {index < WORKFLOW.length - 1 ? <ArrowRight size={18} aria-hidden /> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function CoreProductStory() {
  return (
    <div className={styles.storyFlow}>
      <section id="library" className={`${styles.storySection} ${styles.librarySection}`}>
        <div className={styles.storyCopy}>
          <p className={styles.stepLabel}>찾기 · 준비하기</p>
          <h2>오늘 수업에 필요한 프로그램을 더 빠르게 찾으세요.</h2>
          <p>교실에서 진행하기 좋은 활동과 미취학 아동에게 추천하는 프로그램을 살펴보세요. 검색과 6가지 세부 필터를 이용하면 수업 대상과 환경에 맞는 활동을 더욱 편리하게 찾을 수 있습니다.</p>
          <ul><li>수업 대상과 공간에 맞는 프로그램 검색</li><li>추천 프로그램과 다양한 놀이체육 활동 탐색</li><li>준비물과 교구 배치 및 진행 방법 확인</li><li>필요한 활동을 실제 수업 준비에 활용</li></ul>
        </div>
        <div className={styles.mediaStack}>
          <ProductFrame src={ASSETS.library} alt="검색과 6가지 세부 필터 및 프로그램 카드가 보이는 SPOKEDU LAB 놀이체육" />
          <div className={styles.insetFrame}><ProductFrame src={ASSETS.lesson} alt="교구 배치와 수업 스크립트가 보이는 프로그램 상세 화면" ratio="portrait" position="50% 18%" /></div>
        </div>
      </section>

      <section id="management" className={`${styles.storySection} ${styles.reverse}`}>
        <div className={styles.storyCopy}>
          <p className={styles.stepLabel}>수업으로 연결하기</p>
          <h2>찾은 활동을 실제 수업의 순서로 만듭니다.</h2>
          <p>수업반과 날짜를 기준으로 활동을 구성하고, 필요한 준비를 한 화면에서 확인합니다. 이전 수업의 활동은 새 수업의 맥락에 맞춰 다시 선택할 수 있습니다.</p>
          <div className={styles.inlineFacts}>
            <span><UsersRound size={18} aria-hidden /> 수업반</span>
            <span><CalendarDays size={18} aria-hidden /> 일정</span>
            <span><Layers3 size={18} aria-hidden /> 활동 순서</span>
          </div>
        </div>
        <div className={styles.buildComposition}>
          <ProductFrame src={ASSETS.build} alt="예정 수업에 활동 순서와 준비 메모를 구성한 실제 SPOKEDU LAB 수업 상세 화면" position="76% 50%" />
          <div className={styles.buildNote}>
            <span>준비의 기준</span>
            <strong>누구와 · 언제 · 무엇을</strong>
          </div>
        </div>
      </section>

      <section id="run" className={styles.runSection}>
        <div className={styles.runHeader}>
          <SectionHeading
            eyebrow="현장에서 운영하기"
            title="현장에서는 출석과 활동을 한 흐름에서 운영합니다."
            body="수업반과 일정을 등록하고 필요한 놀이체육 프로그램을 추가하세요. 수업 당일에는 출석 상태와 활동 순서를 한 화면에서 확인하며 수업을 운영할 수 있습니다."
          />
          <div className={styles.runFacts}>
            <span><ClipboardCheck size={18} aria-hidden /> 출석과 참여 범위</span>
            <span><Play size={18} aria-hidden /> 활동 진행 상태</span>
            <span><RotateCcw size={18} aria-hidden /> 타이머·팀·순서</span>
          </div>
        </div>
        <div className={styles.runComposition}>
          <div className={styles.runPrimary}>
            <ProductFrame src={ASSETS.session} alt="진행 중인 수업의 활동 순서, 출석과 메모가 보이는 실제 SPOKEDU LAB 수업 상세 화면" position="76% 50%" />
            <div className={styles.runProofLabel}><span>수업 운영의 중심</span><strong>오늘 수업 · 활동 순서 · 진행 상태</strong></div>
          </div>
          <div className={styles.runSupport}>
            <div className={styles.runAttendance}>
              <ProductFrame src={ASSETS.attendance} alt="수업반과 날짜별 출석 상태가 보이는 실제 SPOKEDU LAB 출석 화면" position="50% 54%" />
              <p><strong>수업반 출석과 참여 상태</strong><span>날짜별 출석을 실제 수업 흐름에 연결</span></p>
            </div>
          </div>
        </div>
      </section>

      <ClassToolsSection />

    </div>
  );
}

export function ClassToolsSection() {
  return (
    <section id="tools" className={styles.toolsSection}>
      <div className={styles.toolsCopy}>
        <SectionHeading
          eyebrow="수업 도구 8종"
          title="수업 중 필요한 도구도 같은 화면에서 바로 씁니다."
          body="무료 이용자는 스탑워치·타이머·점수판을, 라이트와 프리미엄 이용자는 명단을 활용하는 다섯 도구까지 모두 사용할 수 있습니다."
        />
        <ul className={styles.toolStrip}>
          {CLASS_TOOLS.map((tool) => (
            <li key={tool.id}><span>{tool.label}</span><small>{FREE_CLASS_TOOL_IDS.includes(tool.id as (typeof FREE_CLASS_TOOL_IDS)[number]) ? '무료' : '라이트'}</small></li>
          ))}
        </ul>
      </div>
      <ProductFrame src={ASSETS.tools} alt="스탑워치, 타이머, 점수판과 명단형 도구가 보이는 실제 LAB 수업 도구 화면" />
    </section>
  );
}

const BEFORE_AFTER = [
  ['여러 곳에서 프로그램 검색', '놀이체육에서 바로 찾기'],
  ['수업반·일정·활동을 따로 관리', '한 수업에 프로그램 연결'],
  ['출석과 활동 순서를 따로 확인', '한 화면에서 운영'],
] as const;

export function WhyMasterSection() {
  return (
    <section id="why-master" className={styles.whySection}>
      <SectionHeading eyebrow="반복 업무를 줄이는 방식" title="자료를 더 많이 보는 것이 아니라, 준비의 반복을 줄입니다." body="찾고 정리하고 다시 떠올리던 일을 하나의 수업 흐름으로 연결합니다." />
      <div className={styles.beforeAfter}>
        {BEFORE_AFTER.map(([before, after]) => <div key={before}><p><span>기존</span>{before}</p><ArrowRight size={18} aria-hidden /><p><span>SPOKEDU LAB</span><strong>{after}</strong></p></div>)}
      </div>
    </section>
  );
}

export function ProductDetailSection() {
  const groups = [
    ['프로그램 기본정보', ['테마·대상·주요 기능', '움직임 특성·공간', '참여 형태']],
    ['수업 준비', ['준비물과 수량', '초기 교구 세팅', '실제 수업 영상']],
    ['수업 진행', ['단계별 활동 방법', '지도 포인트와 안전', '난이도 조절·변형']],
    ['현장 활용', ['수업에 추가', '지도안 복사', '현장 준비']],
  ] as const;
  return (
    <section id="product-detail" className={styles.detailSection}>
      <SectionHeading eyebrow="프로그램 상세" title="프로그램 하나에 실제 수업에 필요한 정보가 들어 있습니다." body="활동명만 모은 아이디어 목록이 아니라, 무엇을 준비하고 어떻게 세팅하고 설명하며 진행하는지까지 확인합니다." />
      <div className={styles.detailLayout}>
        <ProductFrame src={ASSETS.lesson} alt="준비물, 교구 세팅, 실제 영상과 진행 방법을 보여주는 LAB 수업 상세" ratio="portrait" position="50% 18%" />
        <div className={styles.detailGroups}>{groups.map(([title, items]) => <div key={title}><h3>{title}</h3><ul>{items.map((item) => <li key={item}><Check size={15} aria-hidden />{item}</li>)}</ul></div>)}</div>
      </div>
    </section>
  );
}

export function SpomoveSection() {
  return (
    <section id="spomove" className={styles.spomoveSection}>
      <div className={styles.spomoveCopy}>
        <p className={styles.spomoveEyebrow}>SPOMOVE · 프리미엄</p>
        <h2>수업을 화면과 움직임으로 확장합니다.</h2>
        <p>색상·방향·숫자 같은 시각 신호를 보고 몸으로 반응하는 디지털 움직임 활동입니다. 활동을 고른 뒤 시작 화면에서 설정을 확인하고 교사가 직접 실행합니다.</p>
        <p><strong>프리미엄은 라이트의 모든 기능에 SPOMOVE를 더한 요금제입니다.</strong></p>
        <div className={styles.spomoveSteps}><span>활동 찾기</span><ArrowRight size={16} /><span>시작 확인</span><ArrowRight size={16} /><span>현장 실행</span></div>
      </div>
      <div className={styles.spomoveVisual}>
        <Image src={ASSETS.spomove} alt="프로젝터 화면의 시각 신호를 보고 움직이는 실제 SPOMOVE 수업" fill sizes="(max-width: 768px) 92vw, 620px" />
        <div className={styles.spomoveTag}>실제 SPOMOVE 수업</div>
      </div>
    </section>
  );
}

export function InclusiveAndFieldProof() {
  return (
    <>
      <section className={styles.inclusiveSection}>
        <div className={styles.inclusiveMedia}>
          <ProductFrame src={ASSETS.gear} alt="색과 위치를 활용해 난이도를 조절할 수 있는 실제 수업 교구 배치" ratio="square" />
        </div>
        <div className={styles.storyCopy}>
          <p className={styles.stepLabel}>다양한 수행 수준을 고려한 수업</p>
          <h2>선생님이 수업 상황에 맞게 움직임 조건을 조절할 수 있습니다.</h2>
          <p>자극 시간과 움직임 조건을 정하고, 활동 난이도와 반복 활용 여부를 교사가 현장에서 선택합니다. SPOMOVE와 다양한 놀이체육 활동은 특수학급과 발달지원 현장에서도 수행 수준을 고려해 활용할 수 있습니다.</p>
          <p className={styles.disclaimer}>별도의 특수교육 상품이나 치료 효과를 의미하지 않습니다.</p>
        </div>
      </section>

      <section className={styles.fieldProof}>
        <SectionHeading
          eyebrow="SPOKEDU의 현장에서 시작했습니다"
          title="실제 수업 현장에서 필요한 흐름을 제품으로 만들었습니다."
          body="SPOKEDU는 유아·초등·특수체육 수업을 직접 운영하며, 준비부터 현장 진행과 기록까지 반복해서 필요한 과정을 SPOKEDU LAB 안에 연결했습니다."
        />
        <div className={styles.fieldGrid}>
          <figure className={styles.fieldPhoto}>
            <Image src={ASSETS.field} alt="교사가 학생의 움직임을 가까이에서 지원하는 실제 체육수업 현장" fill sizes="(max-width: 720px) 92vw, 1120px" />
            <figcaption>실제 수업 현장</figcaption>
          </figure>
        </div>
      </section>
    </>
  );
}

export function FieldProofSection() {
  return (
    <section id="field-proof" className={styles.fieldProof}>
      <SectionHeading
        eyebrow="SPOKEDU의 현장에서 시작했습니다"
        title="실제 수업 현장에서 필요한 흐름을 제품으로 만들었습니다."
        body="SPOKEDU는 유아·초등·특수체육 수업을 직접 운영하며 현장에서 반복적으로 필요한 프로그램 탐색, 수업 구성, 출석과 활동 관리를 SPOKEDU LAB에 연결했습니다."
      />
      <div className={styles.fieldGrid}>
        <figure className={styles.fieldPhoto}>
          <Image src={ASSETS.field} alt="교사가 학생의 움직임을 가까이에서 지원하는 실제 체육수업 현장" fill sizes="(max-width: 720px) 92vw, 1120px" />
          <figcaption>실제 SPOKEDU 수업 현장</figcaption>
        </figure>
      </div>
    </section>
  );
}

export function AudienceSection() {
  const audiences = [
    ['유아·초등 체육 지도자', '활동 탐색부터 수업 기록까지 매주 반복되는 준비를 연결합니다.'],
    ['방과후·스포츠클럽 강사', '여러 반의 일정과 출석, 활동 순서를 한 흐름으로 운영합니다.'],
    ['특수체육·발달지원 현장', '수행 수준을 고려해 난이도와 움직임 조건을 조절합니다.'],
    ['학교·센터·기관', '이용 인원과 운영 방식에 맞춘 별도 도입 안내를 제공합니다.'],
  ] as const;
  return (
    <section id="audience" className={styles.audienceSection}>
      <SectionHeading eyebrow="현장에 맞는 활용" title="수업 방식은 달라도, 준비와 운영의 흐름은 이어집니다." body="개인 지도자부터 학교와 기관까지 실제 수업 환경에 맞춰 활용할 수 있습니다." />
      <div className={styles.audienceGrid}>{audiences.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
      <p className={styles.disclaimer}>LAB은 치료·진단 제품이 아니며 의학적 효과를 제공하지 않습니다.</p>
    </section>
  );
}

function PlanCard({ plan }: { plan: LandingPlan }) {
  const isPremium = plan.code === 'premium';
  return (
    <article className={`${styles.planCard} ${isPremium ? styles.premiumPlan : ''}`}>
      <div>
        <p className={styles.planEyebrow}>{plan.eyebrow}</p>
        <div className={styles.planTitleRow}>
          <h3>{plan.displayName}</h3>
          <p>{plan.priceLabel ?? '₩0'}{plan.billingCycle === 'monthly' ? <small> / 월 자동결제</small> : null}</p>
        </div>
        <p className={styles.planValue}>{plan.value}</p>
      </div>
      <ul>{plan.featureSummary.map((feature) => <li key={feature}><Check size={16} aria-hidden />{feature}</li>)}</ul>
      <TrackedLink href={plan.ctaHref} trackLabel={`master-commercial-plan-${plan.code}`} commercialRoute="curriculum" ctaIntentId={plan.code === 'free' ? 'free_start' : `${plan.code}_start`} className={`${styles.planButton} ${isPremium ? 'spm-btn-primary' : ''}`}>{plan.ctaLabel}</TrackedLink>
    </article>
  );
}

export function PlansSection({ product }: { product: ReturnTypeOfLandingModel }) {
  return (
    <section id="plans" className={styles.plansSection}>
      <SectionHeading
        eyebrow="무료로 확인하고, 필요한 만큼 이어가세요"
        title="무료로 시작하고, 필요한 기능만 더하세요."
        body="무료로 놀이체육과 기본 수업 도구를 확인하세요. 일반 수업관리와 기록·안내문은 라이트, SPOMOVE까지 이용하려면 프리미엄을 선택할 수 있습니다."
      />
      <div className={styles.planGrid}>{product.plans.map((plan) => <PlanCard key={plan.code} plan={plan} />)}</div>
      <div className={styles.comparisonWrap}>
        <table className={styles.comparisonTable}>
          <caption>무료, 라이트, 프리미엄 기능 비교</caption>
          <thead><tr><th scope="col">기능</th><th scope="col">무료</th><th scope="col">라이트</th><th scope="col">프리미엄</th></tr></thead>
          <tbody>{product.comparison.map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{(['free', 'lite', 'premium'] as const).map((plan) => <td key={plan} aria-label={row[plan] ? '포함' : '미포함'}>{row[plan] ? <Check size={17} aria-hidden /> : <span aria-hidden>—</span>}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className={styles.billingNotice}>
        <Sparkles size={18} aria-hidden />
        <p><strong>결제 안내</strong> 라이트와 프리미엄은 선택 즉시 최초 결제되며 이후 매월 최초 결제일에 자동결제됩니다. 언제든 해지 예약이 가능하고, 해지 후에도 결제된 이용 기간 종료일까지 사용할 수 있습니다.</p>
      </div>
    </section>
  );
}

export function CenterSection({ product }: { product: ReturnTypeOfLandingModel }) {
  return (
    <section id="center" className={styles.centerSection}>
      <div><p className={styles.eyebrow}>학교·센터·기관 이용</p><h2>학교·센터·기관에서 함께 사용하시나요?</h2><p>이용 인원, 운영 방식, 교육과 도입 범위에 맞춰 별도로 안내합니다. 기관 이용은 개인 구독 요금제처럼 직접 결제하는 상품이 아닙니다.</p></div>
      <TrackedLink href={product.centerInquiryHref} trackLabel="master-commercial-center" commercialRoute="curriculum" ctaIntentId="center_inquiry" className={styles.secondaryButton}>{product.centerInquiry.ctaLabel}<ArrowRight size={16} aria-hidden /></TrackedLink>
    </section>
  );
}

export function FaqAndFinalCta({ product }: { product: ReturnTypeOfLandingModel }) {
  return (
    <>
      <section id="faq" className={styles.faqSection}>
        <SectionHeading eyebrow="시작하기 전에" title="자주 묻는 질문" body="무료 이용부터 자동결제와 현장 사용까지, 실제 제품 기준으로 답했습니다." />
        <div className={styles.faqList}>
          {LANDING_FAQS.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}<ChevronDown size={18} aria-hidden /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section id="final-cta" className={styles.finalCta}>
        <p className={styles.eyebrow}>다음 수업 하나부터</p>
        <h2>무료로 직접 확인해 보세요.</h2>
        <p>놀이체육을 둘러보고, 지정된 놀이체육 프로그램 1개를 미리보며, 스탑워치·타이머·점수판을 이용할 수 있습니다. 전체 프로그램 상세 자료는 라이트 이상에서 제공됩니다.</p>
        <div className={styles.finalActions}>
          <LandingConversionActions loginHref={product.handoff.loginHref} freeStartHref={product.handoff.freeStartHref} placement="final" />
        </div>
      </section>
    </>
  );
}
