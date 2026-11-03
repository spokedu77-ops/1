'use client';

import type { ReactNode } from 'react';
import { useAppSidebar } from '@/app/providers/AppSidebarProvider';
import styles from './TrainingDashboard.module.css';
import { MobileTrainingDashboard } from './MobileTrainingDashboard';

type Tab = 'training' | 'teacher' | 'app';
type Filter = 'ALL' | 'response' | 'attention' | 'executive';

/** Reference HTML port. Execution and settings remain owned by the route. */
export function TrainingDashboard({ tab, filter, onTabChange, onFilterChange, onPick, appContent }: {
  tab: Tab; filter: Filter; onTabChange: (tab: Tab) => void;
  onFilterChange: (filter: Filter) => void; onPick: (modeId: string) => void; appContent: ReactNode;
}) {
  const { toggleMobile, isMobileOpen } = useAppSidebar();
  return (
<>
<div className={styles.root}>

<header className="sticky top-0 z-50 bg-[#080C14]/85 backdrop-blur-xl border-b border-white/5 px-4 py-3 reference-header"><div className="max-w-7xl mx-auto px-6 flex items-center justify-between header-inner">
<div className="flex items-center gap-6">
<div className="flex items-center gap-2.5">
<span className="text-2xl font-black tracking-wider text-white">SPOK<span className="text-cyan-400">EDU</span></span>
<div className="flex items-center gap-1.5 pl-1">
<span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
<span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></span>
<span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
<span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
</div>
</div>
<div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-400">
<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
<span >SPOMOVE COGNITIVE ENGINE v2.4</span>
</div>
</div>
<nav className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-white/10 text-xs font-semibold reference-nav">
<button className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20 flex items-center gap-2 transition-all" aria-current={tab === "training" ? "page" : undefined} type="button" onClick={() => onTabChange("training")}>
<i className="fa-solid fa-bolt text-xs text-amber-400"></i>
<span >1. Training</span>
</button>
<button className="px-5 py-2 rounded-lg text-slate-400 hover:text-slate-200 flex items-center gap-2 transition-all" aria-current={tab === "teacher" ? "page" : undefined} type="button" onClick={() => onTabChange("teacher")}>
<i className="fa-solid fa-chalkboard-user text-xs"></i>
<span >2. Teacher</span>
</button>
<button className="px-5 py-2 rounded-lg text-slate-400 hover:text-slate-200 flex items-center gap-2 transition-all" aria-current={tab === "app" ? "page" : undefined} type="button" onClick={() => onTabChange("app")}>
<i className="fa-solid fa-sliders text-xs"></i>
<span >3. 앱 관리</span>
</button>
</nav>
<div className="flex items-center gap-3">
<button aria-label="Notifications" className="w-9 h-9 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all text-xs" type="button" disabled title="알림 기능 미제공">
<i className="fa-regular fa-bell text-sm"></i>
</button>
<button aria-label="Menu Navigation" className="w-9 h-9 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all text-xs" type="button" onClick={toggleMobile} aria-expanded={isMobileOpen} aria-controls="app-navigation">
<i className="fa-solid fa-bars text-sm"></i>
</button>
</div>
</div></header>




{tab === "training" ? (<><main className="max-w-7xl mx-auto px-6 space-y-10 mt-6 reference-main">


<section className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-b from-slate-900 to-[#0A101D] p-8 lg:p-10 reference-hero">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center hero-grid">
<div className="lg:col-span-6 space-y-5 z-10 hero-copy">
<div className="flex flex-wrap items-center gap-2.5">
<div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-500 text-xs font-black text-white shadow-md">
<span className="font-black">S</span>
<span className="text-[11px] font-bold tracking-wider">SPOMOVE</span>
</div>
<span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold tracking-wide flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          아동·청소년 체육교육
        </span>
<span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-medium flex items-center gap-1.5"><i className="fa-solid fa-eye text-[11px]"></i> 스크린 기반 시각 신호 훈련</span>
</div>
<div className="space-y-2">
<div className="text-xs font-bold text-slate-400 tracking-widest uppercase">SPOMOVE COGNITIVE SYSTEM</div>
<h1 className="text-3xl lg:text-4xl font-black text-white leading-tight">
          움직임이 배움이 되는 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-400 to-cyan-400">인지 피트니스</span>
</h1>
<p className="text-sm text-slate-300 leading-relaxed font-normal pt-2 max-w-xl">
          화면 신호를 보고 판단하여 4색 매트 위에서 순발력 있게 반응하는 스크린 기반 두뇌-신체 협응 트레이닝입니다. 시각 자극에 즉각 반응하며 협응력과 주의집중력을 동시에 발달시킵니다.
        </p>
</div>
<div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 hero-summary">
<div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
<i className="fa-solid fa-layer-group text-cyan-400 text-base"></i>
<span >6개 핵심 훈련 프로그램</span>
<span className="text-xs font-mono text-slate-400">(단계별 인지발달)</span>
</div>
<div className="flex items-center gap-2 font-mono text-xs">
<span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold">RED</span>
<span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold">YLW</span>
<span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold">GRN</span>
<span className="px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold">BLU</span>
</div>
</div>
</div>
<div className="lg:col-span-6 relative hero-field"><div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-gradient-to-br from-slate-900 via-[#0B1526] to-[#050B14] p-6 aspect-video lg:aspect-[16/10] flex flex-col justify-between"><div className="flex items-center justify-between z-10"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span><span className="text-xs font-bold text-slate-200 tracking-wider font-mono">SPOMOVE ACTIVE FIELD</span></div><div className="flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-cyan-300"><i className="fa-solid fa-bolt text-amber-400"></i><span >신체-두뇌 협응 모드</span></div></div><div className="my-auto grid grid-cols-2 gap-4 max-w-sm mx-auto w-full z-10 py-2"><div className="p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500/50 shadow-lg shadow-rose-500/20 flex flex-col items-center justify-center gap-2 group transition-all"><div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center text-white font-black text-sm shadow-md">R</div><span className="text-xs font-bold text-rose-300">RED ZONE</span></div><div className="p-4 rounded-2xl bg-amber-400/15 border-2 border-amber-400/50 shadow-lg shadow-amber-400/20 flex flex-col items-center justify-center gap-2 group transition-all"><div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center text-slate-900 font-black text-sm shadow-md">Y</div><span className="text-xs font-bold text-amber-300">YLW ZONE</span></div><div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center gap-2 group transition-all"><div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-md">G</div><span className="text-xs font-bold text-emerald-300">GRN ZONE</span></div><div className="p-4 rounded-2xl bg-blue-500/15 border-2 border-blue-500/50 shadow-lg shadow-blue-500/20 flex flex-col items-center justify-center gap-2 group transition-all"><div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white font-black text-sm shadow-md">B</div><span className="text-xs font-bold text-blue-300">BLU ZONE</span></div></div><div className="relative z-10 flex items-center justify-between text-xs text-slate-300 bg-[#080C14]/85 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10"><span className="flex items-center gap-2 font-medium text-white"><i className="fa-solid fa-play text-amber-400"></i>보고 · 판단하고 · 움직이는 인지 체육</span><span className="text-[11px] font-mono text-cyan-300 font-semibold">4-COLOR INTERACTION</span></div></div></div>
</div>
</section>



<section className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10 reference-filters">
<div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
<i className="fa-solid fa-filter text-sm"></i>
</div>
<div >
<h2 className="text-sm font-bold text-white">영역별 트레이닝 선택</h2>
<p className="text-xs text-slate-400 font-mono">6개 코스 대기중<span className="filter-detail"> · 인지 난이도별 최적화</span></p>
</div>
</div>
<div className="flex items-center gap-2 flex-wrap"><button className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs border border-white/20 shadow-sm flex items-center gap-2 active:scale-95 transition-all" data-filter="ALL" type="button" onClick={() => onFilterChange("ALL")} aria-pressed={filter === "ALL"}><span >전체</span><span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">6개 코스</span></button><button className="px-4 py-2 rounded-xl bg-slate-900 text-amber-300 font-semibold text-xs border border-amber-500/40 hover:bg-amber-500/20 flex items-center gap-2 transition-all" data-filter="response" type="button" onClick={() => onFilterChange("response")} aria-pressed={filter === "response"}><span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span><span >단순 반응</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-normal">반응 인지 · 시지각 반응</span></button><button className="px-4 py-2 rounded-xl bg-slate-900 text-blue-400 font-semibold text-xs border border-blue-500/40 hover:bg-blue-500/20 flex items-center gap-2 transition-all" data-filter="attention" type="button" onClick={() => onFilterChange("attention")} aria-pressed={filter === "attention"}><span className="w-2 h-2 rounded-full bg-blue-500"></span><span >선택 반응</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-normal">사이먼 · 플랭커</span></button><button className="px-4 py-2 rounded-xl bg-slate-900 text-emerald-400 font-semibold text-xs border border-emerald-500/40 hover:bg-emerald-500/20 flex items-center gap-2 transition-all" data-filter="executive" type="button" onClick={() => onFilterChange("executive")} aria-pressed={filter === "executive"}><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span >복합 반응</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">스트룹 · 순차 기억</span></button></div>
</section>


<div className="space-y-10">

{(filter === "ALL" || filter === "response") && (<section className="space-y-4" data-axis="response">
<div className="flex items-center justify-between border-l-4 border-amber-400 pl-4 py-1">
<div >
<div className="text-xs font-bold text-amber-400 uppercase tracking-widest">단순 반응 · SIMPLE REACTION</div>
<h3 className="text-lg font-bold text-slate-100">보고 바로 움직이는 단순 반응력</h3>
</div>
<span className="text-xs text-slate-400 bg-amber-400/10 px-3 py-1 rounded-lg border border-amber-400/20 font-medium">자극 1:1 즉각 대응 영역</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-5">

<article className="glass-card glass-card-hover rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between border border-amber-500/30" data-program="basic"><div ><div className="flex items-start justify-between gap-4 mb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl shadow-sm"><i className="fa-solid fa-bolt-lightning"></i></div><div ><h4 className="text-lg font-bold text-white flex items-center gap-2">반응 인지<span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-normal">단순 반응</span></h4><p className="text-xs text-slate-400 font-mono">Reactive Cognition</p></div></div><div className="flex items-center gap-2 bg-black/50 px-3.5 py-2 rounded-xl border border-amber-500/30 shadow-md"><span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400"></span><span className="text-xs text-amber-300 font-bold font-mono tracking-wider">신호대응</span></div></div><p className="text-sm text-slate-300 leading-relaxed font-normal mb-6 min-h-[48px]">화면 신호를 보는 순간 판단하고 즉시 반응 구역으로 뛰어드는 기초 순발력 훈련입니다.</p></div><button className="w-full py-3 px-4 rounded-xl bg-amber-500 text-slate-900 hover:bg-amber-400 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-98" type="button" onClick={() => onPick("basic")}><span >훈련 시작</span><i className="fa-solid fa-arrow-right text-xs"></i></button></article>

<article className="glass-card glass-card-hover rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between border border-rose-500/30" data-program="reactTrain"><div ><div className="flex items-start justify-between gap-4 mb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 text-xl shadow-sm"><i className="fa-solid fa-eye"></i></div><div ><h4 className="text-lg font-bold text-white flex items-center gap-2">시지각 반응<span className="text-[11px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-normal">단순 반응</span></h4><p className="text-xs text-slate-400 font-mono">Visual Reaction</p></div></div><div className="grid grid-cols-2 gap-1.5 p-2 bg-black/50 rounded-xl border border-rose-500/30 shadow-md"><span className="w-3.5 h-3.5 rounded bg-rose-500 ring-2 ring-white"></span><span className="w-3.5 h-3.5 rounded bg-amber-400"></span><span className="w-3.5 h-3.5 rounded bg-emerald-400"></span><span className="w-3.5 h-3.5 rounded bg-blue-500"></span></div></div><p className="text-sm text-slate-300 leading-relaxed font-normal mb-6 min-h-[48px]">색 자극이 떨어질 때 해당 색 위치를 신속하게 포착하는 시지각 및 순발력 포커스 훈련입니다.</p></div><button className="w-full py-3 px-4 rounded-xl bg-rose-500 text-white hover:bg-rose-400 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all active:scale-98" type="button" onClick={() => onPick("reactTrain")}><span >훈련 시작</span><i className="fa-solid fa-arrow-right text-xs"></i></button></article>
</div>
</section>)}

{(filter === "ALL" || filter === "attention") && (<section className="space-y-4" data-axis="attention">
<div className="flex items-center justify-between border-l-4 pl-4 py-1 border-blue-500/40"><div ><div className="text-xs font-bold text-blue-400 uppercase tracking-widest">선택 반응 · CHOICE REACTION</div><h3 className="text-lg font-bold text-slate-100">여러 대안 중 목표를 고르는 선택 반응력</h3></div><span className="text-xs text-blue-300 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20 font-medium">방해·경쟁 자극 속에서 올바른 대응을 골라내는 영역</span></div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-5">

<article className="glass-card glass-card-hover rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between border border-blue-500/30" data-program="simon"><div ><div className="flex items-start justify-between gap-4 mb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl shadow-sm"><i className="fa-solid fa-diamond"></i></div><div ><h4 className="text-lg font-bold text-white flex items-center gap-2">사이먼 이펙트<span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-normal">선택 반응</span></h4><p className="text-xs text-slate-400 font-mono">Simon Effect</p></div></div><div className="flex items-center gap-2 bg-black/50 px-3.5 py-2 rounded-xl border border-blue-500/30 shadow-md"><i className="fa-solid fa-arrow-left text-slate-500 text-xs"></i><span className="w-3.5 h-3.5 rounded-full bg-blue-500 ring-2 ring-blue-400/50"></span><i className="fa-solid fa-arrow-right text-blue-400 text-sm font-bold"></i></div></div><p className="text-sm text-slate-300 leading-relaxed font-normal mb-6 min-h-[48px]">원, 삼각형, 사각형 도형의 위치와 무관하게, 채워진 색에 해당하는 올바른 영역으로 신속 이동합니다.</p></div><button className="w-full py-3 px-4 rounded-xl bg-blue-500 text-white hover:bg-blue-400 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-98" type="button" onClick={() => onPick("simon")}><span >훈련 시작</span><i className="fa-solid fa-arrow-right text-xs"></i></button></article>

<article className="glass-card glass-card-hover rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between border border-blue-500/30" data-program="flanker"><div ><div className="flex items-start justify-between gap-4 mb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl shadow-sm"><i className="fa-solid fa-bullseye"></i></div><div ><h4 className="text-lg font-bold text-white flex items-center gap-2">플랭커 이펙트<span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-normal">선택 반응</span></h4><p className="text-xs text-slate-400 font-mono">Flanker Effect</p></div></div><div className="flex items-center gap-1.5 bg-black/50 px-3.5 py-2 rounded-xl border border-blue-500/30 font-mono text-xs shadow-md"><span className="text-slate-500 font-bold">&gt;</span><span className="text-slate-500 font-bold">&gt;</span><span className="text-blue-300 font-black px-1.5 py-0.5 rounded bg-blue-500/30 text-sm">&lt;</span><span className="text-slate-500 font-bold">&gt;</span><span className="text-slate-500 font-bold">&gt;</span></div></div><p className="text-sm text-slate-300 leading-relaxed font-normal mb-6 min-h-[48px]">가로로 나란히 다섯 개의 자극 중 가운데 목표 화살표만 신속하게 식별하여 즉각 반응합니다.</p></div><button className="w-full py-3 px-4 rounded-xl bg-blue-500 text-white hover:bg-blue-400 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-98" type="button" onClick={() => onPick("flanker")}><span >훈련 시작</span><i className="fa-solid fa-arrow-right text-xs"></i></button></article>
</div>
</section>)}

{(filter === "ALL" || filter === "executive") && (<section className="space-y-4" data-axis="executive">
<div className="flex items-center justify-between border-l-4 pl-4 py-1 border-emerald-500/40"><div ><div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">복합 반응 · COMPLEX REACTION</div><h3 className="text-lg font-bold text-slate-100">규칙·기억을 겹쳐 수행하는 복합 반응력</h3></div><span className="text-xs text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 font-medium">억제·규칙 전환·작업기억이 동시에 요구되는 영역</span></div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-5">

<article className="glass-card glass-card-hover rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between border border-emerald-500/30" data-program="stroop"><div ><div className="flex items-start justify-between gap-4 mb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl shadow-sm"><i className="fa-solid fa-brain"></i></div><div ><h4 className="text-lg font-bold text-white flex items-center gap-2">스트룹 이펙트<span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal">복합 반응</span></h4><p className="text-xs text-slate-400 font-mono">Stroop Effect</p></div></div><div className="flex items-center gap-2 bg-black/50 px-3.5 py-2 rounded-xl border border-emerald-500/30 text-xs shadow-md"><span className="text-emerald-400 font-black text-sm">"초록"</span><i className="fa-solid fa-arrow-right text-xs text-slate-400"></i><span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-emerald-400/50"></span></div></div><p className="text-sm text-slate-300 leading-relaxed font-normal mb-6 min-h-[48px]">글자의 의미와 글자 색상이 불일치할 때 간섭을 억제하고 지정된 규칙에 따라 신속 이동합니다.</p></div><button className="w-full py-3 px-4 rounded-xl bg-emerald-500 text-slate-900 hover:bg-emerald-400 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-98" type="button" onClick={() => onPick("stroop")}><span >훈련 시작</span><i className="fa-solid fa-arrow-right text-xs"></i></button></article>

<article className="glass-card glass-card-hover rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between border border-emerald-500/30" data-program="spatial"><div ><div className="flex items-start justify-between gap-4 mb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl shadow-sm"><i className="fa-solid fa-list-ol"></i></div><div ><h4 className="text-lg font-bold text-white flex items-center gap-2">순차 기억<span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal">복합 반응</span></h4><p className="text-xs text-slate-400 font-mono">Sequential Memory</p></div></div><div className="flex items-center gap-2 bg-black/50 px-3.5 py-2 rounded-xl border border-emerald-500/30 font-mono text-xs shadow-md"><span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">1</span><i className="fa-solid fa-chevron-right text-[10px] text-slate-500"></i><span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">2</span><i className="fa-solid fa-chevron-right text-[10px] text-slate-500"></i><span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center font-bold text-xs">3</span></div></div><p className="text-sm text-slate-300 leading-relaxed font-normal mb-6 min-h-[48px]">순차적으로 제시되는 시각 자극 패턴을 작업기억에 저장하고 동일 순서로 정확하게 재현합니다.</p></div><button className="w-full py-3 px-4 rounded-xl bg-emerald-500 text-slate-900 hover:bg-emerald-400 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-98" type="button" onClick={() => onPick("spatial")}><span >훈련 시작</span><i className="fa-solid fa-arrow-right text-xs"></i></button></article>
</div>
</section>)}
</div>



<section className="relative rounded-3xl overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-[#0c1f36] via-[#091528] to-[#040914] p-8 lg:p-10 shadow-glow-cyan/20 shadow-2xl mt-8 reference-dive">
<div className="absolute -right-12 -top-12 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>
<div className="absolute -left-12 -bottom-12 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
<div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
<div className="lg:col-span-8 space-y-4">
<div className="flex items-center gap-3"><span className="px-3 py-1 rounded-full bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 text-xs font-black tracking-wider flex items-center gap-1.5"><i className="fa-solid fa-cube text-[10px]"></i> IMMERSION 3D</span><div className="flex items-center gap-1 pl-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span className="w-2 h-2 rounded-full bg-amber-400"></span><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span className="w-2 h-2 rounded-full bg-blue-500"></span></div><span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">4-COLOR INTERACTIVE SPECIAL</span></div>
<div >
<h3 className="text-2xl font-black text-white flex items-center gap-3">
          3D 몰입 프로그램 '다이브'
          <span className="text-sm font-mono font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">DIVE MODE</span>
</h3>
<p className="text-sm text-slate-300 leading-relaxed font-normal pt-2 max-w-2xl">
          화면 안에서 직접 달리고, 점프하고, 동작을 수행하는 DIVE 트레이닝입니다. 4색 패드 훈련과 별도로 구현된 인터랙티브 게이밍 스포츠 모드입니다.
        </p>
</div>
<div className="grid grid-cols-3 gap-3 pt-2 font-mono max-w-lg">
<div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
<div className="text-[11px] text-slate-400">FPS / ENGINE</div>
<div className="text-sm font-bold text-cyan-300">60 FPS 3D</div>
</div>
<div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center"><div className="text-[11px] text-slate-400 font-mono">ACTIVITY</div><div className="text-sm font-bold text-emerald-300">전신 러닝 &amp; 점프</div></div>
<div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
<div className="text-[11px] text-slate-400">CHALLENGE</div>
<div className="text-sm font-bold text-amber-300">장애물 회피</div>
</div>
</div>
</div>
<div className="lg:col-span-4 flex lg:justify-end">
<button className="w-full lg:w-auto px-8 py-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 active:scale-98 transition-all flex items-center justify-center gap-3" type="button" onClick={() => onPick("flow")}>
<i className="fa-solid fa-play text-sm text-cyan-200"></i>
<span >DIVE 3D 환경 입장 및 세팅하기</span>
<i className="fa-solid fa-chevron-right text-xs text-cyan-200"></i>
</button>
</div>
</div>
</section>

</main></>) : appContent}



</div>
<MobileTrainingDashboard tab={tab} filter={filter} onTabChange={onTabChange} onFilterChange={onFilterChange} onPick={onPick} appContent={appContent} />
</>
  );
}
