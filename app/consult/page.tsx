'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (options: Record<string, unknown>) => void;
      };
    };
  }
}

const DEFAULT_CHANNEL_URL = 'https://pf.kakao.com/_VGWxeb/chat';

function loadKakaoSdk(): Promise<void> {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY?.trim();
  if (!key) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    if (window.Kakao?.isInitialized?.()) {
      resolve();
      return;
    }
    const existing = document.getElementById('kakao-js-sdk');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Kakao SDK load failed')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = 'kakao-js-sdk';
    script.async = true;
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Kakao SDK load failed'));
    document.head.appendChild(script);
  });
}

export default function ConsultPage() {
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [childAge, setChildAge] = useState('');
  const [content, setContent] = useState('');
  const [consultType, setConsultType] = useState<'tutoring' | 'center'>('tutoring');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [kakaoReady, setKakaoReady] = useState(false);

  const channelUrl =
    process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL?.trim() || DEFAULT_CHANNEL_URL;
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY?.trim();

  useEffect(() => {
    if (!kakaoKey) {
      setKakaoReady(false);
      return;
    }
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !kakaoKey || !window.Kakao) return;
        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(kakaoKey);
        }
        setKakaoReady(true);
      })
      .catch(() => setKakaoReady(false));
    return () => {
      cancelled = true;
    };
  }, [kakaoKey]);

  const openKakaoShare = useCallback(
    (summary: { parentName: string; phone: string; childAge: string; content: string }) => {
      const Kakao = window.Kakao;
      if (!Kakao?.Share || !Kakao.isInitialized?.()) {
        window.open(channelUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      const descParts = [
        `이름: ${summary.parentName}`,
        `연락처: ${summary.phone}`,
        summary.childAge ? `자녀 나이: ${summary.childAge}` : null,
        '',
        '— 상담 내용 —',
        summary.content.slice(0, 1800),
      ].filter(Boolean) as string[];
      const description = descParts.join('\n').slice(0, 2000);

      try {
        Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: '스포키듀 상담 신청',
            description,
            imageUrl:
              process.env.NEXT_PUBLIC_KAKAO_SHARE_IMAGE_URL?.trim() ||
              'https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png',
            link: {
              mobileWebUrl: channelUrl,
              webUrl: channelUrl,
            },
          },
          buttons: [
            {
              title: '카카오 채널로 문의',
              link: {
                mobileWebUrl: channelUrl,
                webUrl: channelUrl,
              },
            },
          ],
        });
      } catch {
        window.open(channelUrl, '_blank', 'noopener,noreferrer');
      }
    },
    [channelUrl]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_name: parentName,
          phone,
          child_age: childAge,
          content,
          consult_type: consultType,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setMessage({ type: 'err', text: json.message ?? '접수에 실패했습니다.' });
        return;
      }

      setMessage({
        type: 'ok',
        text: '접수되었습니다. 이제 카카오로 안내를 공유하거나 채널로 바로 이동할 수 있습니다.',
      });

      const summary = {
        parentName: parentName.trim(),
        phone: phone.trim(),
        childAge: childAge.trim(),
        content: content.trim(),
      };
      if (kakaoKey && kakaoReady) {
        openKakaoShare(summary);
      } else {
        window.open(channelUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setMessage({ type: 'err', text: '네트워크 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  }

  function openChannel() {
    window.open(channelUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-6 sm:py-12">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">SPOKEDU</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">전문 상담 접수하기</h1>
            <button
              type="button"
              onClick={openChannel}
              className="inline-flex w-full items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 sm:w-auto"
            >
              카카오 채널 바로가기
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            아래 내용을 남겨 주시면 담당자가 확인 후 연락드립니다. 제출 후 카카오 채널 안내를 공유할 수 있습니다.
          </p>

          {!kakaoKey && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              카카오 공유를 쓰려면 환경변수 <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_KAKAO_JS_KEY</code>를
              설정해 주세요. 미설정 시 채널 페이지만 새 탭으로 열립니다.
            </p>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-5 sm:mt-8">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                상담 타입 <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConsultType('tutoring')}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    consultType === 'tutoring'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  과외
                </button>
                <button
                  type="button"
                  onClick={() => setConsultType('center')}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    consultType === 'center'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  센터
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="parent_name" className="block text-sm font-medium text-slate-700">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                id="parent_name"
                name="parent_name"
                type="text"
                autoComplete="name"
                required
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none ring-indigo-500/0 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label htmlFor="child_age" className="block text-sm font-medium text-slate-700">
                자녀 나이
              </label>
              <input
                id="child_age"
                name="child_age"
                type="text"
                placeholder="예: 초5, 만 11세"
                value={childAge}
                onChange={(e) => setChildAge(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-slate-700">
                상담 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                name="content"
                required
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="문의하실 내용을 적어 주세요."
                className="mt-1 block w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {message && (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  message.type === 'ok'
                    ? 'bg-emerald-50 text-emerald-900'
                    : 'bg-red-50 text-red-900'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? '제출 중…' : '상담 신청하기'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            제출 시 입력하신 내용이 시스템에 저장됩니다. 카카오 공유는 기기의 카카오톡 앱 흐름에 따라 달라질 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
