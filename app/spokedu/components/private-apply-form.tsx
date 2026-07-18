'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { brandContactLinks, brandProfile } from '../data/brand';
import {
  PRIVATE_MOVE_REPORT_EVENT,
  PRIVATE_MOVE_REPORT_SUMMARY_KEY,
  readPrivateMoveReportSummary,
} from '../lib/private-move-report';
import { koreanLineBreak, siteBtnPrimary, siteBtnSecondary } from '../lib/ui-classes';
import { trackMoveReportEvent } from '@/app/move-report/lib/events';

const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_VGWxeb/chat';

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';
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

/** /info/private ApplyForm 전환 엔진 — spokedu 브랜드 톤으로 이식 */
export function PrivateApplyForm() {
  const [learners, setLearners] = useState<string[]>(['']);
  const [phone, setPhone] = useState('');
  const [sport, setSport] = useState('');
  const [region, setRegion] = useState('');
  const [schedule, setSchedule] = useState('');
  const [note, setNote] = useState('');
  const [reportSummary, setReportSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>({ tone: 'idle', message: '' });

  const syncReportSummary = useCallback(() => {
    setReportSummary(readPrivateMoveReportSummary());
  }, []);

  useEffect(() => {
    syncReportSummary();

    const onStorage = (event: StorageEvent) => {
      if (event.key === PRIVATE_MOVE_REPORT_SUMMARY_KEY || event.key === null) {
        syncReportSummary();
      }
    };
    const onCustom = () => syncReportSummary();
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncReportSummary();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(PRIVATE_MOVE_REPORT_EVENT, onCustom as EventListener);
    window.addEventListener('focus', syncReportSummary);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(PRIVATE_MOVE_REPORT_EVENT, onCustom as EventListener);
      window.removeEventListener('focus', syncReportSummary);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [syncReportSummary]);

  const filledCount = useMemo(() => {
    let n = learners.some((l) => l.trim()) ? 1 : 0;
    for (const v of [phone, sport, region, schedule, note]) {
      if (v.trim()) n += 1;
    }
    return n;
  }, [learners, phone, sport, region, schedule, note]);

  const requiredCount = useMemo(() => {
    let n = learners.some((l) => l.trim()) ? 1 : 0;
    for (const v of [phone, sport, region, schedule]) {
      if (v.trim()) n += 1;
    }
    return n;
  }, [learners, phone, sport, region, schedule]);

  const previewText = useMemo(() => {
    const learnerText = formatLearnerBlock(learners);
    const head: string[] = [
      '안녕하세요. SPOKEDU 개인·소그룹 체육 상담을 의뢰합니다.',
      '',
      learnerText.startsWith('\n')
        ? `1. 학습자 정보 :${learnerText}`
        : `1. 학습자 정보 : ${learnerText}`,
      `2. 연락처(휴대폰) : ${safeVal(phone)}`,
      `3. 희망 종목 : ${safeVal(sport)}`,
      `4. 방문 지역/장소 : ${safeVal(region)}`,
      `5. 가능 시간대 : ${safeVal(schedule)}`,
      `6. 전하고 싶은 말 : ${safeVal(note)}`,
    ];
    if (reportSummary.trim()) {
      head.push('', '[SPOKEDU 사전 리포트 요약]');
      for (const raw of reportSummary.split('\n')) {
        const line = raw.trimEnd();
        if (line.trim() === '') continue;
        head.push(line);
      }
    }
    head.push('', '위 내용을 바탕으로 맞춤 상담 및 일정 안내를 도와드리겠습니다.');
    return head.join('\n');
  }, [learners, phone, sport, region, schedule, note, reportSummary]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback below
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }, []);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(previewText);
    setStatus({
      tone: ok ? 'ok' : 'error',
      message: ok ? '카카오 상담 문구를 복사했습니다. 채널에 붙여 넣어 주세요.' : '복사에 실패했습니다.',
    });
  }, [copyToClipboard, previewText]);

  const handleSubmit = useCallback(async () => {
    const learnerLines = learners.map((l) => l.trim()).filter(Boolean);
    if (!learnerLines.length || !phone.trim() || !sport.trim() || !region.trim() || !schedule.trim()) {
      setStatus({
        tone: 'error',
        message: '필수 항목(학습자·연락처·종목·지역·시간)을 모두 기재해 주세요.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/private/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: learnerLines.join('\n'),
          phone: phone.trim(),
          content: previewText,
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; emailSent?: boolean; message?: string }
        | null;
      if (!response.ok || !result?.ok) {
        setStatus({
          tone: 'error',
          message: result?.message || '접수 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        });
        return;
      }
      if (reportSummary.trim()) {
        void trackMoveReportEvent({
          eventName: 'move_report_private_apply_submitted',
          meta: { hasMoveReportSummary: true },
        });
      }
      setStatus({
        tone: 'ok',
        message:
          result.message ||
          (result.emailSent ? '접수 내용이 운영 메일로 발송되었습니다.' : '접수가 저장되었습니다.'),
      });
    } catch {
      setStatus({ tone: 'error', message: '네트워크 오류로 접수에 실패했습니다.' });
    } finally {
      setSubmitting(false);
    }
  }, [learners, phone, sport, region, schedule, previewText, reportSummary]);

  return (
    <section id="apply" className="scroll-mt-24 space-y-6 sm:space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-800">상담 신청</p>
        <h2 className={`mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl ${koreanLineBreak}`}>
          개인·소그룹 수업 상담 의
        </h2>
        <p className={`mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
          아래 양식을 작성해 접수하거나, 카카오 상담 문구를 복사해 채널로 보내 주세요. Move Report 요약이 있으면 자동으로 포함됩니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { step: '1', title: '간편 폼 작성', desc: '하단 양식 입력' },
          { step: '2', title: '카카오·접수', desc: '내용 확인 상담' },
          { step: '3', title: '일정 배정', desc: '맞춤 수업 시작' },
        ].map((item) => (
          <div key={item.step} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-bold text-teal-800">{item.step}</p>
            <p className="mt-1 text-sm font-bold text-slate-950">{item.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:p-6 lg:p-8">
        <div className="rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-sm text-slate-700">
          1:1·소그룹 맞춤 수업 특성상 연령·종목·방문 지역을 정확히 적어 주시면 안내가 빨라집니다.
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-700">입력 진행</span>
            <span className="font-bold text-teal-800">{filledCount}/6 단계</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-teal-600 transition-all"
              style={{ width: `${(requiredCount / 5) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className={labelClass}>
                1. 아이 연령 / 성별 / 이름 <span className="text-teal-700">*</span>
              </label>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
                      className="shrink-0 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600"
                      onClick={() => setLearners((prev) => prev.filter((_, i) => i !== index))}
                    >
                      삭제
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
            <div>
              <label className={labelClass} htmlFor="private-sport">
                3. 희망 종목 <span className="text-teal-700">*</span>
              </label>
              <input
                id="private-sport"
                className={inputClass}
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                placeholder="예: 기초체력, 축구 준비"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="private-region">
                4. 방문 지역/장소 <span className="text-teal-700">*</span>
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
                5. 가능 시간대 <span className="text-teal-700">*</span>
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
              6. 전하고 싶은 말
            </label>
            <textarea
              id="private-note"
              className={`${inputClass} min-h-[96px] resize-y`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="아이 성향, 목표, 주의사항을 적어 주세요."
            />
          </div>

          {reportSummary.trim() ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Move Report 요약 포함</p>
              <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{reportSummary}</pre>
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">카카오 상담 미리보기</p>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
            {previewText}
          </pre>
        </div>

        {status.message ? (
          <p
            className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
              status.tone === 'ok' ? 'bg-teal-50 text-teal-900' : 'bg-rose-50 text-rose-800'
            }`}
            role="status"
          >
            {status.message}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" disabled={submitting} onClick={handleSubmit} className={`${siteBtnPrimary} disabled:opacity-60`}>
            {submitting ? '접수 중…' : '상담 접수하기'}
          </button>
          <button type="button" onClick={handleCopy} className={siteBtnSecondary}>
            카카오 문구 복사
          </button>
          <a
            href={KAKAO_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={siteBtnSecondary}
          >
            카카오 채널 열기
          </a>
          <a href={brandContactLinks.phone} className={siteBtnSecondary}>
            전화 {brandProfile.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
