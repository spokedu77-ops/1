'use client';

import { MonitorPlay, PlayCircle } from 'lucide-react';
import {
  SCREENPLAY_CATALOG,
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

export default function ScreenplayView({
  onOpenInteractive,
  onToast,
}: {
  onOpenInteractive: (mode: string) => void;
  onToast: (msg: string) => void;
}) {
  return (
    <section className="px-8 lg:px-16 py-12 pb-32 space-y-10">
      <header className="space-y-4 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold uppercase tracking-widest">
          <MonitorPlay className="w-4 h-4" /> Live Immersive Engine
        </div>
        <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">스크린 플레이 즉시 실행</h2>
        <p className="text-lg text-slate-400 font-medium">
          체육관 모니터 또는 태블릿에 연결하세요. 원하는 인터랙티브 모드를 선택하면 즉시 전체화면으로 수업이 시작됩니다.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SCREENPLAY_CATALOG.map((item) => {
          const meta = getMeta(item);
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenInteractive(item.modeId)}
              onKeyDown={(e) => e.key === 'Enter' && onOpenInteractive(item.modeId)}
              className={`media-card bg-gradient-to-br ${meta.gradient} border ${meta.border} p-5 sm:p-8 rounded-3xl relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01]`}
            >
              <div className="absolute right-6 top-6 text-[80px] opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all select-none pointer-events-none">
                {meta.icon}
              </div>

              <div className="relative z-10 space-y-4">
                <span className={`inline-block ${meta.tagColor} text-white px-3 py-1 rounded-lg font-bold text-xs`}>
                  {meta.tag}
                </span>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white">{item.title}</h3>
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
        })}
      </div>
    </section>
  );
}
