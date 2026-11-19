'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { WORK_STATUS_LABELS, type WorkEvent } from '@/app/lib/admin/updateLog/contract';
import { collectTimeline, compareTimelineEvents, filterTimeline, groupTimelineDays, seoulDay, timelineStats, type StatusFilter, type TimelineWork } from './timeline';
import styles from './update-log.module.css';

type ListResponse = { events?: WorkEvent[]; error?: string; coverage?: { complete: boolean; eventLimit: number } };
const SOURCE_LABELS = { manual: '직접 기록', chatgpt: 'ChatGPT', codex: 'Codex', github: 'GitHub', other: '기타' };
const PAGE_SIZE = 40;
const time = (value: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));

function requestError(status: number, fallback: string) {
  if (status === 401) return '로그인이 필요합니다. 관리자 계정으로 다시 로그인해 주세요.';
  if (status === 403) return '업데이트 로그를 조회할 관리자 권한이 없습니다.';
  return fallback;
}
function sourceLink(value: string) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}

function WorkHistory({ work, complete }: { work: TimelineWork; complete: boolean }) {
  const [remoteHistory, setRemoteHistory] = useState<WorkEvent[] | null>(null);
  const history = complete ? work.history : remoteHistory;
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (complete) return;
    const controller = new AbortController();
    setError('');
    setRemoteHistory(null);
    void (async () => {
      try {
        const params = new URLSearchParams({ project: work.project, workKey: work.latest.workKey });
        const response = await fetch(`/api/admin/update-log?${params}`, { cache: 'no-store', signal: controller.signal });
        const body = await response.json() as ListResponse;
        if (!response.ok) throw new Error(requestError(response.status, body.error || '상세 이력을 불러오지 못했습니다.'));
        if (!Array.isArray(body.events)) throw new Error('상세 이력 응답을 확인하지 못했습니다.');
        setRemoteHistory(body.events.filter(event => event.project === work.project && event.workKey === work.latest.workKey).sort(compareTimelineEvents));
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '상세 이력을 불러오지 못했습니다.');
      }
    })();
    return () => controller.abort();
  }, [work, complete, attempt]);
  return <div className={styles.history}>
    <h3>작업 상세 이력</h3>
    {error ? <div role="alert"><p>{error}</p><button className={styles.textButton} type="button" onClick={() => setAttempt(value => value + 1)}>상세 다시 조회</button></div>
      : !history ? <p role="status">전체 이력을 불러오는 중입니다.</p>
      : <ol>{history.map(event => {
        const href = sourceLink(event.sourceUrl);
        return <li key={event.id}>
          <div className={styles.historyMeta}><span>{WORK_STATUS_LABELS[event.status]}</span><time dateTime={event.occurredAt}>{seoulDay(event.occurredAt)} · {time(event.occurredAt)}</time><span>{SOURCE_LABELS[event.sourceType]}</span></div>
          <p className={styles.historySummary}>{event.summary}</p>
          {event.details && <p className={styles.prose}>{event.details}</p>}
          {event.verificationNote && <div className={styles.evidence}><h4>검증 근거</h4><p className={styles.prose}>{event.verificationNote}</p></div>}
          {href && <a href={href} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>원본 보기<ExternalLink size={13} aria-hidden="true" /></a>}
        </li>;
      })}</ol>}
  </div>;
}

export default function UpdateLogPage() {
  const [data, setData] = useState<{ events: WorkEvent[]; complete: boolean; eventLimit: number } | null>(null);
  const [project, setProject] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/update-log?view=timeline', { cache: 'no-store', signal: controller.signal });
      const body = await response.json() as ListResponse;
      if (!response.ok) throw new Error(requestError(response.status, body.error || '작업 기록을 불러오지 못했습니다.'));
      if (!Array.isArray(body.events)) throw new Error('작업 기록 응답을 확인하지 못했습니다.');
      setData({ events: body.events, complete: body.coverage?.complete === true, eventLimit: body.coverage?.eventLimit ?? 5000 });
    } catch (cause) {
      if (!controller.signal.aborted) { setData(null); setError(cause instanceof Error ? cause.message : '작업 기록을 불러오지 못했습니다.'); }
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return () => request.current?.abort(); }, [load]);
  const works = useMemo(() => collectTimeline(data?.events ?? []), [data]);
  const stats = useMemo(() => timelineStats(works), [works]);
  const projects = useMemo(() => [...new Set(works.map(work => work.project))].sort((a, b) => a.localeCompare(b, 'ko')), [works]);
  const filtered = useMemo(() => filterTimeline(works, project, status, search), [works, project, status, search]);
  const days = useMemo(() => groupTimelineDays(filtered.slice(0, shown)), [filtered, shown]);
  const count = (value: number) => !data || loading ? '—' : `${value.toLocaleString('ko-KR')}${data.complete ? '' : '+'}`;
  const clearFilters = () => { setProject(''); setStatus(''); setSearch(''); setShown(PAGE_SIZE); };

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><Link className={styles.back} href="/admin"><ArrowLeft size={14} aria-hidden="true" />관리 홈</Link><h1>업데이트 로그</h1><p className={styles.subtitle}>AI 작업 및 프로젝트 변경 이력</p></div>
      <button className={styles.refresh} type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} aria-hidden="true" />새로고침</button>
    </header>
    <section aria-label="작업 현황" className={styles.overview}>
      <dl className={styles.metrics}>
        <div><dt>전체 작업</dt><dd>{count(stats.total)}</dd></div>
        <div><dt>진행 중</dt><dd>{count(stats.inProgress)}</dd></div>
        <div><dt>보류·문제</dt><dd>{count(stats.blocked)}</dd></div>
      </dl>
      <p className={styles.metricNote}>작업별 최신 상태 기준</p>
    </section>
    {data && !data.complete && <p role="note" className={styles.coverage}>최신 {data.eventLimit.toLocaleString('ko-KR')}개 이벤트의 조회 범위입니다. 작업 수는 확인된 최소값이며, 프로젝트·상태·검색도 조회 범위에 한정됩니다. 작업을 펼치면 해당 작업의 전체 이력을 조회합니다.</p>}
    <section className={styles.timeline} aria-label="작업 타임라인" aria-busy={loading}>
      <div className={styles.filters}>
        <label>프로젝트<select aria-label="프로젝트" value={project} onChange={event => { setProject(event.target.value); setShown(PAGE_SIZE); }}><option value="">전체 프로젝트</option>{projects.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>상태<select aria-label="상태" value={status} onChange={event => { setStatus(event.target.value as StatusFilter); setShown(PAGE_SIZE); }}><option value="">전체 상태</option><option value="in_progress">진행 중</option><option value="reported">완료 보고</option><option value="verified">검증 완료</option><option value="blocked">보류·문제</option></select></label>
        <label className={styles.search}>검색<span><Search size={16} aria-hidden="true" /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setShown(PAGE_SIZE); }} placeholder="작업 요약 및 관련 내용" /></span></label>
      </div>
      {loading ? <div role="status" className={styles.empty}>작업 기록을 불러오는 중입니다.</div>
        : error ? <div role="alert" className={`${styles.empty} ${styles.error}`}><h2>작업 기록을 불러오지 못했습니다</h2><p>{error}</p><button className={styles.textButton} type="button" onClick={() => void load()}>다시 조회</button></div>
        : filtered.length === 0 ? <div className={styles.empty}><h2>{works.length ? '조건에 맞는 작업이 없습니다' : '아직 기록된 작업이 없습니다'}</h2><p>{works.length ? '프로젝트나 상태를 바꾸거나 다른 검색어로 찾아보세요.' : 'AI가 기록한 작업과 변경 이력이 여기에 표시됩니다.'}</p>{works.length > 0 && <button className={styles.textButton} type="button" onClick={clearFilters}>필터 초기화</button>}</div>
        : <>
          <p className={styles.resultCount}>{data?.complete ? '' : '조회 범위 내 '}작업 {filtered.length.toLocaleString('ko-KR')}건</p>
          {days.map(day => <section className={styles.day} key={day.date} aria-label={day.date}>
            <h2>{day.date}</h2>
            <ul className={styles.workList}>{day.entries.map(work => {
              const expanded = open.has(work.key);
              const detailId = `history-${work.latest.id}`;
              return <li key={work.key} className={styles.work}>
                <button type="button" className={styles.workButton} aria-expanded={expanded} aria-controls={detailId} onClick={() => setOpen(current => { const next = new Set(current); if (next.has(work.key)) next.delete(work.key); else next.add(work.key); return next; })}>
                  <span className={styles.workContent}><span className={styles.workMeta}><span className={styles.project}>{work.project}</span><span className={styles.workStatus} data-state={work.latest.status}>{WORK_STATUS_LABELS[work.latest.status]}</span></span><span className={styles.summary}>{work.latest.summary}</span></span>
                  <ChevronDown size={17} className={expanded ? styles.expandedIcon : styles.expandIcon} aria-hidden="true" />
                </button>
                {expanded && <div id={detailId}><WorkHistory key={work.latest.id} work={work} complete={data?.complete === true} /></div>}
              </li>;
            })}</ul>
          </section>)}
          {shown < filtered.length && <button type="button" className={styles.more} onClick={() => setShown(value => value + PAGE_SIZE)}>작업 더 보기 ({Math.min(shown, filtered.length)} / {filtered.length})</button>}
        </>}
    </section>
  </main>;
}
