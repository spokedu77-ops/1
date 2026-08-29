'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ABSENCE_REASONS,
  FRW_SECONDS,
  FRW_STATUS,
  INDEPENDENT_INITIATION,
  MOVEMENT_DOMAINS,
  OPPORTUNITY_BANDS,
  PARTICIPATION_LEVELS,
  SELF_REENGAGEMENT,
  SUPPORT_LEVELS,
} from '@/app/lib/move-report/track/fieldConstants';

type Props = {
  sessionId: string;
  childId: string;
  childIds: string[];
  sessionNumber: number;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type FormState = {
  attendance_status: 'present' | 'absent';
  absence_reason: string | null;
  observation_opportunity_band: 'one' | 'two' | 'three_plus' | null;
  participation_level: number | null;
  support_level: number | null;
  independent_initiation: number | null;
  self_reengagement: boolean | null;
  spomove_used: boolean | null;
  frw_seconds: number | null;
  frw_status: string | null;
  observation_note: string;
  movementKeys: string[];
};

function movementKey(domain: string, subtag: string) {
  return `${domain}:${subtag}`;
}

function parseMovementKeys(keys: string[]) {
  return keys.map((k) => {
    const [domain, ...rest] = k.split(':');
    return { domain, subtag: rest.join(':') };
  });
}

const INITIAL: FormState = {
  attendance_status: 'present',
  absence_reason: null,
  observation_opportunity_band: null,
  participation_level: null,
  support_level: null,
  independent_initiation: null,
  self_reengagement: null,
  spomove_used: null,
  frw_seconds: null,
  frw_status: null,
  observation_note: '',
  movementKeys: [],
};

export default function ChildRecordClient({ sessionId, childId, childIds, sessionNumber }: Props) {
  const router = useRouter();
  const [childName, setChildName] = useState('');
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const timerRef = useRef<number | null>(null);
  const formRef = useRef(form);
  formRef.current = form;

  const childIndex = childIds.indexOf(childId);
  const prevChildId = childIndex > 0 ? childIds[childIndex - 1] : null;
  const nextChildId = childIndex >= 0 && childIndex < childIds.length - 1 ? childIds[childIndex + 1] : null;

  const canObservedStable = form.observation_opportunity_band === 'three_plus';
  const frwStatusOptions = useMemo(
    () =>
      FRW_STATUS.map((s) => ({
        ...s,
        disabled: s.value === 'observed_stable' && !canObservedStable,
      })),
    [canObservedStable],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/move-report/track/sessions/${sessionId}/records/${childId}`, {
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '불러오기 실패');
        if (cancelled) return;
        const { child, record, movement_experiences } = json.data;
        setChildName(child.child_name ?? child.child_code);
        if (record) {
          setForm({
            attendance_status: record.attendance_status,
            absence_reason: record.absence_reason,
            observation_opportunity_band: record.observation_opportunity_band,
            participation_level: record.participation_level,
            support_level: record.support_level,
            independent_initiation: record.independent_initiation,
            self_reengagement: record.self_reengagement,
            spomove_used: record.spomove_used,
            frw_seconds: record.frw_seconds,
            frw_status: record.frw_status,
            observation_note: record.observation_note ?? '',
            movementKeys: (movement_experiences ?? []).map((m: { domain: string; subtag: string }) =>
              movementKey(m.domain, m.subtag),
            ),
          });
        }
      } catch (e) {
        if (!cancelled) setSaveError(e instanceof Error ? e.message : '불러오기 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, childId]);

  const persist = useCallback(
    async (draft: boolean) => {
      const f = formRef.current;
      setSaveState('saving');
      setSaveError('');
      try {
        const res = await fetch(`/api/move-report/track/sessions/${sessionId}/records/${childId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...f,
            movement_experiences: parseMovementKeys(f.movementKeys),
            is_draft: draft,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '저장 실패');
        setWarnings((json.warnings ?? []).map((w: { message: string }) => w.message));
        setSaveState('saved');
      } catch (e) {
        setSaveState('error');
        setSaveError(e instanceof Error ? e.message : '저장 실패');
      }
    },
    [sessionId, childId],
  );

  const scheduleAutosave = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void persist(true);
    }, 700);
  }, [persist]);

  const patch = useCallback(
    (partial: Partial<FormState>) => {
      setForm((prev) => {
        let next = { ...prev, ...partial };
        if (partial.observation_opportunity_band !== undefined && partial.observation_opportunity_band !== 'three_plus') {
          if (next.frw_status === 'observed_stable') next = { ...next, frw_status: null };
        }
        if (partial.attendance_status === 'absent') {
          next = { ...INITIAL, attendance_status: 'absent', absence_reason: prev.absence_reason };
        }
        if (partial.spomove_used === false) {
          next = { ...next, frw_seconds: null, frw_status: null };
        }
        return next;
      });
      scheduleAutosave();
    },
    [scheduleAutosave],
  );

  const toggleMovement = useCallback(
    (domain: string, subtag: string) => {
      const key = movementKey(domain, subtag);
      setForm((prev) => {
        const has = prev.movementKeys.includes(key);
        const movementKeys = has ? prev.movementKeys.filter((k) => k !== key) : [...prev.movementKeys, key];
        return { ...prev, movementKeys };
      });
      scheduleAutosave();
    },
    [scheduleAutosave],
  );

  const saveAndNext = useCallback(async () => {
    await persist(false);
    if (nextChildId) {
      router.push(`/move-report/track/sessions/${sessionId}/children/${nextChildId}`);
    } else {
      router.push(`/move-report/track/sessions/${sessionId}`);
    }
  }, [persist, nextChildId, router, sessionId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (loading) {
    return <p className="mr-track-sub">불러오는 중…</p>;
  }

  return (
    <>
      <div className="mr-track-record-header">
        <Link href={`/move-report/track/sessions/${sessionId}`} className="btn-ghost mr-coach-back" style={{ textDecoration: 'none' }}>
          ← 목록
        </Link>
        <p className="mr-track-record-meta">
          {sessionNumber}회기 · {childIndex + 1}/{childIds.length} · {childName}
        </p>
        <div className="mr-track-nav-row">
          {prevChildId ? (
            <Link href={`/move-report/track/sessions/${sessionId}/children/${prevChildId}`} className="mr-track-nav-btn">
              ← 이전
            </Link>
          ) : (
            <span />
          )}
          {nextChildId ? (
            <Link href={`/move-report/track/sessions/${sessionId}/children/${nextChildId}`} className="mr-track-nav-btn">
              다음 →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>

      <div className="mr-track-form mr-track-form--record">
        <section className="mr-track-section">
          <h2 className="mr-track-section-label">출석</h2>
          <div className="mr-track-chips">
            <button
              type="button"
              className={`mr-track-chip${form.attendance_status === 'present' ? ' mr-track-chip--on' : ''}`}
              onClick={() => patch({ attendance_status: 'present' })}
            >
              출석
            </button>
            <button
              type="button"
              className={`mr-track-chip${form.attendance_status === 'absent' ? ' mr-track-chip--on' : ''}`}
              onClick={() => patch({ attendance_status: 'absent' })}
            >
              결석
            </button>
          </div>
          {form.attendance_status === 'absent' && (
            <select
              className="mr-track-input"
              value={form.absence_reason ?? ''}
              onChange={(e) => patch({ absence_reason: e.target.value || null })}
            >
              <option value="">결석 사유 (선택)</option>
              {ABSENCE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
        </section>

        {form.attendance_status === 'present' && (
          <>
            <section className="mr-track-section">
              <h2 className="mr-track-section-label">의미 있는 참여기회</h2>
              <div className="mr-track-chips">
                {OPPORTUNITY_BANDS.map((b) => (
                  <button
                    key={String(b.value)}
                    type="button"
                    className={`mr-track-chip${form.observation_opportunity_band === b.value ? ' mr-track-chip--on' : ''}`}
                    onClick={() => patch({ observation_opportunity_band: b.value })}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </section>

            {form.observation_opportunity_band != null && (
              <>
                <section className="mr-track-section">
                  <h2 className="mr-track-section-label">Participation</h2>
                  <div className="mr-track-level-grid">
                    {PARTICIPATION_LEVELS.map((l) => (
                      <button
                        key={l.value}
                        type="button"
                        className={`mr-track-level${form.participation_level === l.value ? ' mr-track-level--on' : ''}`}
                        onClick={() => patch({ participation_level: l.value })}
                      >
                        <span className="mr-track-level-num">{l.label}</span>
                        <span className="mr-track-level-title">{l.title}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="mr-track-section">
                  <h2 className="mr-track-section-label">Support</h2>
                  <div className="mr-track-level-grid mr-track-level-grid--5">
                    {SUPPORT_LEVELS.map((l) => (
                      <button
                        key={l.value}
                        type="button"
                        className={`mr-track-level${form.support_level === l.value ? ' mr-track-level--on' : ''}`}
                        onClick={() => patch({ support_level: l.value })}
                      >
                        <span className="mr-track-level-num">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="mr-track-section">
                  <h2 className="mr-track-section-label">Independent Initiation</h2>
                  <div className="mr-track-chips">
                    {INDEPENDENT_INITIATION.map((l) => (
                      <button
                        key={l.value}
                        type="button"
                        className={`mr-track-chip${form.independent_initiation === l.value ? ' mr-track-chip--on' : ''}`}
                        onClick={() => patch({ independent_initiation: l.value })}
                      >
                        {l.label} {l.title}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="mr-track-section">
                  <h2 className="mr-track-section-label">Self Re-engagement</h2>
                  <div className="mr-track-chips">
                    {SELF_REENGAGEMENT.map((o) => {
                      const val = o.value === 'null' ? null : o.value === 'true';
                      const on = form.self_reengagement === val;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          className={`mr-track-chip${on ? ' mr-track-chip--on' : ''}`}
                          onClick={() => patch({ self_reengagement: val })}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="mr-track-section">
                  <h2 className="mr-track-section-label">SPOMOVE</h2>
                  <div className="mr-track-chips">
                    <button
                      type="button"
                      className={`mr-track-chip${form.spomove_used === true ? ' mr-track-chip--on' : ''}`}
                      onClick={() => patch({ spomove_used: true })}
                    >
                      예
                    </button>
                    <button
                      type="button"
                      className={`mr-track-chip${form.spomove_used === false ? ' mr-track-chip--on' : ''}`}
                      onClick={() => patch({ spomove_used: false })}
                    >
                      아니오
                    </button>
                  </div>
                  {form.spomove_used === true && (
                    <>
                      <p className="mr-track-hint">Functional Response Window — Reaction Time 아님</p>
                      <div className="mr-track-chips">
                        {FRW_SECONDS.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            className={`mr-track-chip${form.frw_seconds === s.value ? ' mr-track-chip--on' : ''}`}
                            onClick={() => patch({ frw_seconds: s.value })}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                      <div className="mr-track-chips">
                        {frwStatusOptions.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            disabled={s.disabled}
                            className={`mr-track-chip${form.frw_status === s.value ? ' mr-track-chip--on' : ''}${s.disabled ? ' mr-track-chip--disabled' : ''}`}
                            onClick={() => patch({ frw_status: s.value })}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </section>

                <section className="mr-track-section">
                  <h2 className="mr-track-section-label">Movement Experience (실제 참여)</h2>
                  {MOVEMENT_DOMAINS.map((d) => (
                    <div key={d.id} className="mr-track-domain">
                      <p className="mr-track-domain-label">{d.label}</p>
                      <div className="mr-track-chips">
                        {d.subtags.map((tag) => {
                          const key = movementKey(d.id, tag);
                          return (
                            <button
                              key={key}
                              type="button"
                              className={`mr-track-chip mr-track-chip--sm${form.movementKeys.includes(key) ? ' mr-track-chip--on' : ''}`}
                              onClick={() => toggleMovement(d.id, tag)}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              </>
            )}

            <section className="mr-track-section">
              <h2 className="mr-track-section-label">Observation Note</h2>
              <textarea
                className="mr-track-textarea"
                maxLength={150}
                rows={3}
                placeholder="의미 있는 변화·행동 (Meaningful Change)"
                value={form.observation_note}
                onChange={(e) => patch({ observation_note: e.target.value })}
              />
              <p className="mr-track-hint">{form.observation_note.length}/150</p>
            </section>
          </>
        )}

        {warnings.length > 0 && (
          <div className="mr-track-warn">
            {warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}
        {saveError && <p className="mr-track-error">{saveError}</p>}
      </div>

      <div className="mr-track-sticky-bar">
        <span className="mr-track-save-status">
          {saveState === 'saving' && '저장 중…'}
          {saveState === 'saved' && '저장됨 ✓'}
          {saveState === 'error' && '저장 실패'}
        </span>
        <button type="button" className="btn-ghost mr-track-sticky-secondary" onClick={() => void persist(true)}>
          임시저장
        </button>
        <button type="button" className="btn-fire mr-track-sticky-primary" onClick={() => void saveAndNext()}>
          {nextChildId ? '저장하고 다음 아동' : '저장하고 목록'}
        </button>
      </div>
    </>
  );
}
