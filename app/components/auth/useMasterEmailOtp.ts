'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

type MasterEmailOtpUser = {
  id: string;
  email?: string | null;
};

type SubmitResult =
  | { ok: true; kind: 'sent' }
  | { ok: true; kind: 'user'; user: MasterEmailOtpUser }
  | { ok: false; message: string };

export function useMasterEmailOtp() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async (): Promise<SubmitResult> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) {
      const msg = '이메일 주소를 입력해 주세요.';
      setError(msg);
      return { ok: false, message: msg };
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: { shouldCreateUser: true },
      });
      if (authError) {
        const msg = '로그인 코드를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.';
        setError(msg);
        return { ok: false, message: msg };
      }
      setEmail(normalized);
      setOtpSent(true);
      setMessage(`${normalized}로 6자리 인증 코드를 보냈습니다.`);
      return { ok: true, kind: 'sent' };
    } finally {
      setLoading(false);
    }
  };

  const verify = async (): Promise<SubmitResult> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@') || otp.trim().length < 6) {
      const msg = '이메일로 받은 6자리 인증 코드를 입력해 주세요.';
      setError(msg);
      return { ok: false, message: msg };
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.verifyOtp({
        email: normalized,
        token: otp.trim(),
        type: 'email',
      });
      if (authError) {
        const msg = '인증 코드가 올바르지 않습니다. 다시 확인해 주세요.';
        setError(msg);
        return { ok: false, message: msg };
      }
      const user = data.user ?? (await supabase.auth.getUser()).data.user;
      if (!user) {
        const msg = '인증 코드를 확인하지 못했습니다.';
        setError(msg);
        return { ok: false, message: msg };
      }
      return { ok: true, kind: 'user', user: { id: user.id, email: user.email ?? normalized } };
    } finally {
      setLoading(false);
    }
  };

  const submit = async (): Promise<SubmitResult> => {
    if (!otpSent) return send();
    return verify();
  };

  return {
    email,
    setEmail,
    otp,
    setOtp,
    otpSent,
    message,
    error,
    setError,
    loading,
    send,
    verify,
    submit,
  };
}
