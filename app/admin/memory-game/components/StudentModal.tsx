'use client';

import React from 'react';
import type { Student } from '../hooks/useStudents';

export function StudentModal({
  students,
  selectedId,
  onSelect,
  onClose,
  onManage,
}: {
  students: Student[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  onManage: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#111827',
          borderRadius: '1.5rem 1.5rem 0 0',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '1.5rem 1.5rem 2.5rem',
          maxHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)', margin: '0 auto 1.2rem' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>누가 훈련할까요?</div>
          <button
            onClick={onManage}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '0.6rem',
              padding: '0.35rem 0.75rem',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ✏️ 학생 관리
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <button
            onClick={() => onSelect(null)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '0.85rem 1rem',
              borderRadius: '1rem',
              marginBottom: '0.5rem',
              border: `2px solid ${selectedId === null ? '#F97316' : 'rgba(255,255,255,0.08)'}`,
              background: selectedId === null ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>👤</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff' }}>개인 (이름 없음)</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.1rem' }}>학생 지정 없이 진행</div>
            </div>
            {selectedId === null && <div style={{ marginLeft: 'auto', color: '#F97316', fontWeight: 900, fontSize: '1.1rem' }}>✓</div>}
          </button>
          {students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.82rem' }}>학생 관리에서 학생을 추가하세요</div>
          ) : (
            students.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '1rem',
                  marginBottom: '0.4rem',
                  border: `2px solid ${selectedId === s.id ? s.color : 'rgba(255,255,255,0.08)'}`,
                  background: selectedId === s.id ? `${s.color}18` : 'rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, color: '#fff', flexShrink: 0 }}>{s.name[0]}</div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff' }}>{s.name}</div>
                {selectedId === s.id && <div style={{ marginLeft: 'auto', color: s.color, fontWeight: 900, fontSize: '1.1rem' }}>✓</div>}
              </button>
            ))
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: '1rem',
            width: '100%',
            padding: '1rem',
            borderRadius: '1rem',
            border: 'none',
            background: '#F97316',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 6px 20px rgba(249,115,22,0.3)',
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
}
