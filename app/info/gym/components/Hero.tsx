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
                MOVE CORE 중심 아동청소년 체육교육 LAB
              </div>
              <h1 id="heroHeading">
                우리 아이 운동, 어떻게 시작해야 할지 고민이라면
                <br />
                <span style={{ color: 'var(--gym-accent)' }}>SPOKEDU LAB</span>
              </h1>
              <p className="gym-hero-lead">
                PLAY - THINK - GROW를 기준으로
                아이의 움직임을 체계적으로 키웁니다.
                관찰 기반 시작점 조정, 소그룹 운영, 수업/활동 리포트까지 한 흐름으로 운영합니다.
              </p>
              <div className="gym-hero-actions">
                <button type="button" className="gym-btn primary" onClick={() => scrollToId('contact')}>
                  체험 수업 신청
                </button>
                <button type="button" className="gym-btn" onClick={() => scrollToId('lab-intro')}>
                  클래스 구조 보기
                </button>
              </div>
              <div className="gym-hero-metrics" role="list">
                <div className="gym-metric" role="listitem">
                  <strong>최대 10명 소그룹</strong>
                  <span>아이별 참여 밀도를 높이는 인원 구조</span>
                </div>
                <div className="gym-metric" role="listitem">
                  <strong>수업/활동 리포트</strong>
                  <span>매 분기 변화 포인트를 확인</span>
                </div>
                <div className="gym-metric" role="listitem">
                  <strong>관찰 기반 시작점 조정</strong>
                  <span>아이의 현재 리듬을 보고 목표를 맞춰갑니다</span>
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
