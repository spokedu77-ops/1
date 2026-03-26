'use client';

import { AGE_GROUPS } from '../data/ageGroups';
import type { AgeGroup } from '../types';

interface SetupProps {
  name: string;
  onName: (v: string) => void;
  age: AgeGroup;
  onAge: (v: AgeGroup) => void;
  onBack: () => void;
  onNext: () => void;
}

/** 원본 HTML STEP 01 설정 화면 */
export default function Setup({ name, onName, age, onAge, onBack, onNext }: SetupProps) {
  return (
    <div className="page" style={{ background: '#0D0D0D', padding: '0 24px', paddingTop: '28px', paddingBottom: '120px', maxWidth: 430, margin: '0 auto' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: '#A8A8A8',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '32px',
        }}
      >
        <i className="fa-solid fa-arrow-left" />
        <span>뒤로</span>
      </button>

      <div className="anim-rise" style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: '#FF4B1F', marginBottom: '8px' }}>STEP 01 / 02</div>
        <h2 style={{ fontFamily: 'Black Han Sans,sans-serif', fontSize: '32px', color: '#fff', lineHeight: 1.15, margin: 0 }}>아이 정보 입력</h2>
        <p style={{ fontSize: '13px', color: '#999', marginTop: '6px' }}>연령대에 맞춰 질문이 최적화됩니다.</p>
      </div>

      <div className="anim-rise d1" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', color: '#A8A8A8', marginBottom: '10px' }}>
          이름 또는 애칭 <span style={{ fontWeight: 500, color: '#777' }}>(선택)</span>
        </label>
        <input className="sp-input" value={name} onChange={(e) => onName(e.target.value)} placeholder="예: 지아, 씩씩이" maxLength={10} />
      </div>

      <div className="anim-rise d2" style={{ marginBottom: '40px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', color: '#A8A8A8', marginBottom: '10px' }}>관찰 연령대</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(['preschool', 'elementary'] as const).map((k) => {
            const m = AGE_GROUPS[k];
            const on = age === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onAge(k)}
                style={{
                  padding: '16px 18px',
                  borderRadius: '14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  outline: 'none',
                  background: on ? '#1E1E1E' : '#141414',
                  border: `1.5px solid ${on ? '#FF4B1F' : '#222'}`,
                  boxShadow: on ? '0 0 0 1px rgba(255,75,31,.2),0 0 20px rgba(255,75,31,.08)' : 'none',
                  transition: 'all .2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      border: `2px solid ${on ? '#FF4B1F' : '#333'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all .2s',
                    }}
                  >
                    {on ? <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF4B1F' }} /> : null}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: on ? '#fff' : '#888', marginBottom: '3px' }}>{m.label}</div>
                    <div style={{ fontSize: '12px', color: '#A8A8A8', wordBreak: 'keep-all' }}>{m.hint}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="anim-rise d3">
        <button type="button" onClick={onNext} className="btn-fire mr-btn-fire-html">
          <i className="fa-solid fa-play" style={{ fontSize: '12px' }} />
          {name.trim() || '아이'} 맞춤 분석 시작
        </button>
      </div>
    </div>
  );
}
