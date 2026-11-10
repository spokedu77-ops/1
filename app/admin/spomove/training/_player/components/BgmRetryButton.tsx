import { useState } from 'react';

/** Recovery is visible only when BGM fails; it never restarts the activity. */
export function BgmRetryButton({ onRetry }: { onRetry: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  return <button type="button" disabled={pending} onClick={() => {
    setPending(true);
    void onRetry().finally(() => setPending(false));
  }} style={{ position:'fixed', bottom:24, left:24, zIndex:450, minHeight:44, padding:'10px 16px', borderRadius:10, background:'#fff', color:'#0f172a', border:'1px solid #cbd5e1', fontFamily:'inherit', fontWeight:700 }}>
    {pending ? 'BGM 연결 중…' : 'BGM 다시 켜기'}
  </button>;
}
