'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { StudentModal } from './StudentModal';
import { StudentManageScreen } from './StudentManageScreen';
import { useStudents } from '../hooks/useStudents';

const SPOKEDU_PROMO_BANNER_SRC = '/spokedu/spokedu-promo-banner.png';

const HERO_ANIM_CSS = `
@keyframes spomoveCatalogHeroFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
.spomove-catalog-hero-fadein {
  animation: spomoveCatalogHeroFadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both;
}
@media (prefers-reduced-motion: reduce) {
  .spomove-catalog-hero-fadein { animation: none; opacity: 1; transform: none; }
}
`;

/**
 * MemoryGameApp 홈 상단과 동일한 브랜딩·학생 선택·PLAY/THINK/FLOW·헤드라인 블록.
 * SPOMOVE Training 카탈로그(/admin/spomove/training) 상단에서 사용.
 */
export function SpomoveCatalogHero() {
  const { students, add: addStudent, remove: removeStudent, rename: renameStudent } = useStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showStudentManage, setShowStudentManage] = useState(false);
  const [bannerLightboxOpen, setBannerLightboxOpen] = useState(false);
  const [bannerMounted, setBannerMounted] = useState(false);
  const [theme] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('spokedu_theme') || 'light' : 'light',
  );

  useEffect(() => {
    setBannerMounted(true);
  }, []);

  const closeBannerLightbox = useCallback(() => setBannerLightboxOpen(false), []);

  useEffect(() => {
    if (!bannerLightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeBannerLightbox();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [bannerLightboxOpen, closeBannerLightbox]);

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
          <button
            type="button"
            onClick={() => setBannerLightboxOpen(true)}
            aria-label="SPOKEDU 배너 전체 화면으로 보기"
            style={{
              margin: 0,
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'zoom-in',
              width: '100%',
              maxWidth: 'min(100%, 920px)',
              borderRadius: 12,
              overflow: 'hidden',
              lineHeight: 0,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            <img
              src={SPOKEDU_PROMO_BANNER_SRC}
              alt="SPOKEDU — 움직임이 배움이 되다. 아동·청소년 체육교육"
              width={1600}
              height={900}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
              loading="eager"
              decoding="async"
            />
          </button>
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

      {bannerMounted && bannerLightboxOpen
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="SPOKEDU 배너 전체 화면 — 화면을 누르거나 Esc로 닫기"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 200000,
                margin: 0,
                padding: 0,
                boxSizing: 'border-box',
                width: '100vw',
                height: '100dvh',
                maxWidth: '100vw',
                maxHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#020617',
                cursor: 'zoom-out',
              }}
              onClick={closeBannerLightbox}
            >
              <img
                src={SPOKEDU_PROMO_BANNER_SRC}
                alt=""
                width={1600}
                height={900}
                style={{
                  width: '100vw',
                  height: '100dvh',
                  maxWidth: '100vw',
                  maxHeight: '100dvh',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
