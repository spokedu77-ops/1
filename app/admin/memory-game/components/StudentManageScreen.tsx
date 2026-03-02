'use client';

import React, { useState, useRef } from 'react';
import type { Student } from '../hooks/useStudents';
import { CSS } from '../styles';

export function StudentManageScreen({
  students,
  onAdd,
  onRemove,
  onRename,
  onBack,
}: {
  students: Student[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onBack: () => void;
}) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName);
    setNewName('');
    inputRef.current?.focus();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", color: '#fff' }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '1.5rem 1.5rem 5rem' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: '1.2rem' }}>← 돌아가기</button>
        <div style={{ marginBottom: '1.8rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>학생 관리</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.3rem' }}>Student Profiles</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.1rem', padding: '1rem 1.2rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '0.7rem', letterSpacing: '0.06em' }}>새 학생 추가</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="이름 입력 (예: 김민준)"
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                border: '1.5px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.07)',
                color: '#fff',
                fontSize: '0.92rem',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button onClick={handleAdd} style={{ padding: '0.75rem 1.2rem', borderRadius: '0.75rem', border: 'none', background: '#F97316', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>+ 추가</button>
          </div>
        </div>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: '0.6rem', letterSpacing: '0.06em' }}>등록된 학생 {students.length}명</div>
        {students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.88rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
            아직 등록된 학생이 없어요
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {students.map((s, i) => (
              <div key={s.id} className="home-fadein" style={{ animationDelay: `${i * 0.03}s`, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', color: '#fff', flexShrink: 0 }}>{s.name[0]}</div>
                {editingId === s.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onRename(s.id, editName);
                        setEditingId(null);
                      }
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    style={{ flex: 1, padding: '0.4rem 0.7rem', borderRadius: '0.5rem', border: `1.5px solid ${s.color}`, background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' }}
                  />
                ) : (
                  <span style={{ flex: 1, fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>{s.name}</span>
                )}
                {editingId === s.id ? (
                  <button onClick={() => { onRename(s.id, editName); setEditingId(null); }} style={{ background: s.color, border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.75rem', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>저장</button>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(s.id); setEditName(s.name); }} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.4rem 0.65rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>편집</button>
                    <button onClick={() => { if (typeof window !== 'undefined' && window.confirm(`${s.name} 학생을 삭제할까요?`)) onRemove(s.id); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem', padding: '0.4rem 0.65rem', color: '#FCA5A5', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>삭제</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
