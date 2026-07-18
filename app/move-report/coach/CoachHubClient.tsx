'use client';

import Link from 'next/link';
import { coachUi } from '../i18n/coachUi';

export default function CoachHubClient() {
  const t = coachUi.hub;

  return (
    <main className="mr-page mr-coach-hub-page">
      <div className="mr-page-inner mr-content-max" style={{ paddingTop: 36, paddingBottom: 48 }}>
        <Link href="/move-report" className="btn-ghost mr-coach-back" style={{ textDecoration: 'none', marginBottom: 28 }}>
          ← 부모용 MOVE REPORT
        </Link>

        <header style={{ marginBottom: 28 }}>
          <p
            style={{
              margin: '0 0 10px',
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 14,
              letterSpacing: '0.14em',
              color: '#FF4B1F',
            }}
          >
            SPOKEDU · COACH
          </p>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', wordBreak: 'keep-all' }}>
            {t.title}
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: '#CCCCCC', lineHeight: 1.6, wordBreak: 'keep-all' }}>
            {t.lead}
          </p>
          <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 500, color: '#888', lineHeight: 1.55, wordBreak: 'keep-all' }}>
            {t.note}
          </p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          <Link href="/move-report/coach/observe" className="btn-fire" style={{ textDecoration: 'none', justifyContent: 'center' }}>
            {t.startCta}
          </Link>
          <Link
            href="/move-report/coach/history"
            className="btn-ghost"
            style={{ textDecoration: 'none', justifyContent: 'center', minHeight: 48 }}
          >
            {t.historyCta}
          </Link>
        </div>

        <section
          style={{
            borderRadius: 16,
            border: '1px solid #2A2A2A',
            background: '#161616',
            padding: '18px 16px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#BBBBBB' }}>{t.parentLinkTitle}</h2>
          <p style={{ margin: '8px 0 14px', fontSize: 13, color: '#888', lineHeight: 1.55, wordBreak: 'keep-all' }}>
            {t.parentLinkBody}
          </p>
          <Link
            href="/move-report/coach/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#FFB020',
              textDecoration: 'none',
            }}
          >
            {t.parentLinkCta} →
          </Link>
        </section>
      </div>
    </main>
  );
}
