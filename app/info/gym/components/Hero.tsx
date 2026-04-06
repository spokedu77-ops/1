'use client';

import { useCallback, useState } from 'react';
import { AGE_OPTIONS } from '../data/config';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Hero() {
  const [qAge, setQAge] = useState('');
  const [qPhone, setQPhone] = useState('');

  const prefillAndGoContact = useCallback(() => {
    const form = document.getElementById('contact') as HTMLFormElement | null;
    if (!form) {
      scrollToId('contact');
      return;
    }
    const ageEl = form.querySelector<HTMLSelectElement>('[name="age"]');
    const phoneEl = form.querySelector<HTMLInputElement>('[name="phone"]');
    if (ageEl) ageEl.value = qAge;
    if (phoneEl) phoneEl.value = qPhone;
    scrollToId('contact');
  }, [qAge, qPhone]);

  return (
    <section className="gym-hero" id="top" aria-labelledby="heroHeading">
      <div className="gym-container">
        <div className="gym-hero-grid">
          <div className="gym-hero-card">
            <div className="inner">
              <div className="gym-hero-tag">
                <span className="gym-hero-tag-dot" aria-hidden />
                SPOKEDU LAB
              </div>
              <h1 id="heroHeading">
                우리 아이에게 맞는 체육,
                <br />12주 안에 변화가 보이도록 설계합니다.
              </h1>
              <p className="gym-hero-lead">
                연세대 체교 기반 커리큘럼으로 시작하고,
                소그룹 수업과 분기 리포트로 변화를 끝까지 확인합니다.
                <br />
                서울 강동구 · 체험 수업 15,000원
              </p>
              <div className="gym-hero-actions">
                <button type="button" className="gym-btn primary" onClick={() => scrollToId('contact')}>
                  체험 수업 신청
                </button>
              </div>
              <div className="gym-hero-metrics" role="list">
                <div className="gym-metric" role="listitem">
                  <strong>연세대 체교 기반</strong>
                  <span>졸업생이 수업 흐름을 설계합니다</span>
                </div>
                <div className="gym-metric" role="listitem">
                  <strong>12주 흐름 + 분기 리포트</strong>
                  <span>변화 포인트를 보호자와 함께 확인합니다</span>
                </div>
                <div className="gym-metric" role="listitem">
                  <strong>최대 10명 소그룹</strong>
                  <span>아이별 참여 밀도를 높입니다</span>
                </div>
              </div>
            </div>
          </div>
          <aside className="gym-hero-visual" aria-label="빠른 접수">
            <div className="gym-visual-top">
              <div>
                <div className="title">아이에게 맞는 시작점 찾기</div>
                <div className="sub">연령과 연락처만 남기면 체험 수업 안내를 빠르게 도와드립니다.</div>
              </div>
            </div>
            <div className="gym-visual-body">
              <div className="gym-quick-form" role="form" aria-label="빠른 접수">
                <div className="gym-field">
                  <label htmlFor="qAge">연령</label>
                  <select id="qAge" value={qAge} onChange={(e) => setQAge(e.target.value)}>
                    <option value="">선택</option>
                    {AGE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="gym-field">
                  <label htmlFor="qPhone">연락처</label>
                  <input
                    id="qPhone"
                    placeholder="예) 01012345678"
                    value={qPhone}
                    onChange={(e) => setQPhone(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="gym-btn primary" onClick={prefillAndGoContact}>
                    체험 수업 신청
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
