'use client';

import React, { useEffect, useState } from 'react';
import { StudentModal } from './StudentModal';
import { StudentManageScreen } from './StudentManageScreen';
import { useStudents } from '../hooks/useStudents';

const HERO_ANIM_CSS = `
@keyframes spomoveCatalogHeroFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
.spomove-catalog-hero-fadein {
  animation: spomoveCatalogHeroFadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both;
}
.spomove-catalog-hero-fadein-1 {
  animation: spomoveCatalogHeroFadeUp 0.55s 0.07s cubic-bezier(0.22,1,0.36,1) both;
}
@media (prefers-reduced-motion: reduce) {
  .spomove-catalog-hero-fadein,
  .spomove-catalog-hero-fadein-1 { animation: none; opacity: 1; transform: none; }
}
`;

/**
 * MemoryGameApp 홈 상단과 동일한 브랜딩·학생 선택·PLAY/THINK/FLOW·헤드라인 블록.
 * SPOMOVE Training 카탈로그(/admin/iiwarmup/spomove/training) 상단에서 사용.
 */
export function SpomoveCatalogHero() {
  const { students, add: addStudent, remove: removeStudent, rename: renameStudent } = useStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showStudentManage, setShowStudentManage] = useState(false);
  const [theme, setTheme] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('spokedu_theme') || 'light' : 'light',
  );

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme);
    if (typeof window !== 'undefined') localStorage.setItem('spokedu_theme', theme);
  }, [theme]);

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#080C14',
        fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
        color: '#fff',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <style>{HERO_ANIM_CSS}</style>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-25%',
          left: '-8%',
          width: 'min(55vw, 520px)',
          height: 'min(55vw, 520px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-20%',
          right: '-12%',
          width: 'min(50vw, 480px)',
          height: 'min(50vw, 480px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: 'clamp(1.25rem,4vw,2rem) clamp(1rem,4vw,1.5rem) clamp(1.35rem,4vw,1.85rem)',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="spomove-catalog-hero-fadein"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 'clamp(0.6rem,1.5vw,0.72rem)',
                fontWeight: 700,
                letterSpacing: '0.22em',
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                marginBottom: '0.2rem',
              }}
            >
              Cognitive · Physical · Education
            </div>
            <div style={{ fontSize: 'clamp(1.35rem,3.8vw,1.85rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
              SPOKEDU
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setShowStudentModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.65rem',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.6rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              {(() => {
                const s = students.find((st) => st.id === selectedStudentId);
                if (s) {
                  return (
                    <>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: s.color }} />
                      <span>{s.name}</span>
                    </>
                  );
                }
                return (
                  <>
                    <span>👤</span>
                    <span>학생 선택</span>
                  </>
                );
              })()}
            </button>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              style={{
                width: 36,
                height: 36,
                borderRadius: '0.6rem',
                background: 'rgba(249,115,22,0.15)',
                border: '1px solid rgba(249,115,22,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                flexShrink: 0,
                cursor: 'pointer',
              }}
              aria-label={theme === 'light' ? '다크 모드' : '라이트 모드'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>

        <div
          className="spomove-catalog-hero-fadein-1"
          style={{ marginTop: 'clamp(1rem,3vw,1.35rem)', display: 'flex', flexDirection: 'column', gap: 'clamp(0.65rem,2vw,0.95rem)' }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {(['PLAY', 'THINK', 'FLOW'] as const).map((w, i) => (
              <React.Fragment key={w}>
                <span
                  style={{
                    fontSize: 'clamp(0.68rem,1.8vw,0.82rem)',
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                    color: i === 0 ? '#F97316' : i === 1 ? '#3B82F6' : '#22C55E',
                  }}
                >
                  {w}
                </span>
                {i < 2 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>·</span>}
              </React.Fragment>
            ))}
          </div>
          <h2
            style={{
              fontSize: 'clamp(1.65rem,6vw,2.75rem)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1.12,
              margin: 0,
            }}
          >
            몸이 움직이면
            <br />
            <span style={{ color: '#F97316' }}>뇌가 깨어납니다</span>
          </h2>
          <p
            style={{
              fontSize: 'clamp(0.88rem,2vw,1.02rem)',
              color: 'rgba(255,255,255,0.4)',
              lineHeight: 1.75,
              fontWeight: 400,
              margin: 0,
              maxWidth: '36rem',
            }}
          >
            신체 활동과 인지 트레이닝을 통합한
            <br />
            교육 기반 퍼포먼스 도구 — SPOMOVE 트레이닝
          </p>
        </div>
      </div>

      {showStudentModal && (
        <StudentModal
          students={students}
          selectedId={selectedStudentId}
          onSelect={(id) => {
            setSelectedStudentId(id);
            setShowStudentModal(false);
          }}
          onClose={() => setShowStudentModal(false)}
          onManage={() => {
            setShowStudentModal(false);
            setShowStudentManage(true);
          }}
        />
      )}
      {showStudentManage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 250,
            overflow: 'auto',
            background: '#080C14',
          }}
        >
          <StudentManageScreen
            students={students}
            onAdd={addStudent}
            onRemove={removeStudent}
            onRename={renameStudent}
            onBack={() => setShowStudentManage(false)}
          />
        </div>
      )}
    </div>
  );
}
