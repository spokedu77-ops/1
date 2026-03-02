'use client';

import React, { useState } from 'react';
import { MODES } from '../constants';
import { Sparkline } from './Sparkline';
import { CSS } from '../styles';
import type { HistoryRecord } from '../hooks/useHistory';
import type { Student } from '../hooks/useStudents';

export function HistoryScreen({
  records,
  students,
  onBack,
  onClear,
}: {
  records: HistoryRecord[];
  students: Student[];
  onBack: () => void;
  onClear: () => void;
}) {
  const [filterMode, setFilterMode] = useState('all');
  const [filterStudent, setFilterStudent] = useState('all');

  const modeOptions = [
    { id: 'all', label: '전체' },
    { id: 'basic', label: '반응 인지' },
    { id: 'stroop', label: '스트룹' },
    { id: 'spatial', label: '순차 기억' },
    { id: 'dual', label: '이중 과제' },
    { id: 'nback', label: 'N-Back' },
    { id: 'team', label: '팀 대결' },
  ];

  const filtered = records
    .filter((r) => filterMode === 'all' || r.mode === filterMode)
    .filter((r) => filterStudent === 'all' || (filterStudent === '__none__' ? !r.studentId : r.studentId === filterStudent));

  const sorted = [...filtered].reverse();
  const spmSeries = sorted.filter((r) => r.spm != null).map((r) => r.spm!).reverse().slice(-20);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${min}`;
  };

  const modeAccent: Record<string, string> = { basic: '#3B82F6', stroop: '#A855F7', spatial: '#22C55E', dual: '#F97316', nback: '#06B6D4', team: '#F43F5E' };

  const exportCSV = () => {
    const modeLabel: Record<string, string> = { basic: '반응인지', stroop: '스트룹', spatial: '순차기억', dual: '이중과제', nback: 'N-Back', team: '팀대결' };
    const header = ['날짜', '학생', '모드', '단계', '신호횟수', 'SPM', '속도(초)', '시간모드', '설정시간(초)'].join(',');
    const rows = [...filtered].reverse().map((r) => {
      const student = students.find((s) => s.id === r.studentId);
      return [
        new Date(r.date).toLocaleString('ko-KR'),
        student ? student.name : '개인',
        modeLabel[r.mode] ?? r.mode,
        r.level,
        r.count,
        r.spm ?? '',
        r.speed ?? '',
        r.timeMode ?? '',
        r.timeMode === 'time' ? (r.duration ?? '') : (r.targetReps ?? ''),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spokedu_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalSessions = filtered.length;
  const avgSpm = filtered.filter((r) => r.spm).length ? Math.round(filtered.filter((r) => r.spm).reduce((s, r) => s + (r.spm ?? 0), 0) / filtered.filter((r) => r.spm).length) : null;
  const bestSpm = filtered.filter((r) => r.spm).length ? Math.max(...filtered.filter((r) => r.spm).map((r) => r.spm!)) : null;

  const weeklyReport = (() => {
    const now = Date.now();
    const DAY = 86400000;
    const days = Array.from({ length: 7 }, (_, i) => {
      const dayStart = now - (6 - i) * DAY;
      const dayEnd = dayStart + DAY;
      const dayRecords = records.filter((r) => {
        const t = new Date(r.date).getTime();
        return t >= dayStart && t < dayEnd;
      });
      const spmList = dayRecords.filter((r) => r.spm != null).map((r) => r.spm!);
      return {
        label: ['일', '월', '화', '수', '목', '금', '토'][new Date(dayStart).getDay()],
        count: dayRecords.length,
        avgSpm: spmList.length ? Math.round(spmList.reduce((a, b) => a + b, 0) / spmList.length) : null,
      };
    });
    const modeCounts: Record<string, number> = {};
    const weekRecords = records.filter((r) => new Date(r.date).getTime() >= now - 7 * DAY);
    weekRecords.forEach((r) => {
      modeCounts[r.mode] = (modeCounts[r.mode] || 0) + 1;
    });
    const topMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0];
    const modeLabel: Record<string, string> = { basic: '반응 인지', stroop: '스트룹', spatial: '순차 기억', dual: '이중 과제', nback: 'N-Back', team: '팀 대결' };
    return { days, topMode: topMode ? { name: modeLabel[topMode[0]] ?? topMode[0], count: topMode[1] } : null, total: weekRecords.length };
  })();

  const streak = (() => {
    if (!records.length) return 0;
    const daySet = new Set(records.map((r) => new Date(r.date).toDateString()));
    let count = 0;
    const d = new Date();
    if (!daySet.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (daySet.has(d.toDateString())) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  })();

  const weekBestSpm = (() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const vals = records.filter((r) => new Date(r.date).getTime() >= weekAgo && r.spm != null).map((r) => r.spm!);
    return vals.length ? Math.max(...vals) : null;
  })();

  const totalMinutes = Math.round(records.filter((r) => r.duration != null).reduce((s, r) => s + (r.duration ?? 0), 0) / 60);

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", color: '#fff' }}>
      <style>{CSS}</style>
      <div style={{ padding: '1.5rem 1.5rem 0', maxWidth: 560, margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: '1.2rem' }}>← 처음으로</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>훈련 기록</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.3rem', fontWeight: 500 }}>Training History</div>
          </div>
          {records.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button onClick={exportCSV} style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#86EFAC', borderRadius: '0.65rem', padding: '0.45rem 0.8rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>📥 CSV</button>
              <button onClick={() => { if (typeof window !== 'undefined' && window.confirm('모든 기록을 삭제할까요?')) onClear(); }} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5', borderRadius: '0.65rem', padding: '0.45rem 0.8rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🗑 초기화</button>
            </div>
          )}
        </div>
        {totalSessions > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1.2rem' }}>
            {[
              { label: '연속 훈련', value: streak ? `${streak}일` : '—', icon: '🔥', color: streak >= 3 ? '#FB923C' : '#94A3B8' },
              { label: '이번 주 최고 SPM', value: weekBestSpm ? `${weekBestSpm}` : '—', icon: '⚡', color: weekBestSpm ? '#F97316' : '#94A3B8' },
              { label: '총 세션', value: `${totalSessions}회`, icon: '📅', color: '#60A5FA' },
              { label: '총 훈련 시간', value: totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}분`, icon: '⏱', color: '#A78BFA' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.9rem', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginTop: '0.15rem' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {spmSeries.length >= 2 && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1rem 1.2rem', marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>SPM 추세 (최근 {spmSeries.length}회)</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#F97316' }}>{spmSeries[spmSeries.length - 1]} <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>회/분</span></div>
            </div>
            <Sparkline data={spmSeries} color="#F97316" height={56} width={Math.min(480, (typeof window !== 'undefined' ? window.innerWidth : 400) - 80)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.3rem' }}><span>과거</span><span>최근</span></div>
          </div>
        )}
        {weeklyReport.total > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1rem 1.2rem', marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>📅 이번 주 리포트</div>
              {weeklyReport.topMode && <div style={{ fontSize: '0.68rem', color: '#F97316', fontWeight: 700 }}>최다 모드: {weeklyReport.topMode.name} ({weeklyReport.topMode.count}회)</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'flex-end', height: 48 }}>
              {weeklyReport.days.map((d, i) => {
                const maxCount = Math.max(...weeklyReport.days.map((x) => x.count), 1);
                const barH = d.count > 0 ? Math.max(6, Math.round((d.count / maxCount) * 40)) : 3;
                const isToday = i === 6;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    {d.avgSpm && <div style={{ fontSize: '0.52rem', color: '#F97316', fontWeight: 700, lineHeight: 1 }}>{d.avgSpm}</div>}
                    <div style={{ width: '100%', height: barH, borderRadius: 4, background: isToday ? '#F97316' : d.count > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)', transition: 'height 0.3s' }} />
                    <div style={{ fontSize: '0.6rem', color: isToday ? '#F97316' : 'rgba(255,255,255,0.3)', fontWeight: isToday ? 800 : 500 }}>{d.label}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '0.6rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>이번 주 총 {weeklyReport.total}회 · 막대 위 숫자 = 평균 SPM</div>
          </div>
        )}
        {students.length > 0 && (
          <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
            {[{ id: 'all', label: '👥 전체', color: null as string | null }, { id: '__none__', label: '👤 개인', color: null }, ...students.map((s) => ({ id: s.id, label: s.name, color: s.color }))].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFilterStudent(opt.id)}
                style={{
                  flexShrink: 0,
                  padding: '0.35rem 0.8rem',
                  borderRadius: '99px',
                  border: `1.5px solid ${filterStudent === opt.id && opt.color ? opt.color : 'transparent'}`,
                  background: filterStudent === opt.id ? (opt.color ? `${opt.color}22` : 'rgba(255,255,255,0.15)') : 'rgba(255,255,255,0.07)',
                  color: filterStudent === opt.id ? (opt.color ?? '#fff') : 'rgba(255,255,255,0.45)',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.14s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem', marginBottom: '1rem' }}>
          {modeOptions.map((m) => (
            <button
              key={m.id}
              onClick={() => setFilterMode(m.id)}
              style={{
                flexShrink: 0,
                padding: '0.4rem 0.85rem',
                borderRadius: '99px',
                border: 'none',
                background: filterMode === m.id ? '#F97316' : 'rgba(255,255,255,0.07)',
                color: filterMode === m.id ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.14s',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 1.5rem 5rem' }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', fontWeight: 500 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
            아직 기록이 없어요<br />
            <span style={{ fontSize: '0.78rem' }}>훈련을 완료하면 여기에 쌓입니다</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sorted.map((r, i) => {
              const mo = MODES[r.mode];
              const accent = modeAccent[r.mode] ?? '#F97316';
              const student = students.find((s) => s.id === r.studentId);
              const isPR = r.spm != null && r.spm === Math.max(...records.filter((x) => x.mode === r.mode && x.level === r.level && x.spm != null).map((x) => x.spm!));
              return (
                <div key={r.id} className="home-fadein" style={{ animationDelay: `${Math.min(i, 10) * 0.03}s`, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1rem', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '0.65rem', background: `${accent}18`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{mo?.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#fff' }}>{mo?.title}</span>
                      <span style={{ fontSize: '0.68rem', color: accent, fontWeight: 700, background: `${accent}18`, padding: '0.1rem 0.4rem', borderRadius: '99px' }}>단계 {r.level}</span>
                      {student && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: student.color, background: `${student.color}18`, padding: '0.1rem 0.5rem', borderRadius: '99px', border: `1px solid ${student.color}30` }}>{student.name}</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.15rem' }}>{formatDate(r.date)}</div>
                    {r.memo && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.2rem', fontStyle: 'italic', lineHeight: 1.4 }}>📝 {r.memo}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {r.spm != null ? (
                      <>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#F97316' }}>{r.spm}</div>
                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>SPM</div>
                        {isPR && <div style={{ fontSize: '0.58rem', color: '#FCD34D', fontWeight: 800, marginTop: '0.1rem' }}>🏅 PR</div>}
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#22C55E' }}>{r.count}</div>
                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>횟수</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
