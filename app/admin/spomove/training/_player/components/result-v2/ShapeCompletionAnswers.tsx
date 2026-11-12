import type { ShapeCompletionRecord } from '../../lib/shapeCompletionRecord';
import { COLORS } from '../../constants';

export function ShapeCompletionAnswers({ record }: { record?: ShapeCompletionRecord }) {
  return <div>
    <p style={{ fontSize: 12, color: 'var(--spm-result-muted)', marginBottom: 12 }}>라운드별로 공개된 정답 색입니다.</p>
    {record?.length ? <ol style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, padding: 0, margin: 0, listStyle: 'none', maxHeight: 380, overflowY: 'auto' }}>
      {record.map(answer => {
        const color = COLORS.find(item => item.id === answer.colorId);
        return <li key={answer.round} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid var(--spm-result-edge)', borderRadius: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--spm-result-muted)' }}>{answer.round}라운드</span>
          <i aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, background: color?.bg, border: '1px solid #0002' }} />
          <strong style={{ fontSize: 14 }}>{color?.name ?? '기록 없음'}</strong>
        </li>;
      })}
    </ol> : <p style={{ fontSize: 13, color: 'var(--spm-result-muted)' }}>공개된 정답 기록이 없습니다.</p>}
  </div>;
}
