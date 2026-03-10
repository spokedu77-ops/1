'use client';

import { REPORT_METRICS, SLIDES_DATA } from '../data/config';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

const reportImage = SLIDES_DATA.find((s) => s.src && s.title === '리포트')?.src ?? SLIDES_DATA[4]?.src ?? null;

export default function Report() {
  return (
    <section id="report" className="gym-section" aria-labelledby="reportHeading">
      <div className="gym-container">
        <div className="gym-section-head" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
          <div>
            <div className="gym-kicker">Growth Report</div>
            <h2 id="reportHeading" className="gym-section-title">
              성장 리포트
            </h2>
            <p className="gym-section-desc">
              학원형 운영에서 가장 강한 설득은 &quot;문구&quot;가 아니라 <b>기준표 + 코치 코멘트</b>입니다.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="gym-btn" onClick={() => scrollToId('contact')}>
              리포트 안내 요청
            </button>
            <button type="button" className="gym-btn" onClick={() => window.open('http://pf.kakao.com/_VGWxeb/chat', '_blank')}>
              카카오 상담
            </button>
          </div>
        </div>
        <div
          style={{
            borderRadius: 'var(--gym-r-lg)',
            border: '1px solid var(--gym-line)',
            background: 'linear-gradient(180deg, rgba(18,26,46,.55), rgba(10,14,25,.6))',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--gym-muted2)' }}>Week 12 분기 리포트 요약(샘플)</span>
            <span style={{ fontSize: 12, padding: '8px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.03)' }}>Sample · <b>Quarter Report</b></span>
          </div>
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="gym-card">
              <h3 style={{ margin: 0, fontSize: 14 }}>Key Metrics (Sample)</h3>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {REPORT_METRICS.map((m) => (
                  <div key={m.key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 44px', gap: 10, alignItems: 'center', fontSize: 12, color: 'rgba(234,240,255,.88)' }}>
                    <span>{m.key}</span>
                    <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${m.value}%`, background: 'linear-gradient(135deg, rgba(200,243,74,.95), rgba(139,233,255,.75))', borderRadius: 999 }} />
                    </div>
                    <span>{m.value}</span>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--gym-muted)' }}>
                <b style={{ color: 'var(--gym-accent)' }}>Next Goal:</b> Stop &amp; Go 전환 3회 연속 + 팀 게임에서 역할 수행 언어화
              </p>
            </div>
            <div style={{ minHeight: 280, borderRadius: 18, border: '1px solid rgba(255,255,255,.12)', overflow: 'hidden', background: 'rgba(255,255,255,.03)' }}>
              {reportImage ? (
                <img src={reportImage} alt="리포트 샘플" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gym-muted2)', fontSize: 13 }}>
                  리포트 샘플 이미지
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
