import Image from 'next/image';
import Link from 'next/link';
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
import type { LandingPlan } from '../models/landingProduct';
import type { ReturnTypeOfLandingModel } from './types';
import styles from '../landing.module.css';

const ASSETS = {
  home: '/images/spokedu/home/field-editorial/home-master-ui.png',
  library: '/images/spokedu/subscription/library-program-cards.png',
  lesson: '/images/spokedu/subscription/prepare-lesson-plan.png',
  tools: '/images/spokedu/subscription/prepare-class-tools.png',
  build: '/images/spokedu-master/landing/build-session.png',
  session: '/images/spokedu-master/landing/run-session.png',
  attendance: '/images/spokedu-master/landing/run-attendance.png',
  record: '/images/spokedu-master/landing/remember-report.png',
  recordDetail: '/images/spokedu-master/landing/remember-report-detail.png',
  gear: '/images/spokedu/subscription/prepare-gear-setting.webp',
  spomove: '/images/spokedu/home/field-editorial/home-spomove-field.webp',
  field: '/images/spokedu/records/yangcheon-paps.jpg',
} as const;

const WORKFLOW = [
  ['01', '수업 찾기', '오늘 수업에 맞는 활동을 고릅니다.'],
  ['02', '수업 준비', '준비물과 진행 방법을 확인합니다.'],
  ['03', '반과 일정에 연결', '활동을 수업반과 날짜에 담습니다.'],
  ['04', '현장에서 운영', '출석과 활동 순서를 이어서 씁니다.'],
  ['05', '기록하고 이어가기', '남긴 맥락을 다음 준비에 활용합니다.'],
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
        <h1>체육수업을 찾고,<br />운영하고,<br />다음 수업까지 이어갑니다.</h1>
        <p className={styles.heroBody}>
          매번 &apos;오늘 뭐 하지?&apos;부터 다시 시작하지 않아도 되도록. 활동을 찾고,
          내 수업에 담고, 현장에서 운영한 기록까지 다음 수업으로 이어갑니다.
        </p>
        <div className={styles.heroActions}>
          <Link href={product.handoff.freeStartHref} className="spm-btn-primary">
            Free로 시작하기 <ArrowRight size={17} aria-hidden />
          </Link>
          <a href="#workflow" className={styles.secondaryButton}>
            서비스 살펴보기 <ArrowDown size={17} aria-hidden />
          </a>
        </div>
        <p className={styles.freeNote}>수업 도구 · 라이브러리 탐색 · 지정 무료 프로그램 체험</p>
      </div>
      <div className={styles.heroVisual} aria-label="SPOKEDU MASTER 실제 홈 화면">
        <div className={styles.heroHalo} />
        <ProductFrame src={ASSETS.home} alt="최근 활동, 이번 주 놀이체육 추천과 SPOMOVE가 보이는 SPOKEDU MASTER 홈" priority />
        <div className={styles.heroCaption}>
          <span>실제 MASTER 화면</span>
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
        body="찾기부터 다음 준비까지, MASTER가 연결하는 수업의 전체 흐름입니다."
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
      <section className={styles.storySection}>
        <div className={styles.storyCopy}>
          <p className={styles.stepLabel}>찾기 · 준비하기</p>
          <h2>오늘 수업에 맞는 활동을 빠르게 찾습니다.</h2>
          <p>연령, 공간, 참여 형태와 활동 특성을 살펴보고 수업을 고릅니다. 상세 화면에서 준비물과 교구 배치, 진행 방법을 확인해 현장에 맞게 준비합니다.</p>
          <ul><li>조건별 Library 탐색</li><li>실제 수업 이미지와 준비 정보</li><li>수업에 담기 전 상세 확인</li></ul>
        </div>
        <div className={styles.mediaStack}>
          <ProductFrame src={ASSETS.library} alt="조건별 필터와 실제 프로그램 카드가 보이는 MASTER Library" />
          <div className={styles.insetFrame}><ProductFrame src={ASSETS.lesson} alt="교구 배치와 수업 스크립트가 보이는 프로그램 상세 화면" ratio="portrait" position="50% 18%" /></div>
        </div>
      </section>

      <section className={`${styles.storySection} ${styles.reverse}`}>
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
          <ProductFrame src={ASSETS.build} alt="예정 수업에 활동 순서와 준비 메모를 구성한 실제 MASTER 수업 상세 화면" position="76% 50%" />
          <div className={styles.buildNote}>
            <span>준비의 기준</span>
            <strong>누구와 · 언제 · 무엇을</strong>
          </div>
        </div>
      </section>

      <section className={styles.runSection}>
        <div className={styles.runHeader}>
          <SectionHeading
            eyebrow="현장에서 운영하기"
            title="현장에서는 출석과 활동을 한 흐름에서 운영합니다."
            body="오늘 수업의 출석 상태와 활동 순서를 먼저 확인하고, 진행에 필요한 도구는 바로 곁에서 꺼내 씁니다."
          />
          <div className={styles.runFacts}>
            <span><ClipboardCheck size={18} aria-hidden /> 출석과 참여 범위</span>
            <span><Play size={18} aria-hidden /> 활동 진행 상태</span>
            <span><RotateCcw size={18} aria-hidden /> 타이머·팀·순서</span>
          </div>
        </div>
        <div className={styles.runComposition}>
          <div className={styles.runPrimary}>
            <ProductFrame src={ASSETS.session} alt="진행 중인 수업의 활동 순서, 출석과 메모가 보이는 실제 MASTER 수업 상세 화면" position="76% 50%" />
            <div className={styles.runProofLabel}><span>수업 운영의 중심</span><strong>오늘 수업 · 활동 순서 · 진행 상태</strong></div>
          </div>
          <div className={styles.runSupport}>
            <div className={styles.runAttendance}>
              <ProductFrame src={ASSETS.attendance} alt="수업반과 날짜별 출석 상태가 보이는 실제 MASTER 출석 화면" position="50% 54%" />
              <p><strong>수업반 출석과 참여 상태</strong><span>날짜별 출석을 실제 수업 흐름에 연결</span></p>
            </div>
            <div className={styles.runUtility}>
              <ProductFrame src={ASSETS.tools} alt="스탑워치, 타이머, 점수판, 팀 나누기가 보이는 실제 수업 도구 화면" position="50% 20%" />
              <p><strong>필요할 때 바로 쓰는 보조 도구</strong><span>타이머 · 점수판 · 팀 나누기 · 순서 정하기</span></p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.storySection} ${styles.memorySection}`}>
        <div className={styles.storyCopy}>
          <p className={styles.stepLabel}>기억하고 이어가기 · Premium</p>
          <h2>지난 수업이 다음 준비의 출발점이 됩니다.</h2>
          <p>수업 메모와 학생 관찰, 다음 수업 노트, 보호자 안내문을 남겨 필요한 순간 다시 확인합니다. 기록은 자동으로 수업을 만들지 않습니다. 교사가 남긴 실제 맥락을 다음 준비에 활용합니다.</p>
          <ul><li>수업 메모와 학생별 관찰</li><li>이전 수업의 활동과 다음 수업 노트</li><li>보호자 안내문 저장·복사</li></ul>
        </div>
        <div className={styles.memoryVisual}>
          <ProductFrame src={ASSETS.record} alt="완료한 수업의 활동과 메모를 다음 수업 안내로 이어 쓰는 실제 MASTER 안내문 화면" ratio="portrait" position="50% 12%" />
          <div className={styles.memoryContextCrop} aria-hidden="true">
            <Image src={ASSETS.recordDetail} alt="" fill sizes="280px" />
          </div>
          <div className={styles.memoryCaption}><span>수업 후</span><strong>남긴 기록을 다음 준비에서 다시 확인</strong></div>
        </div>
      </section>
    </div>
  );
}

export function SpomoveSection() {
  return (
    <section className={styles.spomoveSection}>
      <div className={styles.spomoveCopy}>
        <p className={styles.spomoveEyebrow}>SPOMOVE · Premium</p>
        <h2>수업을 화면과 움직임으로 확장합니다.</h2>
        <p>색상·방향·숫자 같은 시각 신호를 보고 몸으로 반응하는 디지털 움직임 활동입니다. 활동을 고른 뒤 시작 화면에서 설정을 확인하고 교사가 직접 실행합니다.</p>
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
          body="SPOKEDU는 유아·초등·특수체육 수업을 직접 운영하며, 준비부터 현장 진행과 기록까지 반복해서 필요한 과정을 MASTER 안에 연결했습니다."
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
      <Link href={plan.ctaHref} className={`${styles.planButton} ${isPremium ? 'spm-btn-primary' : ''}`}>{plan.ctaLabel}</Link>
    </article>
  );
}

export function PlansSection({ product }: { product: ReturnTypeOfLandingModel }) {
  return (
    <section id="plans" className={styles.plansSection}>
      <SectionHeading
        eyebrow="Free에서 확인하고, 필요한 만큼 이어가세요"
        title="무료로 시작하고, 필요한 기능만 더하세요."
        body="Free로 먼저 둘러보고 기본 수업 도구를 사용하세요. 전체 콘텐츠와 수업 운영은 Lite, 기록과 SPOMOVE까지 이어 쓰려면 Premium을 선택할 수 있습니다."
      />
      <div className={styles.planGrid}>{product.plans.map((plan) => <PlanCard key={plan.code} plan={plan} />)}</div>
      <div className={styles.billingNotice}>
        <Sparkles size={18} aria-hidden />
        <p><strong>결제 안내</strong> Lite와 프리미엄은 선택 즉시 최초 결제되며 이후 매월 최초 결제일에 자동결제됩니다. 언제든 해지 예약이 가능하고, 해지 후에도 결제된 이용 기간 종료일까지 사용할 수 있습니다.</p>
      </div>
      <div className={styles.centerRow}>
        <div><p>{product.centerInquiry.displayName}</p><span>{product.centerInquiry.summary.join(' · ')}</span></div>
        <a href={product.centerInquiryHref} className={styles.secondaryButton}>{product.centerInquiry.ctaLabel}<ArrowRight size={16} aria-hidden /></a>
      </div>
    </section>
  );
}

const FAQS = [
  ['Free로 어디까지 사용할 수 있나요?', '로그인 후 수업 도구를 사용하고 Library 전체를 탐색할 수 있습니다. 지정된 무료 프로그램 하나는 상세 자료와 영상까지 끝까지 확인할 수 있습니다. Free는 기간이 정해진 무료체험이 아닙니다.'],
  ['Lite와 Premium의 차이는 무엇인가요?', 'Lite는 전체 수업 자료와 수업반·일정·출석·현장 도구를 연결하는 기본 운영 이용권입니다. Premium은 여기에 수업 기록, 학생 관찰, 안내문, 다음 수업 맥락과 SPOMOVE를 더합니다.'],
  ['어떤 기기에서 사용할 수 있나요?', 'MASTER는 웹에서 사용합니다. PC와 태블릿에서 준비하고, 화면 공유가 가능한 프로젝터·TV·전자칠판에서 수업 자료와 SPOMOVE를 활용할 수 있습니다.'],
  ['SPOMOVE는 별도 장비가 필요한가요?', '별도 앱 설치 없이 웹에서 실행합니다. 활동 화면을 보여줄 디스플레이가 필요하며, 활동에 따라 SPOMAT 같은 현장 교구를 함께 사용할 수 있습니다.'],
  ['특수학급이나 특수체육 수업에서도 활용할 수 있나요?', '교사가 자극 시간과 움직임 조건을 정하고 활동 난이도와 반복 활용 여부를 현장에 맞게 선택할 수 있습니다. 별도의 치료·진단 서비스는 아닙니다.'],
  ['월 결제와 해지는 어떻게 되나요?', 'Lite와 Premium은 카드 등록 후 첫 결제가 진행되고 이후 매월 자동결제됩니다. 언제든 해지를 예약할 수 있으며 현재 결제기간 종료일까지 사용한 뒤 Free로 돌아갑니다.'],
  ['학교·센터·기관도 사용할 수 있나요?', '가능합니다. 이용 인원과 운영 방식에 맞춘 안내가 필요하므로 센터·기관 문의를 이용해 주세요. 기관 이용은 개별 이용권처럼 직접 결제하지 않습니다.'],
] as const;

export function FaqAndFinalCta({ product }: { product: ReturnTypeOfLandingModel }) {
  return (
    <>
      <section className={styles.faqSection}>
        <SectionHeading eyebrow="시작하기 전에" title="자주 묻는 질문" body="무료 이용부터 자동결제와 현장 사용까지, 실제 제품 기준으로 답했습니다." />
        <div className={styles.faqList}>
          {FAQS.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}<ChevronDown size={18} aria-hidden /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className={styles.finalCta}>
        <p className={styles.eyebrow}>다음 수업 하나부터</p>
        <h2>Free로 직접 확인해 보세요.</h2>
        <p>수업 도구를 열고, Library를 둘러보고, 지정된 수업 하나를 끝까지 경험할 수 있습니다.</p>
        <div className={styles.finalActions}>
          <Link href={product.handoff.freeStartHref} className="spm-btn-primary">Free로 시작하기 <ArrowRight size={17} aria-hidden /></Link>
          <Link href={product.handoff.loginHref} className={styles.secondaryButton}>로그인</Link>
          <a href={product.centerInquiryHref} className={styles.textLink}>센터·기관 문의</a>
        </div>
      </section>
    </>
  );
}
