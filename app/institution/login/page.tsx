'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ManualCredentialInput, SavedCredentialDecoy } from '@/app/components/auth/ManualCredentialInput';

type InstitutionLoginResponse = {
  ok?: boolean;
  institution?: boolean;
  destination?: string;
  error?: string;
};

export default function InstitutionLoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/institution/status', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => ({ response, body: await response.json() as InstitutionLoginResponse }))
      .then(({ response, body }) => {
        if (!cancelled && response.ok && body.institution && body.destination) {
          router.replace(body.destination);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/institution/login', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      });
      const body = await response.json() as InstitutionLoginResponse;
      if (!response.ok || !body.ok || !body.destination) {
        setPassword('');
        setError(body.error ?? '로그인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      router.replace(body.destination);
      router.refresh();
    } catch {
      setPassword('');
      setError('로그인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)' }}>
      <section className="w-full max-w-[440px] rounded-[20px] border p-6 sm:p-8" style={{ background: 'var(--spm-s1)', borderColor: 'var(--spm-br2)' }}>
        <SavedCredentialDecoy />
        <p className="text-[13px] font-semibold" style={{ color: 'var(--spm-acc)' }}>SPOKEDU LAB</p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight">기관 전용 로그인</h1>

        <form className="relative mt-8 space-y-4" autoComplete="off" onSubmit={submit}>
          <label className="block text-[14px] font-semibold">
            기관 계정
            <ManualCredentialInput
              name="spk-institution-account"
              value={loginId}
              onValueChange={setLoginId}
              required
              disabled={checking || loading}
              autoCapitalize="none"
              className="mt-2 min-h-12 w-full rounded-[12px] border px-4 text-[15px] font-medium outline-none focus:ring-2 focus:ring-[var(--spm-acc)] disabled:opacity-60"
              style={{ background: 'var(--spm-s1)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
            />
          </label>
          <label className="block text-[14px] font-semibold">
            비밀번호
            <ManualCredentialInput
              type="password"
              name="spk-institution-secret"
              value={password}
              onValueChange={setPassword}
              required
              disabled={checking || loading}
              className="mt-2 min-h-12 w-full rounded-[12px] border px-4 text-[15px] font-medium outline-none focus:ring-2 focus:ring-[var(--spm-acc)] disabled:opacity-60"
              style={{ background: 'var(--spm-s1)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
            />
          </label>
          <button
            type="submit"
            disabled={checking || loading || !loginId.trim() || !password}
            className="spm-btn-primary inline-flex min-h-12 w-full items-center justify-center rounded-[12px] px-4 text-[14px] font-semibold disabled:opacity-60"
          >
            {checking || loading ? <Loader2 className="mr-2 animate-spin" size={18} aria-hidden /> : null}
            로그인
          </button>
          {error ? (
            <p role="alert" className="rounded-[10px] px-3 py-2 text-[13px] font-semibold" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--spm-red)' }}>
              {error}
            </p>
          ) : null}
        </form>

        <p className="mt-7 text-center text-[13px] font-medium" style={{ color: 'var(--spm-t2)' }}>
          계정 관련 문의: SPOKEDU
        </p>
      </section>
    </main>
  );
}
