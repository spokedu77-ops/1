'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

const INTERESTED_PLANS = ['Library', 'All-in-One', 'SPOMOVE 단독', '아직 모르겠음'] as const;
const HAS_KIDS = ['운영 중', '준비 중', '운영 안 함'] as const;
const HAS_SCREEN = ['TV 있음', '빔프로젝터 있음', '태블릿/노트북만 있음', '아직 없음'] as const;

function fieldClass() {
  return 'mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30';
}

function labelClass() {
  return 'text-xs font-bold uppercase tracking-wider text-slate-400';
}

export default function ProApplyClient() {
  const searchParams = useSearchParams();
  const isInquiry = searchParams.get('type') === 'inquiry';

  const [dojoName, setDojoName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [interestedPlan, setInterestedPlan] = useState<string>(INTERESTED_PLANS[0]);
  const [hasKidsClass, setHasKidsClass] = useState<string>(HAS_KIDS[0]);
  const [hasScreenEquipment, setHasScreenEquipment] = useState<string>(HAS_SCREEN[0]);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        const res = await fetch('/api/pro/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dojoName,
            contactName,
            phone,
            email,
            region,
            interestedPlan,
            hasKidsClass,
            hasScreenEquipment,
            websiteUrl,
            message,
            website: honeypot,
            entry: isInquiry ? 'inquiry' : 'beta',
            privacyConsent,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          if (res.status === 429) {
            setError('잠시 후 다시 시도해 주세요.');
          } else if ((data as { error?: string }).error === 'privacy_consent_required') {
            setError('개인정보 수집 및 이용에 동의해 주세요.');
          } else if ((data as { error?: string }).error === 'email_required') {
            setError('이메일을 입력해 주세요.');
          } else if ((data as { error?: string }).error === 'invalid_email') {
            setError('올바른 이메일 형식인지 확인해 주세요.');
          } else {
            setError('전송에 실패했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.');
          }
          return;
        }
        setDone(true);
      } catch {
        setError('네트워크 오류가 발생했습니다.');
      } finally {
        setSubmitting(false);
      }
    },
    [
      dojoName,
      contactName,
      phone,
      email,
      region,
      interestedPlan,
      hasKidsClass,
      hasScreenEquipment,
      websiteUrl,
      message,
      honeypot,
      privacyConsent,
      isInquiry,
    ]
  );

  return (
    <div className="min-h-[var(--viewport-height-px,100dvh)] bg-[#050509] text-slate-100 selection:bg-violet-500/40 selection:text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-[18%] top-[-14%] h-[420px] w-[420px] rounded-full bg-fuchsia-600/14 blur-[100px]" />
        <div className="absolute right-[-12%] top-[20%] h-[480px] w-[480px] rounded-full bg-cyan-500/10 blur-[110px]" />
        <div className="absolute bottom-[-18%] left-[20%] h-[380px] w-[380px] rounded-full bg-violet-600/12 blur-[95px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-lg px-4 py-10 pb-20 sm:px-6 sm:py-14">
        <Link
          href="/pro"
          className="text-xs font-bold text-cyan-400/90 hover:text-cyan-300 underline-offset-2 hover:underline"
        >
          ← SPOKEDU PRO 소개
        </Link>

        {isInquiry ? (
          <p className="mt-4 inline-flex rounded-full border border-amber-400/25 bg-amber-950/35 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-100">
            도입 문의
          </p>
        ) : null}

        <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">SPOKEDU PRO 베타 관장단 신청</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
          유아·초등부 수업을 강화하고 싶은 태권도장 관장님을 우선으로 베타 관장단을 모집합니다.
          <br />
          신청 후 운영팀이 확인하여 14일 프리미엄 체험 및 도입 안내를 도와드립니다.
        </p>

        {done ? (
          <div className="mt-10 rounded-2xl border border-emerald-500/25 bg-emerald-950/25 px-5 py-6 text-center">
            <p className="text-base font-black text-emerald-100">신청이 완료되었습니다.</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              운영팀이 확인 후 카카오톡 또는 문자로 체험 안내를 드리겠습니다.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              체험 승인이 완료되면 신청하신 이메일로 로그인해 주세요.
              <br />
              신청 이메일과 다른 계정으로 로그인하면 체험 권한이 연결되지 않을 수 있습니다.
            </p>
            <Link
              href="/pro"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/15"
            >
              소개 페이지로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="relative mt-10 space-y-5">
            <div className="absolute -left-[10000px] top-0 h-px w-px overflow-hidden opacity-0" aria-hidden>
              <label htmlFor="pro-lead-website">Website</label>
              <input
                type="text"
                id="pro-lead-website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(ev) => setHoneypot(ev.target.value)}
              />
            </div>

            <div>
              <label htmlFor="dojoName" className={labelClass()}>
                도장명 <span className="text-rose-400">*</span>
              </label>
              <input
                id="dojoName"
                required
                className={fieldClass()}
                value={dojoName}
                onChange={(e) => setDojoName(e.target.value)}
                placeholder="예: ○○태권도"
              />
            </div>

            <div>
              <label htmlFor="contactName" className={labelClass()}>
                담당자명 <span className="text-rose-400">*</span>
              </label>
              <input
                id="contactName"
                required
                className={fieldClass()}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="관장님 성함"
              />
            </div>

            <div>
              <label htmlFor="phone" className={labelClass()}>
                연락처 <span className="text-rose-400">*</span>
              </label>
              <input
                id="phone"
                required
                type="tel"
                className={fieldClass()}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="휴대폰 번호"
              />
            </div>

            <div>
              <label htmlFor="email" className={labelClass()}>
                이메일 <span className="text-rose-400">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className={fieldClass()}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="체험 계정 안내를 받을 이메일을 입력해 주세요"
              />
            </div>

            <div>
              <label htmlFor="region" className={labelClass()}>
                지역 <span className="text-rose-400">*</span>
              </label>
              <input
                id="region"
                required
                className={fieldClass()}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="예: 경기 성남시"
              />
            </div>

            <div>
              <label htmlFor="interestedPlan" className={labelClass()}>
                관심 플랜 <span className="text-rose-400">*</span>
              </label>
              <select
                id="interestedPlan"
                required
                className={fieldClass()}
                value={interestedPlan}
                onChange={(e) => setInterestedPlan(e.target.value)}
              >
                {INTERESTED_PLANS.map((p) => (
                  <option key={p} value={p} className="bg-slate-900">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="hasKidsClass" className={labelClass()}>
                유아·초등부 수업 운영 여부 <span className="text-rose-400">*</span>
              </label>
              <select
                id="hasKidsClass"
                required
                className={fieldClass()}
                value={hasKidsClass}
                onChange={(e) => setHasKidsClass(e.target.value)}
              >
                {HAS_KIDS.map((p) => (
                  <option key={p} value={p} className="bg-slate-900">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="hasScreenEquipment" className={labelClass()}>
                화면 장비 보유 여부 <span className="text-rose-400">*</span>
              </label>
              <select
                id="hasScreenEquipment"
                required
                className={fieldClass()}
                value={hasScreenEquipment}
                onChange={(e) => setHasScreenEquipment(e.target.value)}
              >
                {HAS_SCREEN.map((p) => (
                  <option key={p} value={p} className="bg-slate-900">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="websiteUrl" className={labelClass()}>
                인스타그램 또는 홈페이지 URL <span className="text-slate-600">(선택)</span>
              </label>
              <input
                id="websiteUrl"
                type="text"
                inputMode="url"
                className={fieldClass()}
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://"
              />
            </div>

            <div>
              <label htmlFor="message" className={labelClass()}>
                문의 내용 <span className="text-slate-600">(선택)</span>
              </label>
              <textarea
                id="message"
                rows={4}
                maxLength={2000}
                className={`${fieldClass()} resize-y min-h-[100px]`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="도입 시기, 반 규모, 궁금한 점 등을 적어 주세요."
              />
              <p className="mt-1 text-right text-[11px] text-slate-600">{message.length} / 2000</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  id="privacyConsent"
                  required
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40 focus:ring-offset-0"
                />
                <span className="text-sm font-semibold leading-snug text-slate-200">
                  개인정보 수집 및 이용에 동의합니다.
                </span>
              </label>
              <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                <p>
                  <span className="font-bold text-slate-400">수집 항목:</span>{' '}
                  도장명, 담당자명, 연락처, 이메일, 지역, 문의 내용
                </p>
                <p>
                  <span className="font-bold text-slate-400">이용 목적:</span> SPOKEDU PRO 베타 관장단 안내 및 도입 상담
                </p>
                <p>
                  <span className="font-bold text-slate-400">보관 기간:</span> 상담 종료 후 1년 또는 요청 시 즉시 삭제
                </p>
              </div>
            </div>

            {error ? (
              <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !privacyConsent}
              className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-sm font-black text-white shadow-lg shadow-cyan-900/25 transition hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? '전송 중…' : '베타 관장단 신청하기'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
