'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComputeResult } from '../types';
import Radar from './Radar';
import AxisRow from './AxisRow';
import ResultShareActions from './ResultShareActions';
import { getMoveReportUi } from '../i18n/ui';
import { formatOwnerPossessive, type MoveReportLocale } from '../lib/locale';
import { axisLabelsJoined, topAxisHighlights } from '../lib/profileAxisLabels';
import { appendMoveReportAttributionToUrl, buildMoveReportShareUrl } from '../lib/shareLink';
import { getMoveReportAttribution, pickAttributionForShareUrl } from '../lib/attribution';
import { trackMoveReportEvent } from '../lib/events';

export type ResultTab = 'report' | 'solution';

interface ResultProps {
  result: ComputeResult;
  tab: ResultTab;
  onTab: (t: ResultTab) => void;
  onReset: () => void;
  /** 이름만 바꿔 다시 진단 (설정 화면으로) */
  onAnotherChild?: () => void;
  flash: (msg: string) => void;
  /** true: 내부 실험용(교육자 섹션). 공개 `/move-report`는 항상 false로 고정 */
  showEducatorCta?: boolean;
  locale?: MoveReportLocale;
}

function DescAccordion({ desc, col, revealed }: { desc: string; col: string; revealed: boolean }) {
  return (
    <div className={`mr-result-desc-wrap ${revealed ? 'anim-rise d3' : ''}`}>
      <div className="mr-result-desc-card" style={{ borderLeftColor: col }}>
        <p className="mr-result-desc-p">{desc}</p>
      </div>
    </div>
  );
}

export default function Result({
  result,
  tab,
  onTab,
  onReset,
  onAnotherChild,
  flash,
  showEducatorCta = false,
  locale = 'ko',
}: ResultProps) {
  const { profile: p, bd, displayName, key } = result;
  const ui = useMemo(() => getMoveReportUi(locale), [locale]);
  const t = ui.result;
  const ownerPossessive = useMemo(() => formatOwnerPossessive(displayName, locale), [displayName, locale]);
  const [revealed, setRevealed] = useState(false);
  const [reportExpanded, setReportExpanded] = useState(false);
  const graphCodeStr = useMemo(
    () =>
      `${bd.social.l}${bd.social.r}${bd.structure.l}${bd.structure.r}${bd.motivation.l}${bd.motivation.r}${bd.energy.l}${bd.energy.r}`,
    [bd]
  );
  const highlights = useMemo(() => topAxisHighlights(bd, 2, locale), [bd, locale]);

  const privateConsultShareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const built = buildMoveReportShareUrl(
      window.location.origin,
      {
        v: 5,
        profileKey: key,
        graphCode: graphCodeStr,
      },
      { locale }
    );
    return appendMoveReportAttributionToUrl(built, pickAttributionForShareUrl(getMoveReportAttribution()));
  }, [key, graphCodeStr, locale]);

  const consultSummary = useMemo(
    () =>
      [
        t.consultSummaryTitle,
        `- ${t.consultName}: ${displayName}`,
        `- ${t.consultType}: ${p.char}`,
        `- ${t.consultLine}: ${p.catchcopy}`,
        `- ${t.consultApproach}: ${p.shortTip}`,
      ].join('\n'),
    [displayName, p.char, p.catchcopy, p.shortTip, t]
  );

  const handleGoPrivateConsult = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('private.moveReport.summary', consultSummary);
    if (privateConsultShareUrl) {
      window.localStorage.setItem('private.moveReport.shareUrl', privateConsultShareUrl);
    } else {
      window.localStorage.removeItem('private.moveReport.shareUrl');
    }
    void trackMoveReportEvent({
      eventName: 'move_report_private_consult_clicked',
      meta: { profileKey: key },
    });
    window.location.href = '/spokedu/private#apply';
  }, [consultSummary, privateConsultShareUrl, key]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 100);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div style={{ background: '#0D0D0D', minHeight: '100vh' }}>
      <div className="mr-result-page" style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh' }}>
        {/* 히어로 */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            background: '#0A0A0A',
          }}
        >
          <div style={{ position: 'absolute', inset: 0 }}>
            <div
              style={{
                position: 'absolute',
                top: '-10%',
                right: '-10%',
                width: '70%',
                height: '70%',
                background: `radial-gradient(circle,${p.col}35 0%,transparent 65%)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '5%',
                left: '-10%',
                width: '50%',
                height: '50%',
                background: 'radial-gradient(circle,rgba(255,176,32,.1) 0%,transparent 65%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.05,
                backgroundImage:
                  'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '8%',
                right: '5%',
                width: '180px',
                height: '180px',
                backgroundImage: `radial-gradient(circle,${p.col} 1.5px,transparent 1.5px)`,
                backgroundSize: '16px 16px',
                opacity: 0.12,
                borderRadius: '50%',
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '60px',
              background: 'linear-gradient(transparent,rgba(255,255,255,.02),transparent)',
              animation: 'scanline 5s linear infinite',
              pointerEvents: 'none',
            }}
          />

          <div className="mr-result-hero-block" style={{ position: 'relative', zIndex: 2 }}>
            <header className={`mr-result-owner ${revealed ? 'anim-rise' : ''}`}>
              <p className="mr-result-owner-kicker" style={{ color: p.col }}>
                {locale === 'en' ? `${ownerPossessive} MOVE Report` : `${ownerPossessive} MOVE 리포트`}
              </p>
              <p className="mr-result-owner-sub">{t.ownerSub}</p>
            </header>

            <div className={revealed ? 'anim-rise d1' : ''}>
              <div className="mr-result-quote" style={{ background: `${p.col}14`, borderColor: `${p.col}40` }}>
                <p className="mr-result-quote-text">&quot;{p.catchcopy}&quot;</p>
              </div>

              <div className="mr-result-identity">
                <div
                  className="mr-result-hero-emoji"
                  style={{
                    filter: `drop-shadow(0 0 20px ${p.col}70)`,
                    animation: 'floatY 3s ease-in-out infinite',
                  }}
                  aria-hidden
                >
                  {p.em}
                </div>
                <div className="mr-result-identity-text">
                  <h1 className="mr-result-hero-type" style={{ textShadow: `0 0 28px ${p.col}45` }}>
                    {p.char}
                  </h1>
                  <p className="mr-result-hero-title" style={{ backgroundImage: p.grad }}>
                    {p.title}
                  </p>
                </div>
              </div>
            </div>

            {highlights.length > 0 ? (
              <div className={`mr-result-highlight-row ${revealed ? 'anim-rise d2' : ''}`}>
                {highlights.map((h) => (
                  <span
                    key={h.label}
                    className="mr-result-highlight-chip"
                    style={{ background: `${p.col}18`, borderColor: `${p.col}40`, color: p.col }}
                  >
                    {t.highlightStrong(h.label)}
                  </span>
                ))}
              </div>
            ) : null}

            <div className={`mr-result-axis-row ${revealed ? 'anim-rise d2' : ''}`}>
              {axisLabelsJoined(key, ' · ', locale)
                .split(' · ')
                .map((label) => (
                  <span
                    key={label}
                    className="mr-result-axis-chip"
                    style={{ background: `${p.col}16`, borderColor: `${p.col}30` }}
                  >
                    {label}
                  </span>
                ))}
            </div>

            <div className={`mr-result-kw-row ${revealed ? 'anim-rise d2' : ''}`}>
              {p.kw.map((k) => (
                <span key={k} className="mr-result-kw-chip">
                  {k}
                </span>
              ))}
            </div>

            <DescAccordion desc={p.desc} col={p.col} revealed={revealed} />

            <div className="mr-result-scroll-hint" aria-hidden>
              <div className="mr-result-scroll-line" />
              <i className="fa-solid fa-chevron-down" />
              <span>{t.scrollHint}</span>
              <div className="mr-result-scroll-line mr-result-scroll-line--flip" />
            </div>
          </div>

          <div className="mr-result-topbar">
            <div className="mr-result-topbar-actions">
              <button type="button" onClick={onReset} className="mr-result-back-btn">
                <i className="fa-solid fa-arrow-left" aria-hidden />
                {t.retry}
              </button>
              {onAnotherChild ? (
                <button type="button" onClick={onAnotherChild} className="mr-result-another-btn">
                  {t.anotherChild}
                </button>
              ) : null}
            </div>
            <div className="mr-result-brand">SPOKEDU</div>
          </div>
        </div>

        {/* 탭 */}
        <div className="mr-result-tabs-wrap">
          <div className="tabs mr-tabs-html">
            {(
              [
                { id: 'report' as const, l: t.tabReport },
                { id: 'solution' as const, l: t.tabSolution },
              ] as const
            ).map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => onTab(tabItem.id)}
                className={`tab ${tab === tabItem.id ? 'on' : 'off'}`}
                style={tab === tabItem.id ? { color: p.col } : undefined}
              >
                {tabItem.l}
              </button>
            ))}
          </div>
        </div>

        <div className="mr-result-main-pad">
          {tab === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="anim-fade">
              <div className="card mr-card-html">
                <div className="card-head">
                  <div
                    className="card-head-icon"
                    style={{ ['--p-dim' as string]: `${p.col}20`, background: `var(--p-dim, ${p.col}20)` }}
                  >
                    <i className="fa-solid fa-chart-line" style={{ fontSize: '13px', color: p.col }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                      {t.radarTitle(displayName)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#A8A8A8', marginTop: '1px' }}>{t.radarSub}</div>
                  </div>
                </div>
                <div className="card-section">
                  <Radar bd={bd} col={p.col} />
                </div>
              </div>

              <div
                className="card mr-card-html"
                style={{
                  background: '#141414',
                  border: '1px solid #262626',
                  padding: '12px 14px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setReportExpanded((v) => !v)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    color: '#E8E8E8',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <span>{reportExpanded ? t.collapse : t.expand}</span>
                  <i className={`fa-solid ${reportExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: '#9A9A9A' }} />
                </button>
              </div>

              {reportExpanded ? (
                <>
                  <div className="card mr-card-html">
                    <div className="card-head">
                      <div
                        className="card-head-icon"
                        style={{ ['--p-dim' as string]: `${p.col}20`, background: `var(--p-dim, ${p.col}20)` }}
                      >
                        <i className="fa-solid fa-sliders" style={{ fontSize: '13px', color: p.col }} />
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{t.axisTitle}</div>
                    </div>
                    <div className="card-section" style={{ paddingTop: '4px' }}>
                      <AxisRow
                        label={t.axisSocial}
                        ll={bd.social.ll}
                        rl={bd.social.rl}
                        lv={bd.social.l}
                        rv={bd.social.r}
                        col="#1E90FF"
                        delay={0}
                        dominantSuffix={t.dominantSuffix}
                      />
                      <AxisRow
                        label={t.axisExplore}
                        ll={bd.structure.ll}
                        rl={bd.structure.rl}
                        lv={bd.structure.l}
                        rv={bd.structure.r}
                        col="#FF2D88"
                        delay={120}
                        dominantSuffix={t.dominantSuffix}
                      />
                      <AxisRow
                        label={t.axisMotive}
                        ll={bd.motivation.ll}
                        rl={bd.motivation.rl}
                        lv={bd.motivation.l}
                        rv={bd.motivation.r}
                        col="#FFB020"
                        delay={240}
                        dominantSuffix={t.dominantSuffix}
                      />
                      <AxisRow
                        label={t.axisEnergy}
                        ll={bd.energy.ll}
                        rl={bd.energy.rl}
                        lv={bd.energy.l}
                        rv={bd.energy.r}
                        col="#44CC00"
                        delay={360}
                        dominantSuffix={t.dominantSuffix}
                      />
                    </div>
                  </div>

                  <div className="card mr-card-html">
                    <div className="card-head">
                      <div
                        className="card-head-icon"
                        style={{ ['--p-dim' as string]: `${p.col}20`, background: `var(--p-dim, ${p.col}20)` }}
                      >
                        <i className="fa-solid fa-bolt" style={{ fontSize: '13px', color: p.col }} />
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{t.thinkTitle}</div>
                    </div>
                    <div className="card-section" style={{ paddingTop: '4px' }}>
                      {p.str.map((s, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            padding: '10px 0',
                            borderBottom: i < p.str.length - 1 ? '1px solid #1E1E1E' : 'none',
                          }}
                        >
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '7px',
                              flexShrink: 0,
                              background: `${p.col}18`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginTop: '1px',
                            }}
                          >
                            <i className="fa-solid fa-check" style={{ fontSize: '9px', color: p.col }} />
                          </div>
                          <p
                            style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: '#C0C0C0',
                              lineHeight: 1.6,
                              wordBreak: 'keep-all',
                              margin: 0,
                            }}
                          >
                            {s}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {reportExpanded ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {(
                    [
                      { label: t.bestLabel, sub: p.best.n, desc: p.best.d, top: '#FFB020' },
                      { label: t.careLabel, sub: p.care.n, desc: p.care.d, top: '#555' },
                    ] as const
                  ).map((c, i) => (
                    <div key={i} className="card mr-card-html" style={{ borderTop: `2px solid ${c.top}`, overflow: 'hidden' }}>
                      <div style={{ padding: '14px' }}>
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '.06em',
                            color: c.top,
                            marginBottom: '6px',
                          }}
                        >
                          {c.label}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>{c.sub}</div>
                        <p style={{ fontSize: '11px', color: '#999', lineHeight: 1.5, wordBreak: 'keep-all', margin: 0 }}>{c.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <ResultShareActions
                profileKey={key}
                graphCode={graphCodeStr}
                displayName={displayName}
                flash={flash}
                showEducatorCta={showEducatorCta}
                locale={locale}
              />
            </div>
          )}

          {tab === 'solution' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="anim-fade">
              <div style={{ background: `${p.col}12`, border: `1px solid ${p.col}35`, borderRadius: '16px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '18px' }}>💬</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: p.col, letterSpacing: '.04em' }}>
                    {t.tipTitle(displayName)}
                  </span>
                </div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1.5, wordBreak: 'keep-all', margin: 0 }}>
                  {p.shortTip}
                </p>
              </div>

              <div className="card mr-card-html">
                <div className="card-head">
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      flexShrink: 0,
                      background: `${p.col}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="fa-solid fa-bolt" style={{ fontSize: '13px', color: p.col }} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                    {t.envTitle(displayName)}
                  </div>
                </div>
                <div className="card-section" style={{ paddingTop: '4px' }}>
                  {p.env.map((e, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px 0',
                        borderBottom: i < p.env.length - 1 ? '1px solid #1E1E1E' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '15px', flexShrink: 0, lineHeight: '22px' }}>✅</span>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#CCCCCC', lineHeight: 1.55, wordBreak: 'keep-all', margin: 0 }}>
                        {e}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {p.weak ? (
                <div className="card mr-card-html" style={{ borderLeft: '3px solid #555' }}>
                  <div className="card-head" style={{ borderBottom: '1px solid #1E1E1E' }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        flexShrink: 0,
                        background: 'rgba(255,255,255,.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>🌱</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#BBBBBB' }}>
                        {t.weakTitle(displayName)}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#DDDDDD', marginTop: '2px' }}>{p.weak.title}</div>
                    </div>
                  </div>
                  <div className="card-section">
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#BBBBBB', lineHeight: 1.65, wordBreak: 'keep-all', margin: 0 }}>
                      {p.weak.desc}
                    </p>
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  background: '#161616',
                  border: '1px solid #2A2A2A',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'Bebas Neue,sans-serif',
                    fontSize: '20px',
                    color: '#FF4B1F',
                    flexShrink: 0,
                    textShadow: '0 0 10px rgba(255,75,31,.4)',
                  }}
                >
                  S
                </div>
                <p style={{ fontSize: '12px', fontWeight: 500, color: '#BBBBBB', lineHeight: 1.5, wordBreak: 'keep-all', margin: 0 }}>
                  {t.brandBlurb(displayName)}
                </p>
              </div>

              {/* 영문: 국내 인스타/홈 전환 CTA는 신뢰·맥락이 약해 숨김 */}
              {locale !== 'en' ? (
                <a
                  href="https://www.instagram.com/spokedu_kids?igsh=M2ZmYWZxMzRxenVt&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', textDecoration: 'none', background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', borderRadius: '16px', padding: '2px' }}
                >
                  <div
                    style={{
                      background: '#111',
                      borderRadius: '14px',
                      padding: '18px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          flexShrink: 0,
                          background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <i className="fa-brands fa-instagram" style={{ fontSize: '22px', color: '#fff' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '3px' }}>{t.igTitle}</div>
                        <div style={{ fontSize: '12px', color: '#AAAAAA' }}>{t.igSub}</div>
                      </div>
                    </div>
                  </div>
                </a>
              ) : null}

              <p
                style={{
                  fontSize: '11px',
                  color: '#777',
                  textAlign: 'center',
                  lineHeight: 1.6,
                  fontWeight: 500,
                  padding: '4px 0 20px',
                  wordBreak: 'keep-all',
                }}
              >
                {t.footerNote}
              </p>
            </div>
          )}

          {/* 영문 버전은 국내 상담(/spokedu)으로 보내지 않음 */}
          {locale !== 'en' ? (
            <section
              style={{
                marginTop: 18,
                borderRadius: 14,
                border: `1px solid ${p.col}44`,
                background: `${p.col}14`,
                padding: '16px 14px',
              }}
            >
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#d4d4d8', lineHeight: 1.6 }}>
                {t.consultBody}
              </p>
              <button
                type="button"
                onClick={handleGoPrivateConsult}
                className="btn-fire"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {t.consultCta}
              </button>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
