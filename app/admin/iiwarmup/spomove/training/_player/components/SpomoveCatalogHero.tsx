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
.spomove-hero-mobile-break { display: inline; }
@media (max-width: 640px) {
  .spomove-hero-mobile-break { display: block; margin-top: 0.1rem; }
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
          style={{
            margin: '0 auto',
            width: '100%',
            maxWidth: 1120,
            padding: 'clamp(1.1rem,3vw,1.5rem) clamp(1rem,3vw,1.4rem)',
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.09)',
            background: 'linear-gradient(180deg, rgba(249,115,22,0.11) 0%, rgba(255,255,255,0.03) 24%, rgba(255,255,255,0.01) 100%)',
            boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 'clamp(0.45rem,1.6vw,0.7rem)',
          }}
        >
          <div
            style={{
              fontSize: 'clamp(2.2rem,7vw,4rem)',
              fontWeight: 900,
              letterSpacing: '-0.045em',
              lineHeight: 1.04,
              margin: 0,
              color: '#fff',
            }}
          >
            SPOKEDU
          </div>
          <p
            style={{
              fontSize: 'clamp(0.9rem,2vw,1.08rem)',
              color: 'rgba(255,255,255,0.62)',
              lineHeight: 1.55,
              fontWeight: 700,
              margin: 0,
              maxWidth: '56rem',
            }}
          >
            신체 활동과 인지 트레이닝을 통합한 교육 기반 퍼포먼스 도구
            <span className="spomove-hero-mobile-break"> — SPOMOVE 트레이닝</span>
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
