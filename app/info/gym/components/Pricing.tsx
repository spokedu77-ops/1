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
          <div className="gym-kicker">Tuition</div>
          <h2 id="pricingHeading" className="gym-section-title">
            가격 안내 — 월 단위 등록
          </h2>
          <p className="gym-section-desc">
            월 등록 기준이며, 반 편성·운영은 상담을 통해 안내합니다.
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
                  <th scope="col" style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', fontSize: 13 }}>비고</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: 13 }}><b>{row.label}</b></td>
                    <td style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: 13 }}>{row.composition}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: 13 }}><b>{row.price}</b></td>
                    <td style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: 13 }}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="gym-card" style={{ background: 'linear-gradient(180deg, rgba(18,26,46,.62), rgba(10,14,25,.7))' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>등록/운영 안내</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gym-muted)', lineHeight: 1.6 }}>
              등록은 상담 기반으로 진행합니다. 아이의 연령/경험/성향과 정원을 함께 고려해 반을 추천합니다. 12주 단위 운영을 기준으로 &quot;재등록 흐름&quot;이 자연스럽게 이어지도록 설계합니다.
            </p>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--gym-muted2)', lineHeight: 1.7 }}>
              <b>할인(선택)</b><br />
              • 형제/자매: 월 수강료 5%<br />
              • 3개월 선등록: 5%<br />
              • 6개월 선등록: 10%<br /><br />
              <b>안내</b><br />
              • 월 등록 기준, 공휴일/센터 일정에 따라 보강 정책 적용<br />
              • 본 프로그램은 의료/치료 행위가 아닌 체육 교육 프로그램입니다.
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button type="button" className="gym-btn primary" onClick={() => scrollToId('contact')}>
                상담 신청
              </button>
              <button type="button" className="gym-btn" onClick={() => window.open('http://pf.kakao.com/_VGWxeb/chat', '_blank')}>
                카카오 상담
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
