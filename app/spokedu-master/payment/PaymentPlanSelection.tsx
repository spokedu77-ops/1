'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Crown, Loader2, Lock } from 'lucide-react';
import { MASTER_CENTER_INQUIRY_HREF, type MasterProductCatalogItem } from '../lib/productCatalog';
import type { MasterGateContext, MasterGateDisplayModel } from '../lib/masterGateIntent';
import { canStartPaidPlanCheckout, type SubscriptionSummaryData, type getSubscriptionDisplaySummary, type getPaymentPageMode } from '../profile/subscriptionSummary';
import { PAYMENT_PLAN_COPY } from './planPresentation';
import { PlanComparison } from './PlanComparison';
import styles from './PaymentStitch.module.css';

type PlanId = 'lite' | 'premium';
type Props = {
  gateContext: MasterGateContext; gateDisplay: MasterGateDisplayModel | null; selectedLessonTitle?: string;
  selectedPlan: PlanId; selectedProduct: MasterProductCatalogItem; directProducts: MasterProductCatalogItem[];
  subscription: SubscriptionSummaryData | null; subscriptionDisplay: ReturnType<typeof getSubscriptionDisplaySummary>;
  paymentPageMode: ReturnType<typeof getPaymentPageMode>; showPlanSelection: boolean; loading: boolean;
  workingPlan: PlanId | null; tossSdkStatus: 'loading' | 'ready' | 'missing-config' | 'load-error';
  upgradeQuote: { amountDueNow: number; nextBillingAt: string; nextBillingAmount: number } | null;
  error: string; userEmail: string; billingNotices: readonly string[];
  onChoose: (plan: PlanId) => void; onCheckout: (plan: PlanId) => void; onBack: () => void;
};

function formatBillingDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { year:'numeric', month:'long', day:'numeric', timeZone:'Asia/Seoul' }).format(new Date(value));
}

export function PaymentPlanSelection({ gateContext, gateDisplay, selectedLessonTitle, selectedPlan, selectedProduct, directProducts, subscription, subscriptionDisplay, paymentPageMode, showPlanSelection, loading, workingPlan, tossSdkStatus, upgradeQuote, error, userEmail, billingNotices, onChoose, onCheckout, onBack }: Props) {
  return <div className={styles.page} data-payment-stitch>
    <header className={styles.header}><button type="button" onClick={onBack} aria-label="이전 화면"><ArrowLeft size={20} /></button><h1>이용권 선택</h1></header>
    <main className={styles.main}>
      {gateDisplay && gateContext.resource.kind === 'program' && gateContext.intent === 'open_library' ? <section className={styles.banner} data-payment-lesson-banner>
        <div className={styles.bannerBody}><Lock size={16} /><div><span className={styles.bannerLabel}>라이트 이용권 안내</span><h2>선택한 수업은 라이트 이용권으로 이용할 수 있습니다.</h2><p>라이트 이용권을 구독하면 놀이체육 수업 자료를 이용할 수 있습니다. 구독 후 선택한 수업으로 돌아갑니다.</p>{selectedLessonTitle ? <p>선택한 수업 · <strong>{selectedLessonTitle}</strong></p> : null}</div></div>
        <Link href={gateContext.next}>이전 화면으로 돌아가기</Link>
      </section> : gateDisplay && gateContext.intent !== 'open_library' ? <section className={styles.banner}><div><h2>{gateDisplay.title}</h2><p>{gateDisplay.description}</p></div><Link href={gateContext.next}>이전 화면으로 돌아가기</Link></section> : null}

      {loading ? <section className={styles.notice} role="status"><Loader2 size={22} className="animate-spin" aria-label="이용권 확인 중" /></section> : !showPlanSelection ? <section className={styles.notice}>
        <h2>{gateDisplay?.intent === 'start_spomove' ? '현재 이용권에서는 SPOMOVE를 실행할 수 없습니다.' : `${subscriptionDisplay.planLabel} 이용 중`}</h2>
        <p>{subscriptionDisplay.state === 'cancelScheduled' ? subscriptionDisplay.description : '현재 이용권이 활성화되어 있습니다.'}</p>
        <Link href="/spokedu-lab/subscription">구독 관리</Link>
      </section> : <>
        {paymentPageMode === 'liteUpgrade' ? <section className={styles.notice}><p>현재 <strong>{subscriptionDisplay.planLabel}</strong>을 이용 중입니다. 프리미엄으로 올리면 SPOMOVE 활동과 전체 화면 실행이 추가됩니다. 오늘 결제액은 라이트 잔여 기간을 반영한 서버 계산 차액입니다.</p></section> : null}
        {paymentPageMode !== 'liteUpgrade' && tossSdkStatus !== 'ready' ? <section className={styles.notice} aria-live="polite"><p>{tossSdkStatus === 'loading' ? '안전한 결제창을 준비하고 있습니다.' : tossSdkStatus === 'missing-config' ? '결제 설정이 완료되지 않아 지금은 결제를 시작할 수 없습니다.' : '결제 모듈을 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 새로고침해 주세요.'}</p>{tossSdkStatus === 'load-error' ? <button type="button" onClick={() => window.location.reload()}>결제 모듈 다시 불러오기</button> : null}</section> : null}
        <div className={styles.planGrid}>
          {directProducts.map(product => {
            const planId = product.serverPlanKey;
            if (!planId) return null;
            const copy = PAYMENT_PLAN_COPY[planId];
            const selected = selectedPlan === product.id;
            const planAllowedForIntent = gateContext.allowedPlans.includes(planId);
            const selectable = subscription !== null && workingPlan === null && planAllowedForIntent && canStartPaidPlanCheckout(subscription, planId);
            const sdkReadyForPlan = paymentPageMode === 'liteUpgrade' || tossSdkStatus === 'ready';
            const disabled = !selectable || !sdkReadyForPlan;
            const disabledHint = !planAllowedForIntent ? '현재 이용하려는 SPOMOVE 기능은 프리미엄에서 사용할 수 있습니다.' : paymentPageMode === 'liteUpgrade' && planId === 'lite' ? '현재 라이트 이용 중입니다.' : !sdkReadyForPlan ? '결제 설정을 확인해 주세요.' : undefined;
            return <section key={product.id} className={`${styles.plan} ${planId === 'premium' ? styles.premium : ''}`} data-selected={selected} data-payment-plan={planId}>
              <button type="button" className={styles.planSelect} aria-label={`${product.displayName.replace('SPOKEDU LAB ', '')} 이용권 선택`} aria-pressed={selected} disabled={!selectable} onClick={() => onChoose(planId)} />
              <div className={styles.planContent}>
                <div className={styles.planTop}><div className={styles.premiumName}>{planId === 'premium' ? <Crown size={20} aria-hidden /> : null}<h2>{product.displayName.replace('SPOKEDU LAB ', '')}</h2></div>{selected ? <span className={styles.selected}><CheckCircle2 size={12} />선택됨</span> : null}</div>
                <p className={styles.price}>{product.priceLabel}</p><p className={styles.planDescription}>{copy.description}</p>
                <ul className={styles.features}>{copy.features.map(item => <li key={item}><CheckCircle2 size={14} aria-hidden /><span>{item}</span></li>)}</ul>
              </div>
              <button type="button" disabled={disabled} onClick={() => onCheckout(planId)} aria-pressed={selected} className={styles.checkout} data-plan-id={planId}>
                {workingPlan === product.id ? <Loader2 size={15} className="animate-spin" /> : null}{paymentPageMode === 'liteUpgrade' && planId === 'premium' ? '프리미엄으로 업그레이드' : `${product.displayName.replace('SPOKEDU LAB ', '')} 구독하기`}
              </button>
              {disabled && disabledHint ? <p className={styles.disabledHint}>{disabledHint}</p> : null}
            </section>;
          })}
        </div>
        <PlanComparison />
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        <section className={styles.summary} data-payment-summary aria-live="polite">
          <h2>결제 예정 정보</h2>
          <div className={styles.summaryGrid}>
            <div><dl><dt>선택한 이용권</dt><dd>{selectedProduct.displayName}</dd></dl><span className={styles.period}>월 정기구독</span></div>
            <div><dl><dt>{paymentPageMode === 'liteUpgrade' ? '오늘 결제하는 차액' : '결제 예정 금액'}</dt><dd>{paymentPageMode === 'liteUpgrade' ? (upgradeQuote ? `${upgradeQuote.amountDueNow.toLocaleString('ko-KR')}원` : '서버 견적 확인 중') : `${selectedProduct.monthlyPriceKrw?.toLocaleString('ko-KR')}원`}</dd></dl><p>월 결제 · 부가세 포함</p><p><Link href="/spokedu-lab/subscription">마이페이지에서 정기구독을 해지할 수 있습니다.</Link></p></div>
            <div><strong>등록한 결제 수단으로 매월 정기결제가 진행됩니다.</strong>{paymentPageMode === 'liteUpgrade' ? <><p>다음 결제일: {upgradeQuote ? formatBillingDate(upgradeQuote.nextBillingAt) : '견적 확인 후 표시'}</p><p>다음 결제 금액: {upgradeQuote ? `${upgradeQuote.nextBillingAmount.toLocaleString('ko-KR')}원` : '견적 확인 후 표시'}</p></> : null}</div>
          </div>
        </section>
        <section className={styles.notice}><h2>정기결제 · 해지 안내</h2><ul>{billingNotices.map(item => <li key={item}>{item}</li>)}</ul><Link href="/spokedu-lab/terms">이용약관</Link><Link href="/spokedu-lab/privacy">개인정보처리방침</Link><Link href="/spokedu-lab/terms#refund">해지·환불정책</Link></section>
        <div className={styles.notice}><p>결제 계정: {userEmail}</p><a href={MASTER_CENTER_INQUIRY_HREF}>센터·기관 도입 문의</a></div>
      </>}
      {!showPlanSelection && error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </main>
  </div>;
}
