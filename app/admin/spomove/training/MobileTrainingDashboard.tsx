'use client';

import type { ReactNode } from 'react';
import { useAppSidebar } from '@/app/providers/AppSidebarProvider';
import styles from './MobileTrainingDashboard.module.css';

/** Direct port of the supplied mobile code.html, preserving its SVG icons. */
export function MobileTrainingDashboard({ tab, filter, onTabChange, onFilterChange, onPick, appContent }: {
 tab: 'training' | 'teacher' | 'app'; filter: 'ALL' | 'response' | 'attention' | 'executive';
 onTabChange: (tab: 'training' | 'teacher' | 'app') => void;
 onFilterChange: (filter: 'ALL' | 'response' | 'attention' | 'executive') => void;
 onPick: (modeId: string) => void; appContent: ReactNode;
}) {
 const { toggleMobile, isMobileOpen } = useAppSidebar();
 return (
<div className={styles.root}>

<header className="sticky top-0 z-50 bg-[#080C14]/90 backdrop-blur-md border-b border-white/10 px-4 py-3">
<div className="flex items-center justify-between">

<div className="flex items-center space-x-2">
<div className="flex items-center space-x-1.5">
<span className="text-white font-black tracking-tight text-lg">SPOKEDU</span>

<div className="flex space-x-1 items-center pl-0.5">
<span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span>
<span className="w-1.5 h-1.5 rounded-full bg-brand-yellow"></span>
<span className="w-1.5 h-1.5 rounded-full bg-brand-green"></span>
<span className="w-1.5 h-1.5 rounded-full bg-brand-blue"></span>
</div>
</div>
</div>

<div className="flex items-center space-x-2">

<div className="hidden xs:flex items-center space-x-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
<span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></span>
<span className="text-[10px] text-gray-400 font-mono">v2.4</span>
</div>

<button aria-label="Notifications" className="p-2 text-gray-400 hover:text-white rounded-lg bg-white/5 border border-white/10 active:scale-95 transition-transform" type="button" disabled title="알림 기능 미제공">
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
</svg>
</button>

<button aria-label="Open Menu" className="p-2 text-gray-400 hover:text-white rounded-lg bg-white/5 border border-white/10 active:scale-95 transition-transform" type="button" onClick={toggleMobile} aria-expanded={isMobileOpen} aria-controls="app-navigation">
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path d="M4 6h16M4 12h16m-7 6h7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
</svg>
</button>
</div>
</div>

<nav aria-label="Main Navigation" className="mt-3 flex rounded-xl bg-white/5 p-1 border border-white/5 text-xs font-medium">
<button className="flex-1 flex items-center justify-center py-2 rounded-lg bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 transition-all shadow-sm" type="button" onClick={() => onTabChange("training")} aria-current={tab === "training" ? "page" : undefined}>
<span className="mr-1">⚡</span> 1. Training
      </button>
<button className="flex-1 flex items-center justify-center py-2 rounded-lg text-gray-400 hover:text-gray-200 transition-all" type="button" onClick={() => onTabChange("teacher")} aria-current={tab === "teacher" ? "page" : undefined}>
<span className="mr-1">👥</span> 2. Teacher
      </button>
<button className="flex-1 flex items-center justify-center py-2 rounded-lg text-gray-400 hover:text-gray-200 transition-all" type="button" onClick={() => onTabChange("app")} aria-current={tab === "app" ? "page" : undefined}>
<span className="mr-1">⚙️</span> 3. 앱 관리
      </button>
</nav>
</header>


{tab === "training" ? (<main className="flex-1 px-4 py-4 space-y-6">

<section className="bg-gradient-to-b from-[#111827] to-[#0B0F19] rounded-2xl p-4 border border-white/10 relative overflow-hidden" data-purpose="hero-dashboard">

<div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none"></div>

<div className="flex flex-wrap gap-1.5 items-center mb-3">
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-brand-red/20 text-brand-red border border-brand-red/30">
<span className="w-1 h-1 rounded-full bg-brand-red mr-1.5"></span>SPOMOVE
        </span>
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white/5 text-gray-300 border border-white/10">
          아동·청소년 체육교육
        </span>
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
          스크린 기반 시각 신호 훈련
        </span>
</div>

<div className="space-y-1.5">
<p className="text-[11px] uppercase tracking-wider text-gray-400 font-mono">SPOMOVE COGNITIVE SYSTEM</p>
<h1 className="text-xl font-bold tracking-tight text-white leading-snug">
          움직임이 배움이 되는 <span className="text-brand-yellow font-extrabold">인지 피트니스</span>
</h1>
<p className="text-xs text-gray-400 leading-relaxed pt-1" style={{"wordBreak": "keep-all", "overflowWrap": "break-word", "lineHeight": "1.65"}}>
          화면 신호를 보고 판단하여 4색 매트 위에서 순발력 있게 반응하는 스크린 기반 두뇌-신체 협응 트레이닝입니다. 시각 자극에 즉각 반응하며 협응력과 주의집중력을 동시에 발달시킵니다.
        </p>
</div>

<div className="mt-4 pt-4 border-t border-white/5">
<div className="flex items-center justify-between mb-2">
<div className="flex items-center space-x-1.5">
<span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
<span className="text-[11px] font-semibold text-gray-300 tracking-wide font-mono uppercase">SPOMOVE ACTIVE FIELD</span>
</div>
<span className="text-[10px] text-amber-400 font-medium px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">⚡ 신체·두뇌 협응 모드</span>
</div>

<div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-black/40 border border-white/10" data-purpose="color-field-grid">

<div className="flex flex-col items-center justify-center p-3 rounded-lg bg-red-950/40 border border-brand-red/30 glow-red">
<div className="w-7 h-7 rounded-full bg-brand-red flex items-center justify-center text-white font-black text-xs shadow-md">R</div>
<span className="text-[10px] font-bold text-red-300 mt-1 uppercase tracking-tight">RED ZONE</span>
</div>

<div className="flex flex-col items-center justify-center p-3 rounded-lg bg-yellow-950/40 border border-brand-yellow/30 glow-yellow">
<div className="w-7 h-7 rounded-full bg-brand-yellow flex items-center justify-center text-black font-black text-xs shadow-md">Y</div>
<span className="text-[10px] font-bold text-yellow-300 mt-1 uppercase tracking-tight">YLW ZONE</span>
</div>

<div className="flex flex-col items-center justify-center p-3 rounded-lg bg-green-950/40 border border-brand-green/30 glow-green">
<div className="w-7 h-7 rounded-full bg-brand-green flex items-center justify-center text-white font-black text-xs shadow-md">G</div>
<span className="text-[10px] font-bold text-green-300 mt-1 uppercase tracking-tight">GRN ZONE</span>
</div>

<div className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-950/40 border border-brand-blue/30 glow-blue">
<div className="w-7 h-7 rounded-full bg-brand-blue flex items-center justify-center text-white font-black text-xs shadow-md">B</div>
<span className="text-[10px] font-bold text-blue-300 mt-1 uppercase tracking-tight">BLU ZONE</span>
</div>
</div>
<div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 px-1">
<div className="flex items-center space-x-1">
<svg className="w-3.5 h-3.5 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
<path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" fillRule="evenodd"></path>
</svg>
<span className="">보고 · 판단하고 · 움직이는 인지 체육</span>
</div>
<span className="text-[10px] font-mono text-gray-500">4-COLOR INTERACTION</span>
</div>
</div>

<div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
<div className="flex items-center space-x-1.5 text-xs text-gray-300 font-medium">
<span className="">🧩 6개 핵심 훈련 프로그램</span>
<span className="text-[10px] text-gray-500">(단계별 인지발달)</span>
</div>
<div className="flex space-x-1 text-[9px] font-mono font-bold">
<span className="px-1.5 py-0.5 rounded bg-brand-red/20 text-brand-red border border-brand-red/40">RED</span>
<span className="px-1.5 py-0.5 rounded bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/40">YLW</span>
<span className="px-1.5 py-0.5 rounded bg-brand-green/20 text-brand-green border border-brand-green/40">GRN</span>
<span className="px-1.5 py-0.5 rounded bg-brand-blue/20 text-brand-blue border border-brand-blue/40">BLU</span>
</div>
</div>
</section>


<section className="space-y-2" data-purpose="course-filter-bar"><div className="flex items-center justify-between text-xs px-1">
  <div className="flex items-center space-x-1.5 text-gray-200 font-bold">
    <span className="w-1.5 h-1.5 rounded-full bg-brand-blue"></span>
    <span className="">영역별 트레이닝 선택</span>
  </div>
  <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-2 py-0.5 rounded-full font-medium">6개 코스 대기중</span>
</div>
<div className="grid grid-cols-2 gap-2 w-full pt-1" style={{"wordBreak": "keep-all"}}>

  <button className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/10 text-white border border-white/20 active:scale-[0.98] transition-all shadow-sm" data-filter="ALL" type="button" onClick={() => onFilterChange("ALL")} aria-pressed={filter === "ALL"}>
    <div className="flex items-center space-x-2">
      <span className="w-2 h-2 rounded-full bg-white"></span>
      <span className="text-xs font-bold">전체</span>
    </div>
    <span className="text-[10px] text-gray-300 font-mono bg-black/40 px-1.5 py-0.5 rounded">6개 코스</span>
  </button>

  <button className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/30 active:scale-[0.98] transition-all shadow-sm" data-filter="response" type="button" onClick={() => onFilterChange("response")} aria-pressed={filter === "response"}>
    <div className="flex items-center space-x-2">
      <span className="w-2 h-2 rounded-full bg-brand-yellow"></span>
      <span className="text-xs font-bold">단순 반응</span>
    </div>
    <span className="text-[10px] text-amber-300/80 font-mono bg-black/40 px-1.5 py-0.5 rounded">2개</span>
  </button>

  <button className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-brand-blue/10 text-brand-blue border border-brand-blue/30 active:scale-[0.98] transition-all shadow-sm" data-filter="attention" type="button" onClick={() => onFilterChange("attention")} aria-pressed={filter === "attention"}>
    <div className="flex items-center space-x-2">
      <span className="w-2 h-2 rounded-full bg-brand-blue"></span>
      <span className="text-xs font-bold">선택 반응</span>
    </div>
    <span className="text-[10px] text-blue-300/80 font-mono bg-black/40 px-1.5 py-0.5 rounded">2개</span>
  </button>

  <button className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-brand-green/10 text-brand-green border border-brand-green/30 active:scale-[0.98] transition-all shadow-sm" data-filter="executive" type="button" onClick={() => onFilterChange("executive")} aria-pressed={filter === "executive"}>
    <div className="flex items-center space-x-2">
      <span className="w-2 h-2 rounded-full bg-brand-green"></span>
      <span className="text-xs font-bold">복합 반응</span>
    </div>
    <span className="text-[10px] text-emerald-300/80 font-mono bg-black/40 px-1.5 py-0.5 rounded">2개</span>
  </button>
</div></section>


{(filter === "ALL" || filter === "response") && (<section className="space-y-3" data-purpose="category-simple-reaction" data-axis="response">
<div className="flex items-center justify-between px-1">
<div >
<span className="text-[11px] text-brand-yellow font-bold uppercase tracking-wider block">단순 반응 · SIMPLE REACTION</span>
<h2 className="text-sm font-bold text-white">보고 바로 움직이는 단순 반응력</h2>
</div>
<span className="text-[10px] font-medium text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-brand-yellow/20">자극 1:1 즉각 대응</span>
</div>
<div className="space-y-3">

<article className="bg-[#0F172A] rounded-xl p-4 border border-brand-yellow/30 relative flex flex-col justify-between" data-purpose="card-reactive-cognition" data-program="basic">
<div >
<div className="flex items-start justify-between">
<div className="flex items-center space-x-2.5">
<div className="w-9 h-9 rounded-lg bg-brand-yellow/20 border border-brand-yellow/40 flex items-center justify-center text-brand-yellow">
<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
<path clipRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" fillRule="evenodd"></path>
</svg>
</div>
<div >
<div className="flex items-center space-x-1.5">
<h3 className="text-base font-bold text-white">반응 인지</h3>
<span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-yellow/10 text-brand-yellow font-medium border border-brand-yellow/30">단순 반응</span>
</div>
<p className="text-[10px] text-gray-400 font-mono">Reactive Cognition</p>
</div>
</div>
<div className="flex items-center space-x-1 bg-black/40 px-2 py-1 rounded-md border border-white/5">
<span className="w-2 h-2 rounded-full bg-brand-yellow"></span>
<span className="text-[10px] text-gray-300 font-medium">신호대응</span>
</div>
</div>
<p className="text-xs text-gray-300 leading-relaxed mt-2.5" style={{"wordBreak": "keep-all", "overflowWrap": "break-word", "lineHeight": "1.6"}}>
              화면 신호를 보는 순간 판단하고 즉시 반응 구역으로 뛰어드는 기초 순발력 훈련입니다.
            </p>
</div>

<button className="mt-4 w-full h-12 flex items-center justify-center space-x-2 rounded-lg bg-brand-yellow text-black font-bold text-sm shadow-md active:bg-yellow-400 transition-colors" type="button" onClick={() => onPick("basic")}>
<span className="">훈련 시작</span>
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path></svg>
</button>
</article>

<article className="bg-[#0F172A] rounded-xl p-4 border border-brand-red/30 relative flex flex-col justify-between" data-purpose="card-visual-reaction" data-program="reactTrain">
<div >
<div className="flex items-start justify-between">
<div className="flex items-center space-x-2.5">
<div className="w-9 h-9 rounded-lg bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red">
<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
<path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
</svg>
</div>
<div >
<div className="flex items-center space-x-1.5">
<h3 className="text-base font-bold text-white">시지각 반응</h3>
<span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-red/10 text-brand-red font-medium border border-brand-red/30">단순 반응</span>
</div>
<p className="text-[10px] text-gray-400 font-mono">Visual Reaction</p>
</div>
</div>
<div className="flex items-center space-x-0.5 bg-black/40 p-1.5 rounded-md border border-white/5">
<div className="grid grid-cols-2 gap-0.5">
<span className="w-1.5 h-1.5 rounded-sm bg-brand-red"></span>
<span className="w-1.5 h-1.5 rounded-sm bg-brand-yellow"></span>
<span className="w-1.5 h-1.5 rounded-sm bg-brand-green"></span>
<span className="w-1.5 h-1.5 rounded-sm bg-brand-blue"></span>
</div>
</div>
</div>
<p className="text-xs text-gray-300 leading-relaxed mt-2.5" style={{"wordBreak": "keep-all", "overflowWrap": "break-word", "lineHeight": "1.6"}}>
              색 자극이 떨어질 때 해당 색 위치를 신속하게 포착하는 시지각 및 순발력 포커스 훈련입니다.
            </p>
</div>

<button className="mt-4 w-full h-12 flex items-center justify-center space-x-2 rounded-lg bg-brand-red text-white font-bold text-sm shadow-md active:bg-red-600 transition-colors" type="button" onClick={() => onPick("reactTrain")}>
<span className="">훈련 시작</span>
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path></svg>
</button>
</article>
</div>
</section>)}


{(filter === "ALL" || filter === "attention") && (<section className="space-y-3" data-purpose="category-choice-reaction" data-axis="attention">
<div className="flex items-center justify-between px-1">
<div >
<span className="text-[11px] text-brand-blue font-bold uppercase tracking-wider block">선택 반응 · CHOICE REACTION</span>
<h2 className="text-sm font-bold text-white">여러 대안 중 목표를 고르는 선택 반응력</h2>
</div>
<span className="text-[10px] font-medium text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-brand-blue/20">방해·경쟁 자극 속 올바른 대응</span>
</div>
<div className="space-y-3">

<article className="bg-[#0F172A] rounded-xl p-4 border border-brand-blue/30 relative flex flex-col justify-between" data-purpose="card-simon-effect" data-program="simon">
<div >
<div className="flex items-start justify-between">
<div className="flex items-center space-x-2.5">
<div className="w-9 h-9 rounded-lg bg-brand-blue/20 border border-brand-blue/40 flex items-center justify-center text-brand-blue">

<div className="w-3.5 h-3.5 rotate-45 bg-brand-blue rounded-xs"></div>
</div>
<div >
<div className="flex items-center space-x-1.5">
<h3 className="text-base font-bold text-white">사이먼 이펙트</h3>
<span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-blue/10 text-brand-blue font-medium border border-brand-blue/30">선택 반응</span>
</div>
<p className="text-[10px] text-gray-400 font-mono">Simon Effect</p>
</div>
</div>

<div className="flex items-center space-x-1 bg-black/40 px-2 py-1 rounded-md border border-white/5 font-mono text-[10px] text-brand-blue">
<span className="">←</span>
<span className="w-1.5 h-1.5 rounded-full bg-brand-blue inline-block"></span>
<span className="">→</span>
</div>
</div>
<p className="text-xs text-gray-300 leading-relaxed mt-2.5" style={{"wordBreak": "keep-all", "overflowWrap": "break-word", "lineHeight": "1.6"}}>
              원, 삼각형, 사각형 도형의 위치와 무관하게, 채워진 색에 해당하는 올바른 영역으로 신속 이동합니다.
            </p>
</div>

<button className="mt-4 w-full h-12 flex items-center justify-center space-x-2 rounded-lg bg-brand-blue text-white font-bold text-sm shadow-md active:bg-blue-600 transition-colors" type="button" onClick={() => onPick("simon")}>
<span className="">훈련 시작</span>
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path></svg>
</button>
</article>

<article className="bg-[#0F172A] rounded-xl p-4 border border-brand-blue/30 relative flex flex-col justify-between" data-purpose="card-flanker-effect" data-program="flanker">
<div >
<div className="flex items-start justify-between">
<div className="flex items-center space-x-2.5">
<div className="w-9 h-9 rounded-lg bg-brand-blue/20 border border-brand-blue/40 flex items-center justify-center text-brand-blue">

<div className="w-4 h-4 rounded-full border-2 border-brand-blue flex items-center justify-center">
<div className="w-1.5 h-1.5 rounded-full bg-brand-blue"></div>
</div>
</div>
<div >
<div className="flex items-center space-x-1.5">
<h3 className="text-base font-bold text-white">플랭커 이펙트</h3>
<span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-blue/10 text-brand-blue font-medium border border-brand-blue/30">선택 반응</span>
</div>
<p className="text-[10px] text-gray-400 font-mono">Flanker Effect</p>
</div>
</div>

<div className="flex items-center space-x-1 bg-black/40 px-2 py-1 rounded-md border border-white/5 font-mono text-[10px] text-gray-300">
<span className="">&gt; &gt;</span>
<span className="text-brand-blue font-bold">&lt;</span>
<span className="">&gt; &gt;</span>
</div>
</div>
<p className="text-xs text-gray-300 leading-relaxed mt-2.5" style={{"wordBreak": "keep-all", "overflowWrap": "break-word", "lineHeight": "1.6"}}>
              가로로 나란히 다섯 개의 자극 중 가운데 목표 화살표만 신속하게 식별하여 즉각 반응합니다.
            </p>
</div>

<button className="mt-4 w-full h-12 flex items-center justify-center space-x-2 rounded-lg bg-brand-blue text-white font-bold text-sm shadow-md active:bg-blue-600 transition-colors" type="button" onClick={() => onPick("flanker")}>
<span className="">훈련 시작</span>
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path></svg>
</button>
</article>
</div>
</section>)}


{(filter === "ALL" || filter === "executive") && (<section className="space-y-3" data-purpose="category-complex-reaction" data-axis="executive">
<div className="flex items-center justify-between px-1">
<div >
<span className="text-[11px] text-brand-green font-bold uppercase tracking-wider block">복합 반응 · COMPLEX REACTION</span>
<h2 className="text-sm font-bold text-white">규칙 · 기억을 겹쳐 수행하는 복합 반응력</h2>
</div>
<span className="text-[10px] font-medium text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-brand-green/20">억제·규칙 전환·작업기억</span>
</div>
<div className="space-y-3">

<article className="bg-[#0F172A] rounded-xl p-4 border border-brand-green/30 relative flex flex-col justify-between" data-purpose="card-stroop-effect" data-program="stroop">
<div >
<div className="flex items-start justify-between">
<div className="flex items-center space-x-2.5">
<div className="w-9 h-9 rounded-lg bg-brand-green/20 border border-brand-green/40 flex items-center justify-center text-brand-green">

<div className="w-4 h-4 rounded-full border-2 border-brand-green flex overflow-hidden">
<div className="w-2 h-full bg-brand-green"></div>
</div>
</div>
<div >
<div className="flex items-center space-x-1.5">
<h3 className="text-base font-bold text-white">스트룹 이펙트</h3>
<span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-green/10 text-brand-green font-medium border border-brand-green/30">복합 반응</span>
</div>
<p className="text-[10px] text-gray-400 font-mono">Stroop Effect</p>
</div>
</div>

<div className="flex items-center space-x-1 bg-black/40 px-2 py-1 rounded-md border border-white/5 font-mono text-[10px] text-brand-green">
<span className="text-white font-medium">"초록"</span>
<span className="">→</span>
<span className="w-2 h-2 rounded-full bg-brand-green"></span>
</div>
</div>
<p className="text-xs text-gray-300 leading-relaxed mt-2.5" style={{"wordBreak": "keep-all", "overflowWrap": "break-word", "lineHeight": "1.6"}}>
              글자의 의미와 글자 색상이 불일치할 때 간섭을 억제하고 지정된 규칙에 따라 신속 이동합니다.
            </p>
</div>

<button className="mt-4 w-full h-12 flex items-center justify-center space-x-2 rounded-lg bg-brand-green text-black font-bold text-sm shadow-md active:bg-green-600 transition-colors" type="button" onClick={() => onPick("stroop")}>
<span className="">훈련 시작</span>
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path></svg>
</button>
</article>

<article className="bg-[#0F172A] rounded-xl p-4 border border-brand-green/30 relative flex flex-col justify-between" data-purpose="card-sequential-memory" data-program="spatial">
<div >
<div className="flex items-start justify-between">
<div className="flex items-center space-x-2.5">
<div className="w-9 h-9 rounded-lg bg-brand-green/20 border border-brand-green/40 flex items-center justify-center text-brand-green">

<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path d="M4 6h16M4 10h16M4 14h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
</svg>
</div>
<div >
<div className="flex items-center space-x-1.5">
<h3 className="text-base font-bold text-white">순차 기억</h3>
<span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-green/10 text-brand-green font-medium border border-brand-green/30">복합 반응</span>
</div>
<p className="text-[10px] text-gray-400 font-mono">Sequential Memory</p>
</div>
</div>

<div className="flex items-center space-x-1 bg-black/40 px-2 py-1 rounded-md border border-white/5 font-mono text-[10px] text-brand-green">
<span className="w-3.5 h-3.5 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center text-[9px]">1</span>
<span className="">&gt;</span>
<span className="w-3.5 h-3.5 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center text-[9px]">2</span>
<span className="">&gt;</span>
<span className="w-3.5 h-3.5 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center text-[9px]">3</span>
</div>
</div>
<p className="text-xs text-gray-300 leading-relaxed mt-2.5" style={{"wordBreak": "keep-all", "overflowWrap": "break-word", "lineHeight": "1.6"}}>
              순차적으로 제시되는 시각 자극 패턴을 작업기억에 저장하고 동일 순서로 정확하게 재현합니다.
            </p>
</div>

<button className="mt-4 w-full h-12 flex items-center justify-center space-x-2 rounded-lg bg-brand-green text-black font-bold text-sm shadow-md active:bg-green-600 transition-colors" type="button" onClick={() => onPick("spatial")}>
<span className="">훈련 시작</span>
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path></svg>
</button>
</article>
</div>
</section>)}


<section className="rounded-2xl p-4 bg-gradient-to-br from-[#0c213f] via-[#09152b] to-[#080c14] border border-cyan-500/40 relative overflow-hidden" data-purpose="dive-3d-banner">

<div className="absolute -right-8 -bottom-8 w-44 h-44 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

<div className="flex items-center space-x-1.5 mb-2">
<span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
          🎮 IMMERSION 3D
        </span>
<div className="flex space-x-1 items-center px-1">
<span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span>
<span className="w-1.5 h-1.5 rounded-full bg-brand-yellow"></span>
<span className="w-1.5 h-1.5 rounded-full bg-brand-green"></span>
<span className="w-1.5 h-1.5 rounded-full bg-brand-blue"></span>
</div>
<span className="text-[10px] text-gray-400 font-mono">4-COLOR SPECIAL</span>
</div>

<div className="space-y-1">
<div className="flex items-center space-x-2">
<h2 className="text-lg font-black text-white tracking-tight">3D 몰입 프로그램 '다이브'</h2>
<span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-200 border border-cyan-400/40 font-mono">DIVE MODE</span>
</div>
<p className="text-xs text-gray-300 leading-relaxed" style={{"wordBreak": "keep-all", "overflowWrap": "break-word", "lineHeight": "1.65"}}>
          화면 안에서 직접 달리고, 점프하고, 동작을 수행하는 DIVE 트레이닝입니다. 4색 패드 훈련과 별도로 구현된 인터랙티브 게이밍 스포츠 모드입니다.
        </p>
</div>

<div className="grid grid-cols-3 gap-2 mt-4" style={{"wordBreak": "keep-all", "overflowWrap": "break-word"}}>
<div className="bg-black/40 p-2 rounded-lg border border-white/5 text-center">
<p className="text-[9px] text-gray-400 uppercase font-mono">FPS / ENGINE</p>
<p className="text-xs font-bold text-cyan-300 mt-0.5">60 FPS 3D</p>
</div>
<div className="bg-black/40 p-2 rounded-lg border border-white/5 text-center">
<p className="text-[9px] text-gray-400 uppercase font-mono">ACTIVITY</p>
<p className="text-xs font-bold text-green-300 mt-0.5">전신 러닝&amp;점프</p>
</div>
<div className="bg-black/40 p-2 rounded-lg border border-white/5 text-center">
<p className="text-[9px] text-gray-400 uppercase font-mono">CHALLENGE</p>
<p className="text-xs font-bold text-yellow-300 mt-0.5">장애물 회피</p>
</div>
</div>

<button className="mt-4 w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98] transition-transform text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-cyan-900/30" type="button" onClick={() => onPick("flow")}>
<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
<path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" fillRule="evenodd"></path>
</svg>
<span className="">DIVE 3D 환경 입장 및 세팅하기</span>
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path></svg>
</button>
</section>

</main>) : appContent}


{tab === "training" && (<footer className="mt-auto px-4 py-6 border-t border-white/5 text-center space-y-2 bg-[#05080E]" data-purpose="app-footer">
<div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
<span className="font-bold text-gray-300 tracking-tight">SPOKEDU SPOMOVE</span>
<span className="text-gray-600">|</span>
<span className="">인지 피트니스 솔루션</span>
</div>
<p className="text-[10px] text-gray-600">
      4-Color Physical Mat Screen-Interactive Training Engine<br  />
      © SPOKEDU Corp. All Rights Reserved.
    </p>
</footer>)}





</div>
 );
}
