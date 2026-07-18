'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Result, { type ResultTab } from '../../components/Result';
import { coachUi } from '../../i18n/coachUi';
import {
  clearCoachObserveHistory,
  formatCoachObserveWhen,
  getCoachObserveHistoryItem,
  listCoachObserveHistory,
  type CoachObserveHistoryItem,
} from '../../lib/coachObserveHistory';

export default function CoachHistoryClient() {
  const t = coachUi.history;
  const [items, setItems] = useState<CoachObserveHistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<ResultTab>('report');
  const [toast, setToast] = useState('');

  const refresh = useCallback(() => {
    setItems(listCoachObserveHistory());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  }, []);

  const selected = selectedId ? getCoachObserveHistoryItem(selectedId) : null;

  if (selected?.result) {
    return (
      <>
        <Result
          locale="ko"
          variant="coachObserve"
          result={selected.result}
          tab={tab}
          onTab={setTab}
          onReset={() => {
            setSelectedId(null);
            setTab('report');
            refresh();
          }}
          resetLabel="목록으로"
          onAnotherChild={() => {
            window.location.href = '/move-report/coach/observe';
          }}
          flash={flash}
          showEducatorCta={false}
        />
        {toast ? (
          <div className="toast-bar toast-bar--top" role="status">
            {toast}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <main className="mr-page">
      <div className="mr-page-inner mr-content-max" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <Link href="/move-report/coach" className="btn-ghost mr-coach-back" style={{ textDecoration: 'none', marginBottom: 24 }}>
          ← {t.back}
        </Link>

        <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#fff' }}>{t.title}</h1>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#999', lineHeight: 1.55, wordBreak: 'keep-all' }}>{t.lead}</p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <Link
            href="/move-report/coach/observe"
            className="btn-fire"
            style={{ textDecoration: 'none', justifyContent: 'center', flex: '1 1 160px' }}
          >
            {t.start}
          </Link>
          {items.length > 0 ? (
            <button
              type="button"
              className="btn-ghost"
              style={{ minHeight: 48, flex: '0 0 auto' }}
              onClick={() => {
                if (!window.confirm('이 기기의 관찰 이력을 모두 지울까요?')) return;
                clearCoachObserveHistory();
                refresh();
                flash('이력을 비웠어요');
              }}
            >
              {t.clear}
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p style={{ margin: 0, padding: '28px 16px', textAlign: 'center', color: '#777', fontSize: 14, lineHeight: 1.6 }}>
            {t.empty}
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setTab('report');
                    setSelectedId(item.id);
                    window.scrollTo(0, 0);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '16px 14px',
                    borderRadius: 14,
                    border: '1px solid #2A2A2A',
                    background: '#161616',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{item.profileTitle}</span>
                    <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>{formatCoachObserveWhen(item.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#A8A8A8', marginBottom: 6 }}>
                    {item.ageGroup === 'preschool' ? t.agePreschool : t.ageElementary}
                    {' · '}
                    {item.profileKey}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#CCCCCC', lineHeight: 1.45, wordBreak: 'keep-all' }}>
                    {item.catchcopy}
                  </p>
                  <span style={{ display: 'inline-block', marginTop: 10, fontSize: 12, fontWeight: 700, color: '#FFB020' }}>
                    {t.open} →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {toast ? (
        <div className="toast-bar toast-bar--top" role="status">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
