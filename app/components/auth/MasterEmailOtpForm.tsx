'use client';

import type { ReactNode } from 'react';
import { Mail } from 'lucide-react';

export type MasterEmailOtpFormProps = {
  email: string;
  otp: string;
  otpSent: boolean;
  loading?: boolean;
  message?: string | null;
  /** login: 로그인 화면 / payment: 다크 MASTER 톤 */
  variant?: 'login' | 'payment';
  title?: string;
  description?: string;
  sendLabel?: string;
  verifyLabel?: string;
  footer?: ReactNode;
  onEmailChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onSubmit: () => void;
};

export function MasterEmailOtpForm({
  email,
  otp,
  otpSent,
  loading = false,
  message,
  variant = 'login',
  title = '이메일로 시작하기',
  description = '인증 후 계정 설정으로 이어집니다. 이미 계정이 있으면 같은 이메일로 로그인됩니다. 수업 기능은 구독 선택 후 사용할 수 있습니다.',
  sendLabel = '인증 코드 받기',
  verifyLabel = '시작하기',
  footer,
  onEmailChange,
  onOtpChange,
  onSubmit,
}: MasterEmailOtpFormProps) {
  const isPayment = variant === 'payment';

  if (isPayment) {
    return (
      <div className="mt-4 space-y-3">
        {!otpSent ? (
          <>
            <input
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              type="email"
              placeholder="이메일 주소"
              className="h-12 w-full rounded-[12px] border px-3 text-[14px] font-semibold outline-none"
              style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white disabled:opacity-60"
              style={{ background: 'var(--spm-acc)' }}
            >
              <Mail size={15} />
              {loading ? '인증 처리 중...' : sendLabel}
            </button>
          </>
        ) : (
          <>
            <input
              value={otp}
              onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="인증 코드 6자리"
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSubmit();
              }}
              className="h-12 w-full rounded-[12px] border px-3 text-center text-[20px] font-black outline-none"
              style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white disabled:opacity-60"
              style={{ background: 'var(--spm-acc)' }}
            >
              {loading ? '인증 처리 중...' : verifyLabel}
            </button>
          </>
        )}
        {message ? (
          <p className="text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>
            {message}
          </p>
        ) : null}
        {footer}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[17px] font-black tracking-tight text-slate-900">{title}</p>
        <p className="mt-1.5 text-[13px] font-medium leading-6 text-slate-500">{description}</p>
      </div>
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="email"
          placeholder="이메일 주소를 입력해 주세요"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          className="w-full min-h-12 rounded-2xl border border-slate-200 bg-white p-4 pl-12 text-base font-bold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
        />
      </div>
      {otpSent ? (
        <input
          inputMode="numeric"
          maxLength={6}
          placeholder="6자리 인증 코드"
          value={otp}
          onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSubmit();
          }}
          className="w-full min-h-12 rounded-2xl border border-slate-200 bg-white p-4 text-center text-[20px] font-black tracking-[0.28em] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
        />
      ) : null}
      {message ? <p className="text-xs font-bold text-blue-700">{message}</p> : null}
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 disabled:opacity-70"
      >
        {loading ? '인증 처리 중...' : otpSent ? verifyLabel : sendLabel}
      </button>
      {footer}
    </div>
  );
}
