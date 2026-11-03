import type { summarize } from './settlementSheetCore';
import styles from './SettlementSheet.module.css';

type Summary = Pick<ReturnType<typeof summarize>, 'netAfterWh' | 'receivedNetAfterWh' | 'outstandingNetAfterWh' | 'total' | 'cost' | 'vat' | 'wh' | 'unpaidAmount' | 'received'>;
const money = (amount: number) => Number.isFinite(amount) ? `${Math.round(amount).toLocaleString('ko-KR')}원` : '계산 확인 필요';

export default function SettlementProfitSummary({ summary, annual = false }: { summary: Summary; annual?: boolean }) {
  return <section aria-label={annual ? '연간 정산 지표' : '월별 정산 지표'} className={styles.profitSection}>
    <dl className={styles.profitOverview}>
      <div className={`${styles.profitCard} ${styles.profitTotal} ${summary.netAfterWh < 0 ? styles.profitTotalLoss : ''}`}>
        <dt className={styles.profitCardLabel}>{annual ? '연간 정산 순수익' : '정산 순수익'}<span className={styles.profitBadge}>미수금 포함</span></dt>
        <dd className={styles.profitCardBody}><span className={styles.profitCardValue}>{money(summary.netAfterWh)}</span><span className={styles.profitCardHint}>입금 기준 순수익 + 미수금 순수익</span></dd>
      </div>
      <div className={`${styles.profitCard} ${styles.profitReceived} ${summary.receivedNetAfterWh < 0 ? styles.profitNegative : ''}`}>
        <dt className={styles.profitCardLabel}>입금 기준 순수익<span className={styles.profitBadge}>입금분</span></dt>
        <dd className={styles.profitCardBody}><span className={styles.profitCardValue}>{money(summary.receivedNetAfterWh)}</span><span className={styles.profitCardHint}>수업별 순수익에 입금 비율 반영</span></dd>
      </div>
      <div className={`${styles.profitCard} ${summary.unpaidAmount > 0 ? styles.profitOutstanding : ''} ${summary.outstandingNetAfterWh < 0 ? styles.profitNegative : ''}`}>
        <dt className={styles.profitCardLabel}>미수금 순수익<span className={styles.profitBadge}>미입금분</span></dt>
        <dd className={styles.profitCardBody}><span className={styles.profitCardValue}>{money(summary.outstandingNetAfterWh)}</span><span className={styles.profitCardHint}>수업별 순수익에 미입금 비율 반영</span></dd>
      </div>
    </dl>
    <dl className={styles.profitMetrics}>
      {([['매출', summary.total], ['입금액', summary.received], ['미수금', summary.unpaidAmount], ['경비·인건비', summary.cost], ['부가세', summary.vat]] as const).map(([label, value]) => <div key={label} className={styles.profitMetric}><dt>{label}</dt><dd>{money(value)}</dd></div>)}
    </dl>
    <p className={styles.profitExplanation}>순수익 = 매출 − 부가세 − 경비 − 원천징수 + 조정액 <span>원천징수 {money(summary.wh)}</span></p>
  </section>;
}
