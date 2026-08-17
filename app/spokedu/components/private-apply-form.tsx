'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { koreanLineBreak, marketingButtonPrimary, marketingButtonSecondary } from '../lib/ui-classes';
import { KAKAO_CHANNEL_URL } from '../data/external-channels';
import { parseConversionEvidenceSlug } from '../data/commercial-routes';
import type { FieldRecordSlug } from '../data/field-records-catalog';
import {
  isPrivatePreferredFormat,
  isPrivateStartDirection,
  PRIVATE_FORMAT_OPTIONS,
  PRIVATE_INSTRUCTOR_PREFERENCE_OPTIONS,
  PRIVATE_START_DIRECTION_OPTIONS,
  privateFormatLabel,
  privateStartDirectionLabel,
  type PrivatePreferredFormat,
  type PrivateStartDirection,
} from '../data/private-page';
import { getAcquisitionContext, captureAcquisitionFromLocation } from '../lib/acquisition';
import { trackCommercialEvent } from '../lib/commercial-events';

const inputClass =
  'mt-1.5 w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15';
const labelClass = 'text-sm font-semibold text-slate-800';

function safeVal(v: string): string {
  return v.trim() ? v.trim() : '[정보 미기재]';
}

function formatLearnerBlock(learners: string[]): string {
  const lines = learners.map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return '[정보 미기재]';
  if (lines.length === 1) return lines[0];
  return `\n${lines.map((l) => `   · ${l}`).join('\n')}`;
}

type Status = { tone: 'idle' | 'ok' | 'error'; message: string };

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T | '';
  onChange: (next: T) => void;
  name: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={name}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
            value === option.id
              ? 'border-teal-600 bg-teal-600 text-white'
              : 'border-stone-200 bg-white text-slate-700 hover:border-teal-300'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** 개인수업 상담 폼 — 온페이지 문의 전환 */
export function PrivateApplyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [learners, setLearners] = useState<string[]>(['']);
  const [phone, setPhone] = useState('');
  const [startDirection, setStartDirection] = useState<PrivateStartDirection | ''>('');
  const [preferredFormat, setPreferredFormat] = useState<PrivatePreferredFormat | ''>('');
  const [sport, setSport] = useState('');
  const [instructorPreference, setInstructorPreference] = useState('');
  const [region, setRegion] = useState('');
  const [schedule, setSchedule] = useState('');
  const [note, setNote] = useState('');
  const [conversionEvidenceSlug, setConversionEvidenceSlug] = useState<FieldRecordSlug | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submittingRef = useRef(false);
  const [status, setStatus] = useState<Status>({ tone: 'idle', message: '' });

  useEffect(() => {
    try {
      window.localStorage.removeItem('private.moveReport.summary');
      window.localStorage.removeItem('private.moveReport.shareUrl');
    } catch {
      // ignore
    }
    captureAcquisitionFromLocation();
  }, []);

  useEffect(() => {
    const dir = searchParams.get('startDirection');
    const format = searchParams.get('preferredFormat');
    if (dir && isPrivateStartDirection(dir)) {
      setStartDirection(dir);
    }
    if (format && isPrivatePreferredFormat(format)) {
      setPreferredFormat(format);
    }
    const evidence = parseConversionEvidenceSlug(searchParams.get('conversionEvidence'));
    if (evidence) setConversionEvidenceSlug(evidence);
  }, [searchParams]);

  const syncDirectionToUrl = useCallback(
    (next: PrivateStartDirection) => {
      setStartDirection(next);
      trackCommercialEvent({
        name: 'selection_changed',
        route: 'private',
        selectionId: next,
      });
      const params = new URLSearchParams(searchParams.toString());
      params.set('startDirection', next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const filledCount = useMemo(() => {
    let n = learners.some((l) => l.trim()) ? 1 : 0;
    for (const v of [phone, startDirection, preferredFormat, region, schedule, sport, instructorPreference, note]) {
      if (v.trim()) n += 1;
    }
    return n;
  }, [learners, phone, startDirection, preferredFormat, region, schedule, sport, instructorPreference, note]);

  const requiredCount = useMemo(() => {
    let n = learners.some((l) => l.trim()) ? 1 : 0;
    for (const v of [phone, startDirection, preferredFormat, region, schedule]) {
      if (v.trim()) n += 1;
    }
    return n;
  }, [learners, phone, startDirection, preferredFormat, region, schedule]);

  const previewText = useMemo(() => {
    const learnerText = formatLearnerBlock(learners);
    const directionLabel = startDirection ? privateStartDirectionLabel(startDirection) : '[정보 미기재]';
    const formatLabel = preferredFormat ? privateFormatLabel(preferredFormat) : '[정보 미기재]';
    return [
      '안녕하세요. SPOKEDU 개인·소그룹 체육 상담을 의뢰합니다.',
      '',
      learnerText.startsWith('\n')
        ? `1. 학습자 정보 :${learnerText}`
        : `1. 학습자 정보 : ${learnerText}`,
      `2. 연락처(휴대폰) : ${safeVal(phone)}`,
      `3. 시작 방향 : ${directionLabel}`,
      `4. 희망 수업 형태 : ${formatLabel}`,
      `5. 희망 종목(보조) : ${safeVal(sport)}`,
      `6. 지도자 희망 : ${safeVal(instructorPreference)}`,
      `7. 방문 지역/장소 : ${safeVal(region)}`,
      `8. 가능 시간대 : ${safeVal(schedule)}`,
      `9. 전하고 싶은 말 : ${safeVal(note)}`,
      '',
      '위 내용을 바탕으로 맞춤 상담 및 일정 안내를 도와드리겠습니다.',
    ].join('\n');
  }, [
    learners,
    phone,
    startDirection,
    preferredFormat,
    sport,
    instructorPreference,
    region,
    schedule,
    note,
  ]);

  const previewRows = useMemo(
    () => [
      { label: '학습자', value: learners.map((l) => l.trim()).filter(Boolean).join(' / ') || '—' },
      { label: '연락처', value: phone.trim() || '—' },
      {
        label: '시작 방향',
        value: startDirection ? privateStartDirectionLabel(startDirection) : '—',
      },
      {
        label: '수업 형태',
        value: preferredFormat ? privateFormatLabel(preferredFormat) : '—',
      },
      { label: '희망 종목', value: sport.trim() || '—' },
      { label: '지도자 희망', value: instructorPreference.trim() || '—' },
      { label: '지역/장소', value: region.trim() || '—' },
      { label: '가능 시간', value: schedule.trim() || '—' },
      { label: '전달 사항', value: note.trim() || '—' },
    ],
    [
      learners,
      phone,
      startDirection,
      preferredFormat,
      sport,
      instructorPreference,
      region,
      schedule,
      note,
    ],
  );

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current || submitted) return;

    const learnerLines = learners.map((l) => l.trim()).filter(Boolean);
    if (
      !learnerLines.length ||
      !phone.trim() ||
      !startDirection ||
      !preferredFormat ||
      !region.trim() ||
      !schedule.trim()
    ) {
      setStatus({
        tone: 'error',
        message: '필수 항목(학습자·연락처·시작 방향·수업 형태·지역·시간)을 모두 기재해 주세요.',
      });
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const response = await fetch('/api/private/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: learnerLines.join('\n'),
          phone: phone.trim(),
          content: previewText,
          start_direction: startDirection,
          preferred_format: preferredFormat,
          sport: sport.trim() || undefined,
          instructor_preference: instructorPreference.trim() || undefined,
          region: region.trim(),
          schedule: schedule.trim(),
          acquisition: getAcquisitionContext(),
          cta_intent_id: 'private_fit_consult',
          conversion_evidence_slug: conversionEvidenceSlug ?? undefined,
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; emailSent?: boolean; message?: string; leadId?: string }
        | null;
      if (!response.ok || !result?.ok) {
        setStatus({
          tone: 'error',
          message: result?.message || '접수 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        });
        return;
      }
      if (result.leadId) {
        trackCommercialEvent({
          name: 'form_submitted',
          route: 'private',
          leadId: result.leadId,
          selectionId: startDirection,
          ctaIntentId: 'private_fit_consult',
        });
      }
      setSubmitted(true);
      setStatus({
        tone: 'ok',
        message:
          '접수가 완료되었습니다. 이어서 카카오 채널에 학생 이름으로 문의 남겨 주셨다는 메시지를 꼭 남겨 주세요.',
      });
    } catch {
      setStatus({ tone: 'error', message: '네트워크 오류로 접수에 실패했습니다.' });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    learners,
    phone,
    startDirection,
    preferredFormat,
    sport,
    instructorPreference,
    region,
    schedule,
    previewText,
    submitted,
    conversionEvidenceSlug,
  ]);

  return (
    <section id="apply" className="scroll-mt-24 space-y-6 sm:space-y-7">
      <div>
        <p className="text-[11px] font-bold tracking-[0.12em] text-teal-800">상담 신청</p>
        <h2 className={`mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl ${koreanLineBreak}`}>
          개인·소그룹 수업 상담
        </h2>
        <p className={`mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
          시작 방향과 수업 형태를 먼저 알려 주시면, 종목·지역·일정에 맞춰 배정 상담을 이어갑니다.
        </p>
      </div>

      <ol className="grid gap-2.5 sm:grid-cols-3">
        {[
          { step: '01', title: '조건 입력', desc: '방향·형태·일정' },
          { step: '02', title: '접수·카카오', desc: '채널에 문의 남기기' },
          { step: '03', title: '강사 배정', desc: '적합 확인 후 시작' },
        ].map((item) => (
          <li
            key={item.step}
            className="rounded-2xl border border-stone-200/80 bg-white px-4 py-3.5 shadow-[0_12px_40px_-32px_rgba(15,23,42,0.35)]"
          >
            <p className="text-[11px] font-bold tracking-[0.14em] text-teal-800">{item.step}</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{item.title}</p>
            <p className="mt-0.5 text-xs text-stone-500">{item.desc}</p>
          </li>
        ))}
      </ol>

      <div className="overflow-hidden rounded-[1.5rem] border border-stone-200/70 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
        <div className="border-b border-stone-100 bg-stone-50/80 px-5 py-3.5 sm:px-7">
          <p className={`text-sm text-stone-600 ${koreanLineBreak}`}>
            시작 방향은 페이지 상단 카드에서 골라도 여기로 이어집니다. 희망 종목은 보조 정보입니다.
          </p>
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-700">입력 진행</span>
            <span className="font-bold text-teal-800">{filledCount}/9</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-teal-700 transition-all"
              style={{ width: `${(requiredCount / 6) * 100}%` }}
            />
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className={labelClass}>
                  1. 아이 연령 / 성별 / 이름 <span className="text-teal-700">*</span>
                </label>
                <button
                  type="button"
                  className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-stone-50"
                  onClick={() => setLearners((prev) => [...prev, ''])}
                >
                  + 인원 추가
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {learners.map((row, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      className={inputClass}
                      style={{ marginTop: 0 }}
                      value={row}
                      onChange={(e) =>
                        setLearners((prev) => prev.map((v, i) => (i === index ? e.target.value : v)))
                      }
                      placeholder="예: 9세 / 여 / 김○○"
                    />
                    {learners.length > 1 ? (
                      <button
                        type="button"
                        className="shrink-0 rounded-2xl border border-stone-200 px-3 text-sm font-semibold text-slate-600"
                        onClick={() => setLearners((prev) => prev.filter((_, i) => i !== index))}
                      >
                        삭제
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="private-phone">
                2. 연락처 <span className="text-teal-700">*</span>
              </label>
              <input
                id="private-phone"
                type="tel"
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="예: 010-1234-5678"
                autoComplete="tel"
              />
            </div>

            <fieldset>
              <legend className={labelClass}>
                3. 시작 방향 <span className="text-teal-700">*</span>
              </legend>
              <ChipGroup
                name="시작 방향"
                options={PRIVATE_START_DIRECTION_OPTIONS}
                value={startDirection}
                onChange={syncDirectionToUrl}
              />
            </fieldset>

            <fieldset>
              <legend className={labelClass}>
                4. 희망 수업 형태 <span className="text-teal-700">*</span>
              </legend>
              <ChipGroup
                name="희망 수업 형태"
                options={PRIVATE_FORMAT_OPTIONS}
                value={preferredFormat}
                onChange={setPreferredFormat}
              />
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="private-sport">
                  5. 희망 종목 <span className="text-xs font-medium text-stone-500">(선택)</span>
                </label>
                <input
                  id="private-sport"
                  className={inputClass}
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  placeholder="예: 축구 준비, 줄넘기"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="private-instructor">
                  6. 지도자 희망 <span className="text-xs font-medium text-stone-500">(선택)</span>
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRIVATE_INSTRUCTOR_PREFERENCE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setInstructorPreference((prev) => (prev === option ? '' : option))
                      }
                      className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                        instructorPreference === option
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-stone-200 bg-white text-slate-700 hover:border-teal-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <input
                  id="private-instructor"
                  className={inputClass}
                  value={
                    (PRIVATE_INSTRUCTOR_PREFERENCE_OPTIONS as readonly string[]).includes(
                      instructorPreference,
                    )
                      ? ''
                      : instructorPreference
                  }
                  onChange={(e) => setInstructorPreference(e.target.value)}
                  placeholder="기타 희망이 있으면 적어 주세요"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="private-region">
                  7. 방문 지역/장소 <span className="text-teal-700">*</span>
                </label>
                <input
                  id="private-region"
                  className={inputClass}
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="예: 서울 마포 / 집 근처 공원"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="private-schedule">
                  8. 가능 시간대 <span className="text-teal-700">*</span>
                </label>
                <input
                  id="private-schedule"
                  className={inputClass}
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="예: 평일 저녁, 주말 오전"
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="private-note">
                9. 전하고 싶은 말
              </label>
              <textarea
                id="private-note"
                className={`${inputClass} min-h-[96px] resize-y`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="아이 성향, 목표, 주의사항을 적어 주세요."
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/90 px-4 py-4 sm:px-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">상담 내용 미리보기</p>
            <dl className="mt-3 space-y-2.5">
              {previewRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 text-sm">
                  <dt className="font-semibold text-stone-500">{row.label}</dt>
                  <dd className={`min-w-0 text-slate-800 ${koreanLineBreak}`}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {status.message ? (
            <p
              className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
                status.tone === 'ok' ? 'bg-teal-50 text-teal-900' : 'bg-rose-50 text-rose-800'
              }`}
              role="status"
            >
              {status.message}
            </p>
          ) : null}

          <aside
            className="mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-4 sm:px-5"
            aria-labelledby="private-must-read-heading"
          >
            <p
              id="private-must-read-heading"
              className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-900/80"
            >
              필독 사항
            </p>
            <p className={`mt-2 text-sm leading-relaxed text-amber-950 ${koreanLineBreak}`}>
              작성 후, 학생 이름으로 수업 문의 남겨 주셨다고{' '}
              <strong className="font-bold">꼭 카카오 채널 채팅방에 남겨 주셔야 합니다!</strong>
            </p>
            <p className="mt-1.5 text-xs text-amber-900/70">(예시 : 지훈이 수업 문의 남겼습니다)</p>
          </aside>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={submitting || submitted}
              onClick={handleSubmit}
              className={`${marketingButtonPrimary} disabled:opacity-60`}
            >
              {submitted ? '접수 완료' : submitting ? '접수 중…' : '상담 접수하기'}
            </button>
            {KAKAO_CHANNEL_URL ? (
              <a
                href={KAKAO_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={marketingButtonSecondary}
              >
                카카오 채널 열기
              </a>
            ) : null}
            <Link href="#instructors" className={`${marketingButtonSecondary} text-center`}>
              배정 규칙 다시 보기
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
