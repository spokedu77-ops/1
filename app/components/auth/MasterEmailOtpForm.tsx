'use client';

import type { ReactNode } from 'react';
import { Mail } from 'lucide-react';

export type MasterEmailOtpFormProps = {
  email: string;
  otp: string;
  otpSent: boolean;
  loading?: boolean;
  message?: string | null;
  /** login: 둥근 블루 카드 / payment: 다크 MASTER 톤 */
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
  title = 'SPOKEDU MASTER 시작하기',
  description = '이메일 인증 후 계정 설정(온보딩)으로 이어집니다. 기존 계정이 있다면 같은 이메일로 로그인됩니다. 수업 기능은 구독 선택 후 사용할 수 있습니다.',
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
    <div className="space-y-4 rounded-3xl border border-blue-100 bg-blue-50/80 p-4">
      <div>
        <p className="text-lg font-black text-blue-950">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-blue-900/80">{description}</p>
      </div>
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
        <input
          type="email"
          placeholder="이메일 주소를 입력해 주세요"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          className="w-full min-h-[48px] rounded-2xl border-2 border-transparent bg-white p-4 pl-12 text-base font-bold text-black outline-none transition-all focus:border-blue-600"
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
          className="w-full min-h-[48px] rounded-2xl border-2 border-transparent bg-white p-4 text-base font-bold text-black outline-none transition-all focus:border-blue-600"
        />
      ) : null}
      {message ? <p className="text-xs font-bold text-blue-700">{message}</p> : null}
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="w-full min-h-[48px] rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-100 disabled:opacity-70"
      >
        {loading ? '인증 처리 중...' : otpSent ? verifyLabel : sendLabel}
      </button>
      {footer}
    </div>
  );
}
