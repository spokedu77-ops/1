'use client';

import { useCallback, useState } from 'react';
import { GYM_CONFIG } from '../data/config';
import { AGE_OPTIONS } from '../data/config';

function normalizePhone(v: string) {
  return String(v ?? '').replace(/\D/g, '');
}

function validatePhone(raw: string) {
  const n = normalizePhone(raw);
  return n.length >= 10 && n.length <= 11;
}

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [phoneError, setPhoneError] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      const phone = normalizePhone((fd.get('phone') as string) ?? '');
      if (!validatePhone(phone)) {
        setPhoneError('연락처를 정확히 입력해주세요 (숫자 10–11자리)');
        return;
      }
      setPhoneError('');
      setStatus('submitting');

      if (!GYM_CONFIG.leadEndpoint) {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }

      const data = {
        name: fd.get('name'),
        phone,
        age: fd.get('age'),
        pref: fd.get('pref'),
        freq: fd.get('freq') || '',
        msg: fd.get('msg') || '',
        consent: fd.get('consent') === 'on',
        createdAt: new Date().toISOString(),
        center: GYM_CONFIG.center.name,
      };

      try {
        const res = await fetch(GYM_CONFIG.leadEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setStatus('success');
        form.reset();
      } catch {
        setStatus('error');
      } finally {
        setTimeout(() => setStatus('idle'), 4000);
      }
    },
    []
  );

  return (
    <section id="contact" className="gym-section" aria-labelledby="contactHeading">
      <div className="gym-container">
        <div className="gym-contact-grid">
          <div>
            <div className="gym-kicker">예약 및 문의</div>
            <h2 id="contactHeading" className="gym-section-title">
              상담 신청 — 반 편성이 우선입니다
            </h2>
            <p className="gym-section-desc">
              단일 센터 운영에서 가장 중요한 것은 <b>정원 안정화</b>입니다. 아이의 상황을 간단히 확인하고, 체험/레벨 진단 후 반을 추천합니다.
            </p>
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="gym-card" style={{ background: 'rgba(255,255,255,.03)' }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>센터 정보</h3>
                <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.7, color: 'var(--gym-muted)' }}>
                  {GYM_CONFIG.center.name}
                  <br />
                  {GYM_CONFIG.center.address}
                  <br />
                  {GYM_CONFIG.center.hours}
                </p>
              </div>
              <div className="gym-card" style={{ background: 'rgba(255,255,255,.03)' }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>체험 수업 안내</h3>
                <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.7, color: 'var(--gym-muted)' }}>
                  • 50분 1회 체험(레벨 진단 포함)
                  <br />
                  • 편한 운동복/실내화 준비
                  <br />• 보호자 대기 가능(라운지/상담)
                </p>
              </div>
            </div>
          </div>
          <form
            className="gym-card"
            onSubmit={handleSubmit}
            noValidate
            aria-label="상담 신청 폼"
            style={{ padding: 22 }}
          >
            <div className="gym-field" style={{ marginBottom: 12 }}>
              <label htmlFor="name">
                보호자 성함 <abbr title="필수">*</abbr>
              </label>
              <input id="name" name="name" placeholder="예: 김○○" required autoComplete="name" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="gym-field">
                <label htmlFor="phone">
                  연락처 <abbr title="필수">*</abbr>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="예: 01012345678"
                  required
                  autoComplete="tel"
                  inputMode="numeric"
                  onBlur={(e) => {
                    if (e.target.value && !validatePhone(e.target.value)) setPhoneError('연락처를 정확히 입력해주세요 (숫자 10–11자리)');
                    else setPhoneError('');
                  }}
                  onChange={() => setPhoneError('')}
                />
                {phoneError && <span style={{ fontSize: 12, color: 'var(--gym-warn)', marginTop: 4, display: 'block' }}>{phoneError}</span>}
              </div>
              <div className="gym-field">
                <label htmlFor="age">
                  자녀 연령 <abbr title="필수">*</abbr>
                </label>
                <select id="age" name="age" required>
                  <option value="">선택</option>
                  {AGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="gym-field" style={{ marginBottom: 12 }}>
              <label htmlFor="pref">
                선호 요일/시간 <abbr title="필수">*</abbr>
              </label>
              <input id="pref" name="pref" placeholder="예: 수 17:00 / 토 오전" required />
            </div>
            <div className="gym-field" style={{ marginBottom: 12 }}>
              <label htmlFor="freq">희망 빈도(선택)</label>
              <select id="freq" name="freq">
                <option value="">선택</option>
                <option value="주 1회">주 1회</option>
                <option value="주 2회">주 2회</option>
                <option value="주 3회">주 3회</option>
                <option value="상담 후 결정">상담 후 결정</option>
              </select>
            </div>
            <div className="gym-field" style={{ marginBottom: 12 }}>
              <label htmlFor="msg">메모(선택)</label>
              <textarea id="msg" name="msg" placeholder="예: 낯가림/집중/운동경험 등" rows={3} />
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" name="consent" required style={{ marginTop: 4 }} />
              <span>
                <a href={GYM_CONFIG.center.privacyUrl} target="_blank" rel="noopener noreferrer">
                  개인정보처리방침
                </a>
                에 동의합니다. 수집 항목: 성함·연락처·자녀 연령 / 목적: 수강 상담 / 보유 기간: 상담 종료 후 즉시 파기 <abbr title="필수">(필수)</abbr>
              </span>
            </label>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--gym-muted2)' }}>
              * 접수 후 운영팀이 카카오 채널 또는 문자로 연락드립니다.
            </p>
            {status === 'success' && <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--gym-ok)' }}>접수 완료! 운영팀이 연락드립니다.</p>}
            {status === 'error' && <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--gym-warn)' }}>일시적 오류가 발생했습니다. 카카오 채널로 문의해 주세요.</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="gym-btn primary" disabled={status === 'submitting'}>
                {status === 'submitting' ? '제출 중...' : '상담 신청 제출'}
              </button>
              <button type="button" className="gym-btn" onClick={() => window.open(GYM_CONFIG.kakao.webUrl, '_blank')}>
                카카오 상담
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
