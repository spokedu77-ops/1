import type { summarize } from './settlementSheetCore';
import styles from './SettlementSheet.module.css';

type Summary = Pick<ReturnType<typeof summarize>, 'netAfterWh' | 'receivedNetAfterWh' | 'total' | 'cost' | 'vat' | 'wh' | 'unpaidAmount' | 'received'>;
const money = (amount: number) => Number.isFinite(amount) ? `${Math.round(amount).toLocaleString('ko-KR')}원` : '계산 확인 필요';

export default function SettlementProfitSummary({ summary, annual = false }: { summary: Summary; annual?: boolean }) {
  return <section aria-label={annual ? '연간 정산 지표' : '월별 정산 지표'} className={styles.profitSection}>
    <div className={styles.summaryGrid}>
      <div className={`${styles.hero} ${summary.netAfterWh < 0 ? styles.heroLoss : ''}`}>
        <p className={styles.heroLabel}>{annual ? '연간 정산 순수익' : '정산 순수익'} <span>· 미수금 포함</span></p>
        <p className={styles.heroValue}>{money(summary.netAfterWh)}</p>
        <div className={styles.heroFoot}><span>입금 기준 순수익 <strong>{money(summary.receivedNetAfterWh)}</strong></span><span>입금액 {money(summary.received)}</span></div>
      </div>
      <div className={styles.metrics}>
        {([['매출', summary.total], ['경비·인건비', summary.cost], ['부가세', summary.vat], ['미수금', summary.unpaidAmount]] as const).map(([label, value]) => <div key={label} className={styles.metric}><p className={styles.metricLabel}>{label}</p><p className={styles.metricValue}>{money(value)}</p></div>)}
      </div>
    </div>
    <p className={styles.profitExplanation}>순수익 = 매출 − 부가세 − 경비 − 원천징수 + 조정액 <span>원천징수 {money(summary.wh)}</span></p>
  </section>;
}
