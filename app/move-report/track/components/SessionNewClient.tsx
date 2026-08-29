'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { MAIN_ACTIVITIES } from '@/app/lib/move-report/track/fieldConstants';

type ProgramRow = { id: string; program_name: string; total_sessions: number };

export default function SessionNewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetProgramId = searchParams.get('programId');

  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [programId, setProgramId] = useState(presetProgramId ?? '');
  const [sessionNumber, setSessionNumber] = useState(1);
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activities, setActivities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/move-report/track/programs', { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '불러오기 실패');
        const list = (json.data ?? []) as ProgramRow[];
        setPrograms(list);
        setProgramId((current) => {
          if (presetProgramId) return presetProgramId;
          if (!current && list.length === 1) return list[0].id;
          return current;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : '불러오기 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, [presetProgramId]);

  const toggleActivity = useCallback((value: string) => {
    setActivities((prev) => (prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]));
  }, []);

  const submit = useCallback(async () => {
    if (!programId) {
      setError('사업을 선택해주세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/move-report/track/sessions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: programId,
          session_number: sessionNumber,
          session_date: sessionDate,
          main_activities: activities,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '생성 실패');
      router.push(`/move-report/track/sessions/${json.data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 실패');
      setSubmitting(false);
    }
  }, [programId, sessionNumber, sessionDate, activities, router]);

  const selectedProgram = programs.find((p) => p.id === programId);

  return (
    <>
      <Link
        href={programId ? `/move-report/track/programs/${programId}` : '/move-report/track'}
        className="btn-ghost mr-coach-back"
        style={{ textDecoration: 'none', marginBottom: 20 }}
      >
        ← 돌아가기
      </Link>
      <h1 className="mr-track-title" style={{ fontSize: '1.35rem' }}>
        회기 기록 시작
      </h1>
      {loading && <p className="mr-track-sub">불러오는 중…</p>}
      {error && <p className="mr-track-error">{error}</p>}

      {!loading && (
        <div className="mr-track-form">
          <label className="mr-track-field">
            <span className="mr-track-label">사업</span>
            <select
              className="mr-track-input"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
            >
              <option value="">선택</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.program_name}
                </option>
              ))}
            </select>
          </label>

          <label className="mr-track-field">
            <span className="mr-track-label">회기</span>
            <input
              type="number"
              min={1}
              max={selectedProgram?.total_sessions ?? 99}
              className="mr-track-input"
              value={sessionNumber}
              onChange={(e) => setSessionNumber(Number(e.target.value))}
            />
          </label>

          <label className="mr-track-field">
            <span className="mr-track-label">수업일</span>
            <input
              type="date"
              className="mr-track-input"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </label>

          <fieldset className="mr-track-field">
            <legend className="mr-track-label">오늘 주요 활동</legend>
            <div className="mr-track-chips">
              {MAIN_ACTIVITIES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  className={`mr-track-chip${activities.includes(a.value) ? ' mr-track-chip--on' : ''}`}
                  onClick={() => toggleActivity(a.value)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </fieldset>

          <button type="button" className="btn-fire mr-track-primary" disabled={submitting} onClick={submit}>
            {submitting ? '시작 중…' : '회기 시작'}
          </button>
        </div>
      )}
    </>
  );
}
