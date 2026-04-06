'use client';

import { PRICING_ROWS } from '../data/config';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Pricing() {
  return (
    <section id="pricing" className="gym-section" aria-labelledby="pricingHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">수강료 안내</div>
          <h2 id="pricingHeading" className="gym-section-title">
            가격 안내 — 월 단위 등록
          </h2>
          <p className="gym-section-desc">
            월 등록 기준이며, 체험 후 아이의 현재 수준과 목표에 맞춰
            반 편성과 주당 수업 횟수를 안내합니다.
          </p>
        </div>
        <div className="gym-pricing-grid">
          <div className="gym-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table aria-label="수강료 안내표" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th scope="col" style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', fontSize: 13 }}>구분</th>
                  <th scope="col" style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', fontSize: 13 }}>구성</th>
                  <th scope="col" style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', fontSize: 13 }}>월 수강료</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: 13 }}>
                      <b>{row.label}</b>
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: 13 }}>{row.composition}</td>
                    <td
                      style={{
                        padding: 12,
                        borderBottom: '1px solid rgba(255,255,255,.08)',
                        fontSize: 13,
                        color: row.label === '체험 수업' ? 'var(--gym-accent)' : 'var(--gym-text)',
                        fontWeight: row.label === '체험 수업' ? 800 : 600,
                      }}
                    >
                      <b>{row.price}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="gym-card" style={{ background: 'linear-gradient(180deg, rgba(18,26,46,.62), rgba(10,14,25,.7))' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>체험/등록 안내</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gym-muted)', lineHeight: 1.6 }}>
              아이의 연령, 수업 적응 리듬, 보호자 목표를 함께 보고 반을 추천합니다.
            </p>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--gym-muted2)', lineHeight: 1.7 }}>
              <b>체험 수업</b><br />
              • 50분 체험 수업 1회: <span style={{ color: 'var(--gym-accent)', fontWeight: 700 }}>15,000원</span><br />
              • 체험 당일 상담 가능<br /><br />
              <b>할인 혜택</b><br />
              • 형제/자매: 각각 10% 할인<br />
              • 지인 소개 등록: 추천인/피추천인 각 2만원 차감(신규 등록 1회 기준)<br /><br />
              <b>운영 안내</b><br />
              • 월 등록 기준, 공휴일/센터 일정에 따라 보강 정책 적용<br />
              • 프로그램 구성은 연령과 현재 수준에 맞춰 클래스별로 안내합니다.
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button type="button" className="gym-btn primary" onClick={() => scrollToId('contact')}>
                상담 신청
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
