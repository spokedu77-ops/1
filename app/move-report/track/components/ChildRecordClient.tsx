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
import {
  DISPLAY_DIRECTIONS,
  PRIMARY_SKILLS,
  PROCESS_STATES,
  TASK_STATES,
  decisionForDisplayDirection,
  defaultPrimarySkillForSession,
  recommendSelection,
  toDisplayDirection,
  type ProcessState,
  type SelectionDecision,
  type TaskState,
} from '@/app/lib/move-report/track/learningLoop';

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
  primary_skill: string | null;
  skill_level: number | null;
  task_state: TaskState | null;
  process_state: ProcessState | null;
  selection_decision: SelectionDecision | null;
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

const BASE_INITIAL: FormState = {
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
  primary_skill: null,
  skill_level: null,
  task_state: null,
  process_state: null,
  selection_decision: null,
};

export default function ChildRecordClient({ sessionId, childId, childIds, sessionNumber }: Props) {
  const router = useRouter();
  const defaultSkill = useMemo(() => defaultPrimarySkillForSession(sessionNumber), [sessionNumber]);
  const [childName, setChildName] = useState('');
  const [form, setForm] = useState<FormState>({ ...BASE_INITIAL, primary_skill: defaultSkill });
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

  const recommendation = useMemo(
    () =>
      recommendSelection({
        attendance_status: form.attendance_status,
        observation_opportunity_band: form.observation_opportunity_band,
        primary_skill: form.primary_skill,
        skill_level: form.skill_level,
        task_state: form.task_state,
        process_state: form.process_state,
        support_level: form.support_level,
      }),
    [
      form.attendance_status,
      form.observation_opportunity_band,
      form.primary_skill,
      form.skill_level,
      form.task_state,
      form.process_state,
      form.support_level,
    ],
  );

  const recommendationDirection = toDisplayDirection(recommendation);
  const selectedDirection = toDisplayDirection(form.selection_decision) ?? recommendationDirection;

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
            primary_skill: record.primary_skill ?? defaultSkill,
            skill_level: record.skill_level,
            task_state: record.task_state,
            process_state: record.process_state,
            selection_decision: record.selection_decision,
          });
        } else {
          setForm({ ...BASE_INITIAL, primary_skill: defaultSkill });
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
  }, [sessionId, childId, defaultSkill]);

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
        const learningLoopChanged = [
          'observation_opportunity_band',
          'primary_skill',
          'skill_level',
          'task_state',
          'process_state',
          'support_level',
        ].some((key) => Object.prototype.hasOwnProperty.call(partial, key));

        if (learningLoopChanged && !Object.prototype.hasOwnProperty.call(partial, 'selection_decision')) {
          next = { ...next, selection_decision: null };
        }
        if (partial.observation_opportunity_band !== undefined && partial.observation_opportunity_band !== 'three_plus') {
          if (next.frw_status === 'observed_stable') next = { ...next, frw_status: null };
        }
        if (partial.attendance_status === 'absent') {
          next = { ...BASE_INITIAL, attendance_status: 'absent', absence_reason: prev.absence_reason };
        }
        if (partial.attendance_status === 'present' && prev.attendance_status === 'absent') {
          next = { ...BASE_INITIAL, attendance_status: 'present', primary_skill: defaultSkill };
        }
        if (partial.observation_opportunity_band === null && next.attendance_status === 'present') {
          next = {
            ...next,
            participation_level: null,
            support_level: null,
            independent_initiation: null,
            self_reengagement: null,
            spomove_used: null,
            frw_seconds: null,
            frw_status: null,
            movementKeys: [],
            primary_skill: null,
            skill_level: null,
            task_state: null,
            process_state: null,
            selection_decision: null,
          };
        }
        if (partial.spomove_used === false) {
          next = { ...next, frw_seconds: null, frw_status: null };
        }
        return next;
      });
      scheduleAutosave();
    },
    [scheduleAutosave, defaultSkill],
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

  const chooseDirection = useCallback(
    (direction: (typeof DISPLAY_DIRECTIONS)[number]['value']) => {
      patch({ selection_decision: decisionForDisplayDirection(direction, recommendation) });
    },
    [patch, recommendation],
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
                  <h2 className="mr-track-section-label">핵심 기록</h2>
                  <p className="mr-track-hint">대표 기술 1개만 보고 다음 수업 방향을 정합니다.</p>

                  <label className="mr-track-domain-label" htmlFor="primary-skill">대표 기술</label>
                  <select
                    id="primary-skill"
                    className="mr-track-input"
                    value={form.primary_skill ?? ''}
                    onChange={(e) => patch({ primary_skill: e.target.value || null })}
                  >
                    <option value="">선택</option>
                    {PRIMARY_SKILLS.map((skill) => (
                      <option key={skill} value={skill}>{skill}</option>
                    ))}
                  </select>

                  <p className="mr-track-domain-label">과제 수준</p>
                  <div className="mr-track-chips">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`mr-track-chip${form.skill_level === level ? ' mr-track-chip--on' : ''}`}
                        onClick={() => patch({ skill_level: level })}
                      >
                        L{level}
                      </button>
                    ))}
                  </div>
                  <p className="mr-track-hint">L1~L5는 학생 등급이 아니라 이 기술의 과제 복잡도입니다.</p>

                  <p className="mr-track-domain-label">오늘 수행</p>
                  <div className="mr-track-chips">
                    {TASK_STATES.map((state) => (
                      <button
                        key={state.value}
                        type="button"
                        className={`mr-track-chip${form.task_state === state.value ? ' mr-track-chip--on' : ''}`}
                        onClick={() => patch({ task_state: state.value })}
                      >
                        {state.label}
                      </button>
                    ))}
                  </div>

                  <p className="mr-track-domain-label">도움 수준</p>
                  <div className="mr-track-level-grid mr-track-level-grid--5">
                    {SUPPORT_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        title={`${level.title} · ${level.desc}`}
                        className={`mr-track-level${form.support_level === level.value ? ' mr-track-level--on' : ''}`}
                        onClick={() => patch({ support_level: level.value })}
                      >
                        <span className="mr-track-level-num">{level.label}</span>
                      </button>
                    ))}
                  </div>

                  <p className="mr-track-domain-label">다음 방향</p>
                  {recommendationDirection && (
                    <p className="mr-track-hint">
                      추천: {DISPLAY_DIRECTIONS.find((d) => d.value === recommendationDirection)?.label}
                    </p>
                  )}
                  <div className="mr-track-chips">
                    {DISPLAY_DIRECTIONS.map((direction) => (
                      <button
                        key={direction.value}
                        type="button"
                        title={direction.desc}
                        className={`mr-track-chip${selectedDirection === direction.value ? ' mr-track-chip--on' : ''}`}
                        onClick={() => chooseDirection(direction.value)}
                      >
                        {direction.label}
                      </button>
                    ))}
                  </div>
                </section>

                <details className="mr-track-section">
                  <summary className="mr-track-section-label">추가 관찰</summary>
                  <p className="mr-track-hint">필요한 회기에만 펼쳐서 기록합니다.</p>

                  <div className="mr-track-domain">
                    <p className="mr-track-domain-label">움직임 과정</p>
                    <div className="mr-track-chips">
                      {PROCESS_STATES.map((state) => (
                        <button
                          key={state.value}
                          type="button"
                          className={`mr-track-chip${form.process_state === state.value ? ' mr-track-chip--on' : ''}`}
                          onClick={() => patch({ process_state: state.value })}
                        >
                          {state.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mr-track-domain">
                    <p className="mr-track-domain-label">Participation</p>
                    <div className="mr-track-level-grid">
                      {PARTICIPATION_LEVELS.map((level) => (
                        <button
                          key={level.value}
                          type="button"
                          className={`mr-track-level${form.participation_level === level.value ? ' mr-track-level--on' : ''}`}
                          onClick={() => patch({ participation_level: level.value })}
                        >
                          <span className="mr-track-level-num">{level.label}</span>
                          <span className="mr-track-level-title">{level.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mr-track-domain">
                    <p className="mr-track-domain-label">Independent Initiation</p>
                    <div className="mr-track-chips">
                      {INDEPENDENT_INITIATION.map((level) => (
                        <button
                          key={level.value}
                          type="button"
                          className={`mr-track-chip${form.independent_initiation === level.value ? ' mr-track-chip--on' : ''}`}
                          onClick={() => patch({ independent_initiation: level.value })}
                        >
                          {level.label} {level.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mr-track-domain">
                    <p className="mr-track-domain-label">Self Re-engagement</p>
                    <div className="mr-track-chips">
                      {SELF_REENGAGEMENT.map((option) => {
                        const val = option.value === 'null' ? null : option.value === 'true';
                        const on = form.self_reengagement === val;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={`mr-track-chip${on ? ' mr-track-chip--on' : ''}`}
                            onClick={() => patch({ self_reengagement: val })}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mr-track-domain">
                    <p className="mr-track-domain-label">SPOMOVE</p>
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
                          {FRW_SECONDS.map((seconds) => (
                            <button
                              key={seconds.value}
                              type="button"
                              className={`mr-track-chip${form.frw_seconds === seconds.value ? ' mr-track-chip--on' : ''}`}
                              onClick={() => patch({ frw_seconds: seconds.value })}
                            >
                              {seconds.label}
                            </button>
                          ))}
                        </div>
                        <div className="mr-track-chips">
                          {frwStatusOptions.map((status) => (
                            <button
                              key={status.value}
                              type="button"
                              disabled={status.disabled}
                              className={`mr-track-chip${form.frw_status === status.value ? ' mr-track-chip--on' : ''}${status.disabled ? ' mr-track-chip--disabled' : ''}`}
                              onClick={() => patch({ frw_status: status.value })}
                            >
                              {status.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mr-track-domain">
                    <p className="mr-track-domain-label">Movement Experience</p>
                    {MOVEMENT_DOMAINS.map((domain) => (
                      <div key={domain.id} className="mr-track-domain">
                        <p className="mr-track-domain-label">{domain.label}</p>
                        <div className="mr-track-chips">
                          {domain.subtags.map((tag) => {
                            const key = movementKey(domain.id, tag);
                            return (
                              <button
                                key={key}
                                type="button"
                                className={`mr-track-chip mr-track-chip--sm${form.movementKeys.includes(key) ? ' mr-track-chip--on' : ''}`}
                                onClick={() => toggleMovement(domain.id, tag)}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </>
            )}

            <section className="mr-track-section">
              <h2 className="mr-track-section-label">메모</h2>
              <textarea
                className="mr-track-textarea"
                maxLength={150}
                rows={3}
                placeholder="필요한 경우 핵심 성공·어려움만 한 줄로 기록"
                value={form.observation_note}
                onChange={(e) => patch({ observation_note: e.target.value })}
              />
              <p className="mr-track-hint">{form.observation_note.length}/150</p>
            </section>
          </>
        )}

        {warnings.length > 0 && (
          <div className="mr-track-warn">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
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
