import { Check } from 'lucide-react';
import { PAYMENT_COMPARISON_ROWS } from './planPresentation';
import styles from './PaymentStitch.module.css';

export function PlanComparison() {
  return <section className={styles.comparison} aria-labelledby="plan-comparison-title">
    <div className={styles.comparisonHeader}>
      <div><h2 id="plan-comparison-title">이용권별 기능 비교</h2><p>이용권별 제공 기능을 비교하고 수업에 적합한 이용권을 선택해 보세요.</p></div>
    </div>
    <table className={styles.table}>
      <colgroup><col style={{width:'50%'}} /><col style={{width:'25%'}} /><col style={{width:'25%'}} /></colgroup>
      <thead><tr><th scope="col">제공 기능</th><th scope="col">라이트</th><th scope="col">프리미엄</th></tr></thead>
      <tbody>{PAYMENT_COMPARISON_ROWS.map(row => <tr key={row.id} className={row.id === 'spomove' ? styles.premiumRow : undefined}>
        <th scope="row">{row.label}</th>
        {[row.lite,row.premium].map((value,i) => <td key={i} data-unavailable={value === '미제공' || undefined}><span>{value === '제공' ? <Check size={14} aria-hidden /> : null}{value}</span></td>)}
      </tr>)}</tbody>
    </table>
  </section>;
}
