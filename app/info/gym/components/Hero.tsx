'use client';

import { useCallback, useState } from 'react';
import { GYM_CONFIG } from '../data/config';
import { AGE_OPTIONS } from '../data/config';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function openKakao() {
  if (typeof window !== 'undefined' && GYM_CONFIG.kakao.webUrl) {
    window.open(GYM_CONFIG.kakao.webUrl, '_blank', 'noopener,noreferrer');
  }
}

export default function Hero() {
  const [qAge, setQAge] = useState('');
  const [qPref, setQPref] = useState('');
  const [qMsg, setQMsg] = useState('');

  const prefillAndGoContact = useCallback(() => {
    const form = document.getElementById('contact') as HTMLFormElement | null;
    if (!form) {
      scrollToId('contact');
      return;
    }
    const ageEl = form.querySelector<HTMLSelectElement>('[name="age"]');
    const prefEl = form.querySelector<HTMLInputElement>('[name="pref"]');
    const msgEl = form.querySelector<HTMLTextAreaElement>('[name="msg"]');
    if (ageEl) ageEl.value = qAge;
    if (prefEl) prefEl.value = qPref;
    if (msgEl) msgEl.value = qMsg;
    scrollToId('contact');
  }, [qAge, qPref, qMsg]);

  return (
    <section className="gym-hero" id="top" aria-labelledby="heroHeading">
      <div className="gym-container">
        <div className="gym-hero-grid">
          <div className="gym-hero-card">
            <div className="inner">
              <div className="gym-hero-tag">
                <span className="gym-hero-tag-dot" aria-hidden />
                50분 수업 · 12주(1분기) 커리큘럼 · 소그룹 레벨링
              </div>
              <h1 id="heroHeading">
                즐거운 놀이체육으로
                <br />
                <span style={{ color: 'var(--gym-accent)' }}>멀티스포츠 경험</span>
                을 설계합니다.
              </h1>
              <p className="gym-hero-lead">
                스포키듀는 &quot;재미&quot;를 성과의 반대말로 두지 않습니다.{' '}
                <b>놀이 기반 몰입</b>을 통해 아이가 스포츠 상황을 이해하고,{' '}
                <b>기초 움직임 품질 + 규칙 이해 + 팀 플레이</b>를 함께 형성해{' '}
                <b>평생 체육 참여의 토대</b>를 만드는 학원형 프로그램입니다.
              </p>
              <div className="gym-hero-actions">
                <button type="button" className="gym-btn primary" onClick={() => scrollToId('contact')}>
                  체험/상담 신청
                </button>
                <button type="button" className="gym-btn" onClick={() => scrollToId('curriculum')}>
                  12주 커리큘럼
                </button>
                <button type="button" className="gym-btn" onClick={() => scrollToId('media')}>
                  사진/영상
                </button>
              </div>
              <div className="gym-hero-metrics" role="list">
                <div className="gym-metric" role="listitem">
                  <strong>50분</strong>
                  <span>수업 시간 통일<br />루틴·안전·회복</span>
                </div>
                <div className="gym-metric" role="listitem">
                  <strong>12주</strong>
                  <span>분기 단위 설계<br />누적 학습</span>
                </div>
                <div className="gym-metric" role="listitem">
                  <strong>상담 기반</strong>
                  <span>정원 안정화<br />반 편성/확정</span>
                </div>
              </div>
            </div>
          </div>
          <aside className="gym-hero-visual" aria-label="빠른 접수">
            <div className="gym-visual-top">
              <div>
                <div className="title">빠른 접수(선호 시간)</div>
                <div className="sub">실시간 예약이 아니라, 선호 접수 후 편성/확정 안내.</div>
              </div>
            </div>
            <div className="gym-visual-body">
              <div className="gym-quick-form" role="form" aria-label="선호 시간 빠른 접수">
                <div className="gym-qrow">
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
                    <label htmlFor="qPref">선호 요일/시간</label>
                    <input
                      id="qPref"
                      placeholder="예) 수 17:00 / 토 오전"
                      value={qPref}
                      onChange={(e) => setQPref(e.target.value)}
                    />
                  </div>
                </div>
                <div className="gym-field">
                  <label htmlFor="qMsg">메모(선택)</label>
                  <textarea
                    id="qMsg"
                    placeholder="예) 운동 경험이 거의 없어요 / 낯가림이 있어요"
                    value={qMsg}
                    onChange={(e) => setQMsg(e.target.value)}
                    rows={2}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="gym-btn primary" onClick={prefillAndGoContact}>
                    상담 폼으로 이동
                  </button>
                  <button type="button" className="gym-btn" onClick={openKakao}>
                    카카오 상담
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
