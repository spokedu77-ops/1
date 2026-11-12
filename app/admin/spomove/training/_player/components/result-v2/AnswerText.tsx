import { Fragment } from 'react';

const COLORS: Record<string, string> = {
  빨강: '#ef4444', 노랑: '#facc15', 초록: '#22c55e', 파랑: '#3b82f6',
  주황: '#f97316', 보라: '#a855f7', 분홍: '#ec4899',
  하양: '#fff', 흰색: '#fff', 검정: '#111827', 검은색: '#111827', 회색: '#94a3b8',
};

/** Keep every answer's written color accessible alongside its actual swatch. */
export function AnswerText({ text }: { text: string }) {
  return <>{text.split(/(빨강|노랑|초록|파랑|주황|보라|분홍|하양|흰색|검정|검은색|회색)/g).map((part, index) => COLORS[part]
    ? <span key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, verticalAlign: 'middle', whiteSpace: 'nowrap', color: 'inherit', fontWeight: 'inherit' }}><i aria-hidden="true" style={{ display: 'inline-block', width: 13, height: 13, borderRadius: 4, border: '1px solid #94a3b8', background: COLORS[part], flexShrink: 0 }} />{part}</span>
    : <Fragment key={index}>{part}</Fragment>)}</>;
}
