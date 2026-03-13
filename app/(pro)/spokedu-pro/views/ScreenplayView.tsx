'use client';

import { useState, useEffect } from 'react';
import { MonitorPlay, PlayCircle, RefreshCw } from 'lucide-react';
import {
  MODE_ID_TO_META,
  type ScreenplayCatalogItem,
} from '@/app/lib/spokedu-pro/screenplayCatalog';

function getMeta(item: ScreenplayCatalogItem) {
  return (
    MODE_ID_TO_META[item.modeId] ?? {
      tag: item.modeId,
      tagColor: 'bg-slate-500',
      gradient: 'from-slate-600/20 to-slate-700/10',
      border: 'border-slate-500/30',
      icon: '▶',
    }
  );
}

function ScreenplayCard({
  item,
  onOpenInteractive,
}: {
  item: ScreenplayCatalogItem;
  onOpenInteractive: (mode: string) => void;
}) {
  const meta = getMeta(item);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenInteractive(item.modeId)}
      onKeyDown={(e) => e.key === 'Enter' && onOpenInteractive(item.modeId)}
      className={`media-card bg-gradient-to-br ${meta.gradient} border ${meta.border} p-8 rounded-3xl relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01]`}
    >
      <div className="absolute right-6 top-6 text-[80px] opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all select-none pointer-events-none">
        {meta.icon}
      </div>

      <div className="relative z-10 space-y-4">
        <span className={`inline-block ${meta.tagColor} text-white px-3 py-1 rounded-lg font-bold text-xs`}>
          {meta.tag}
        </span>
        <h3 className="text-2xl lg:text-3xl font-black text-white">{item.title}</h3>
        {item.subtitle && (
          <p className="text-slate-300 text-sm font-medium">{item.subtitle}</p>
        )}
        {item.description && (
          <p className="text-slate-300 text-sm leading-relaxed max-w-lg">{item.description}</p>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenInteractive(item.modeId);
          }}
          className={`mt-4 px-6 py-3 ${meta.tagColor} hover:opacity-90 text-white font-bold rounded-xl flex items-center gap-2 transition-opacity shadow-lg text-sm`}
        >
          <PlayCircle className="w-5 h-5" /> 전체화면 실행
        </button>
      </div>
    </div>
  );
}

export default function ScreenplayView({
  onOpenInteractive,
  onToast,
}: {
  onOpenInteractive: (mode: string) => void;
  onToast: (msg: string) => void;
}) {
  const [screenplays, setScreenplays] = useState<ScreenplayCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/spokedu-pro/screenplays')
      .then((res) => {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setScreenplays(data.screenplays ?? []);
        setFetchError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchError(true);
        onToast('스크린플레이 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="px-4 sm:px-8 lg:px-16 py-12 pb-32 space-y-10">
      <header className="space-y-4 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold uppercase tracking-widest">
          <MonitorPlay className="w-4 h-4" /> Live Immersive Engine
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
          스크린 플레이 즉시 실행
        </h2>
        <p className="text-base sm:text-lg text-slate-400 font-medium max-w-2xl">
          체육관 모니터 또는 태블릿에 연결하세요. 원하는 인터랙티브 모드를 선택하면 즉시 전체화면으로 수업이 시작됩니다.
        </p>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-10 justify-center">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>스크린플레이 목록 불러오는 중...</span>
        </div>
      )}

      {!loading && fetchError && (
        <div className="py-10 text-center text-slate-500 text-sm">
          목록을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.
        </div>
      )}

      {!loading && !fetchError && screenplays.length === 0 && (
        <div className="py-10 text-center text-slate-500 text-sm">
          등록된 스크린플레이가 없습니다.
        </div>
      )}

      {!loading && screenplays.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {screenplays.map((item) => (
            <ScreenplayCard
              key={item.id}
              item={item}
              onOpenInteractive={onOpenInteractive}
            />
          ))}
        </div>
      )}
    </section>
  );
}
