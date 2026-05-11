'use client';

import { CheckCircle2, Download, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && window.navigator.standalone === true);
}

export function PwaInstallCard() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    setStandalone(isStandaloneMode());
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwReady(true)).catch(() => setSwReady(false));
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };

    const onInstalled = () => {
      setStandalone(true);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
    setStandalone(isStandaloneMode());
  };

  return (
    <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px]" style={{ background: 'rgba(99,102,241,0.14)' }}>
          <Smartphone size={20} color="var(--spm-acc)" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>PWA</p>
          <h2 className="mt-1 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>홈 화면에 추가</h2>
          <p className="mt-2 text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>수업 중 주소창 없이 SPOMOVE와 라이브러리를 바로 실행합니다.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-[12px] p-3" style={{ background: 'var(--spm-s3)' }}>
          <p className="flex items-center gap-1 text-[12px] font-black" style={{ color: swReady ? 'var(--spm-grn)' : 'var(--spm-amb)' }}>
            <CheckCircle2 size={14} />
            {swReady ? '오프라인 캐시 준비' : '서비스워커 확인 중'}
          </p>
        </div>
        <button type="button" onClick={install} disabled={!promptEvent || standalone} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black text-white disabled:opacity-45" style={{ background: 'var(--spm-acc)' }}>
          <Download size={15} />
          {standalone ? '설치됨' : promptEvent ? '설치하기' : '브라우저 메뉴에서 추가'}
        </button>
      </div>
    </section>
  );
}
