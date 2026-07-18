'use client';

import { useMemo } from 'react';
import { getMoveReportUi } from '../i18n/ui';
import type { MoveReportLocale } from '../lib/locale';

interface IntroProps {
  onStart: () => void;
  /** /move-report?coach=… 전용 링크 유입 시 안내 배너 */
  coachLinkActive?: boolean;
  locale?: MoveReportLocale;
}

/** 인트로: 브랜딩 + 고정 안내 띠(비스크롤) + CTA */
export default function Intro({ onStart, coachLinkActive, locale = 'ko' }: IntroProps) {
  const ui = useMemo(() => getMoveReportUi(locale), [locale]);
  const t = ui.intro;

  return (
    <div className="page mr-intro-page" style={{ background: '#0D0D0D', position: 'relative', overflow: 'hidden', minHeight: '100dvh' }}>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'linear-gradient(#1A1A1A 1px,transparent 1px),linear-gradient(90deg,#1A1A1A 1px,transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.6,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '-120px',
          right: '-80px',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle,rgba(255,75,31,.18) 0%,transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        className="mr-content-max mr-intro-scroll"
        style={{ position: 'relative', zIndex: 1, padding: '0 max(20px, env(safe-area-inset-left))', paddingTop: '36px', paddingBottom: 'min(200px, 28vh)' }}
      >
        {coachLinkActive ? (
          <div
            className="anim-rise mr-intro-coach-banner"
            style={{
              marginBottom: '20px',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid #2A3A4A',
              background: 'rgba(30,144,255,.12)',
              fontWeight: 600,
              color: '#B8D4FF',
              lineHeight: 1.55,
              wordBreak: 'keep-all',
            }}
          >
            {t.coachBanner}
          </div>
        ) : null}
        <div className="anim-rise" style={{ marginBottom: '36px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                fontFamily: 'Bebas Neue,sans-serif',
                fontSize: 'clamp(44px, 12vw, 64px)',
                lineHeight: 1,
                letterSpacing: '0.22em',
                color: '#FF4B1F',
                fontWeight: 900,
                textShadow: '0 0 32px rgba(255,75,31,.45)',
                WebkitTextStroke: '0.5px rgba(255,75,31,.35)',
              }}
            >
              SPOKEDU
            </div>
            <div style={{ width: '160px', height: '4px', borderRadius: '2px', background: 'linear-gradient(90deg,#FF4B1F,transparent)' }} />
          </div>
        </div>

        <div className="mr-intro-product-lockup anim-rise">MOVE REPORT</div>

        <div className="anim-rise d1" style={{ marginBottom: '8px' }}>
          <p className="mr-intro-lead">{t.lead}</p>
          <h1
            className="mr-intro-display"
            style={{
              fontFamily: 'Black Han Sans,sans-serif',
              lineHeight: 0.95,
              color: '#fff',
              letterSpacing: '-.02em',
              marginBottom: '0',
              margin: 0,
            }}
          >
            MOVE
            <br />
            <span
              style={{
                WebkitTextStroke: '2px #FF4B1F',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 20px rgba(255,75,31,.5))',
              }}
            >
              {t.reportWord}
            </span>
          </h1>
        </div>

        <div className="anim-rise d2" style={{ marginBottom: '24px' }}>
          <p
            className="mr-intro-meta"
            style={{
              margin: '0 0 12px 0',
              fontWeight: 700,
              letterSpacing: '.06em',
              color: '#FFB020',
            }}
          >
            {t.meta}
          </p>
          <p
            className="mr-intro-copy"
            style={{
              fontWeight: 500,
              color: '#DDDDDD',
              lineHeight: 1.65,
              wordBreak: 'keep-all',
              borderLeft: '2px solid #FF4B1F55',
              paddingLeft: '14px',
              marginTop: '0',
            }}
          >
            {t.copyBefore}
            <span style={{ color: '#FF4B1F', fontWeight: 700 }}>{t.copyAccent}</span>
            {locale === 'en' ? ' ' : null}
            <br />
            {t.copyAfter}
          </p>
        </div>

        <div className="anim-rise d3" style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0',
              background: '#181818',
              border: '1px solid #2A2A2A',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            {[
              { abbr: 'M', col: '#FF4B1F' },
              { abbr: 'O', col: '#FFB020' },
              { abbr: 'V', col: '#44CC00' },
              { abbr: 'E', col: '#4A9FFF' },
            ].map((item, i) => (
              <span
                key={i}
                style={{
                  fontFamily: 'Bebas Neue,sans-serif',
                  fontSize: '22px',
                  color: item.col,
                  textShadow: `0 0 10px ${item.col}`,
                  padding: '8px 9px',
                  lineHeight: 1,
                }}
              >
                {item.abbr}
              </span>
            ))}
            <div style={{ width: '1px', height: '24px', background: '#2A2A2A', margin: '0 2px' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#CCCCCC', letterSpacing: '.04em', padding: '0 14px 0 8px', lineHeight: 1 }}>
              {t.moveTypes}
            </span>
          </div>
        </div>

        <div
          className="anim-rise d4"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: '1px',
            background: '#222',
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '32px',
          }}
        >
          {t.stats.map((s, i) => (
            <div key={i} style={{ background: '#161616', padding: '18px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '30px', color: '#fff', lineHeight: 1 }}>{s.n}</div>
              <div className="mr-intro-stat-label" style={{ fontWeight: 600, color: '#A8A8A8', marginTop: '4px', letterSpacing: '.04em' }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <div className="anim-rise d4" style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span className="mr-intro-fineprint" style={{ color: '#777', fontWeight: 500, letterSpacing: '.04em' }}>
            {t.fineprint}
          </span>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '116px',
          left: 0,
          right: 0,
          zIndex: 10,
          padding: '0 16px',
        }}
      >
        <div
          className="mr-content-max"
          style={{
            margin: '0 auto',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid #2A2A2A',
            background: 'rgba(22,22,22,.92)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <p
            className="mr-intro-strip"
            style={{
              margin: 0,
              fontWeight: 600,
              color: '#9A9A9A',
              lineHeight: 1.55,
              textAlign: 'center',
              wordBreak: 'keep-all',
            }}
          >
            {t.strip}
          </p>
        </div>
      </div>

      <div className="mr-intro-cta-bar">
        <div className="mr-content-max" style={{ margin: '0 auto' }}>
          <button type="button" onClick={onStart} className="btn-fire mr-btn-fire-html">
            <span>{t.cta}</span>
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,.15)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fa-solid fa-chevron-right" style={{ fontSize: '10px' }} />
            </span>
          </button>
          <p className="mr-intro-foot-hint" style={{ textAlign: 'center', color: '#AAAAAA', marginTop: '8px', fontWeight: 500 }}>
            {t.footHint}
          </p>
        </div>
      </div>
    </div>
  );
}
