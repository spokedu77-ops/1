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
            <h2 id="contactHeading" className="gym-section-title">아이에게 맞는 시작점을 함께 찾습니다</h2>
            <p className="gym-section-desc">
              평가나 판정보다, 현재 위치를 함께 확인하고 첫 수업 흐름을 제안합니다.
            </p>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="gym-review-badge">연세대 체교 기반 설계</span>
              <span className="gym-review-badge">수업/활동 리포트 제공</span>
              <span className="gym-review-badge">50분 표준 루틴</span>
            </div>
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
                  • 50분 체험 수업 1회 (정가 대비 50% 할인)
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
            {/* 최상단 옵션 과다로 인한 이탈을 줄이기 위해 선택 입력 항목을 최소화합니다. */}
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
            {status === 'success' && <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--gym-ok)' }}>접수가 완료되었습니다. 운영팀이 순차적으로 연락드리며, 카카오 채널로도 바로 문의 가능합니다.</p>}
            {status === 'error' && <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--gym-warn)' }}>일시적 오류가 발생했습니다. 카카오 채널로 문의해 주세요.</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="gym-btn primary" disabled={status === 'submitting'}>
                {status === 'submitting' ? '제출 중...' : '체험 수업 신청'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
