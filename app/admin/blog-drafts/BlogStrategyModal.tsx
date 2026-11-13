'use client';

import { useEffect, useMemo, useState } from 'react';
import type { JSONContent } from '@tiptap/react';
import { DraftModal } from './BlogDraftEditorParts';
import styles from './BlogStrategyModal.module.css';

/** Stored analysis shape for existing drafts and future auto-analysis wiring. */
export type CompetitiveCompetitor = {
  title?: string;
  url?: string;
  snippet?: string;
};
export type CompetitiveEvidence = {
  keyword?: string;
  notes?: string;
  source_type?: string;
  collected_at?: string;
  verified_naver_ranking?: boolean;
  verified_search_volume?: boolean;
  competitors?: CompetitiveCompetitor[];
};
export type NaverSerpResult = {
  title?: string;
  category?: string;
  position?: number;
  source_url?: string;
  source_name?: string;
};
export type NaverSerpSnapshot = {
  date?: string;
  query?: string;
  limits?: string;
  method?: string;
  source?: string;
  run_url?: string;
  observed_results?: NaverSerpResult[];
};
export type EditorialUpdate = {
  date?: string;
  kind?: string;
};
export type VolumeMetric = string | number | null | undefined;
export type RelatedVolumeKnown = {
  keyword?: string;
  pc?: VolumeMetric;
  mobile?: VolumeMetric;
  total_display?: string;
  total_range?: number[];
};
export type MonthlyKeywordDemand = {
  keyword?: string;
  pc?: VolumeMetric;
  mobile?: VolumeMetric;
  period?: string;
  total_min?: number;
  total_max?: number;
  total_display?: string;
  normalized?: string;
  source_url?: string;
  data_origin?: string;
  observation?: string;
  related_known?: RelatedVolumeKnown[];
  exact_value_masked?: boolean;
  retrieved_date_kst?: string;
  source_verification?: string;
};
export type AdditionalVolumeCandidate = {
  keyword?: string;
  pc?: VolumeMetric;
  mobile?: VolumeMetric;
  period?: string;
  source?: string;
  range_min?: number;
  range_max?: number;
  retrieved_at?: string;
};
export type FinalKeywordSelection = {
  selected_keyword?: string;
  keyword_type?: string;
  decision_reason?: string;
  evidence_note?: string;
  rank_guarantee?: boolean;
  updated_at?: string;
  monthly_data?: {
    keyword?: string;
    pc?: VolumeMetric;
    mobile?: VolumeMetric;
    total?: VolumeMetric;
    source?: string;
    checked_at?: string;
    search_intent_verified?: boolean;
  };
};
export type LegacyPublicationDecision = {
  caveat?: string;
  audit_date?: string;
  access_level?: string;
  original_url?: string;
  source_method?: string;
  editorial_work?: string;
  observed_basis?: string;
  original_post_id?: string;
  overlap_assessment?: string;
  publication_action?: string;
  new_post_publication_approved?: boolean;
};
export type PublicationReadiness = {
  notes?: string;
  status?: string;
  pending?: string;
  new_post?: boolean;
  checked_at?: string;
  photo_stage?: string;
  current_keyword?: string;
  original_post_reuse?: boolean;
  original_live_serp_keyword?: string;
  alternative_keyword_checked?: boolean;
  monthly_search_data_present?: boolean;
  monthly_keyword_volume_verified?: boolean;
  automatic_top_rank_claim_allowed?: boolean;
  live_serp_matches_current_keyword?: boolean;
  copy_content_ready_for_photo_stage?: boolean;
  original_publication_review_needed?: boolean;
  duplicate_publication_review_required?: boolean;
  fresh_serp_for_current_keyword_needed?: boolean;
  new_keyword_competitor_links_required?: boolean;
  live_search_query_matches_current_keyword?: boolean;
};
export type Strategy = {
  version?: string;
  basis?: string;
  theme?: string;
  target_audience: string;
  writing_reason: string;
  primary_keyword: string;
  related_keywords: string[];
  search_intent: string;
  exposure_factors: string[];
  brand_differentiation: string;
  risks: string[];
  improvements: string[];
  verified_search_metrics: boolean;
  verification_note: string;
  competitive_evidence?: CompetitiveEvidence | null;
  naver_serp_snapshot?: NaverSerpSnapshot | null;
  editorial_update?: EditorialUpdate | null;
  monthly_keyword_demand?: MonthlyKeywordDemand | null;
  additional_volume_candidates?: AdditionalVolumeCandidate[] | null;
  final_keyword_selection?: FinalKeywordSelection | null;
  legacy_publication_decision?: LegacyPublicationDecision | null;
  publication_readiness?: PublicationReadiness | null;
  source_revision?: number;
};
type Response = {
  strategy: Strategy | null;
  needsReview: boolean;
  sourceRevision: number | null;
  currentRevision: number;
  updatedAt: string | null;
  error?: string;
};

function textContent(node: JSONContent | undefined): string {
  if (!node) return '';
  return `${node.text ?? ''} ${(node.content ?? []).map(textContent).join(' ')}`.trim();
}
function getHeadings(node: JSONContent): string[] {
  const headings: string[] = [];
  const walk = (n: JSONContent) => {
    if (n.type === 'heading') headings.push(textContent(n));
    (n.content ?? []).forEach(walk);
  };
  walk(node);
  return headings;
}

function safeHttpUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function evidenceTrust(analysis: Strategy) {
  const evidence = analysis.competitive_evidence;
  const naver = analysis.naver_serp_snapshot;
  const hasNaver = Boolean(naver?.observed_results?.length);
  const hasWeb = Boolean(evidence?.competitors?.length);
  return {
    hasNaver,
    hasWeb,
    volumeVerified: Boolean(evidence?.verified_search_volume || analysis.verified_search_metrics || analysis.publication_readiness?.monthly_keyword_volume_verified),
    rankingVerified: Boolean(evidence?.verified_naver_ranking),
  };
}

/** Keep masked "<10" values readable without converting them to 0 or invented counts. */
function formatVolume(value: VolumeMetric): string {
  if (value === null || value === undefined || value === '') return '미확인';
  if (typeof value === 'number' && Number.isFinite(value)) return `${value.toLocaleString('ko-KR')}회`;
  const text = String(value).trim();
  if (/^<\s*10$/i.test(text)) return '10회 미만';
  if (/미만|~|～|-/.test(text) || /[^\d]/.test(text)) return text;
  const numeric = Number(text.replace(/,/g, ''));
  if (Number.isFinite(numeric)) return `${numeric.toLocaleString('ko-KR')}회`;
  return text;
}

function formatTotalDisplay(demand?: MonthlyKeywordDemand | null, fallbackPc?: VolumeMetric, fallbackMobile?: VolumeMetric): string {
  if (demand?.total_display) return demand.total_display;
  if (typeof demand?.total_min === 'number' && typeof demand?.total_max === 'number') {
    if (demand.total_min === demand.total_max) return `${demand.total_min.toLocaleString('ko-KR')}`;
    return `${demand.total_min.toLocaleString('ko-KR')}~${demand.total_max.toLocaleString('ko-KR')}`;
  }
  const pc = formatVolume(fallbackPc);
  const mobile = formatVolume(fallbackMobile);
  if (pc === '미확인' && mobile === '미확인') return '미확인';
  return `PC ${pc} · 모바일 ${mobile}`;
}

function keywordNeedsFreshSerp(analysis: Strategy): boolean {
  const readiness = analysis.publication_readiness;
  if (readiness?.fresh_serp_for_current_keyword_needed) return true;
  if (readiness?.new_keyword_competitor_links_required) return true;
  if (readiness?.live_serp_matches_current_keyword === false) return true;
  if (readiness?.live_search_query_matches_current_keyword === false) return true;
  const current = (readiness?.current_keyword || analysis.primary_keyword || '').trim();
  const evidenceKeyword = (analysis.competitive_evidence?.keyword || '').trim();
  const naverQuery = (analysis.naver_serp_snapshot?.query || '').trim();
  if (evidenceKeyword && current && evidenceKeyword !== current) return true;
  if (naverQuery && current && naverQuery !== current) return true;
  return false;
}

function publicationTrackLabel(analysis: Strategy): { label: string; detail: string } {
  const readiness = analysis.publication_readiness;
  const legacy = analysis.legacy_publication_decision;
  if (readiness?.new_post || readiness?.status === 'copy_finalized_photos_and_serp_pending') {
    return {
      label: '신규 발행 후보',
      detail: readiness?.pending || readiness?.notes || '사진·검색 재검증 후 신규 발행을 검토합니다.',
    };
  }
  if (legacy || readiness?.original_post_reuse || readiness?.status === 'existing_post_revision_candidate') {
    return {
      label: '기존 게시글 업데이트 후보',
      detail: legacy?.publication_action
        ? `권장 조치: ${legacy.publication_action}${legacy.overlap_assessment ? ` · 중복 평가: ${legacy.overlap_assessment}` : ''}`
        : readiness?.pending || readiness?.notes || '기존 발행글 보강·중복 검토가 필요합니다.',
    };
  }
  return { label: '발행 경로 미분류', detail: readiness?.notes || '저장된 발행 준비 상태가 없습니다.' };
}

type VolumeRow = {
  key: string;
  keyword: string;
  role: string;
  pc: string;
  mobile: string;
  total: string;
  note?: string;
};

function buildVolumeRows(analysis: Strategy): VolumeRow[] {
  const rows: VolumeRow[] = [];
  const demand = analysis.monthly_keyword_demand;
  if (demand?.keyword || demand?.pc != null || demand?.mobile != null) {
    rows.push({
      key: `primary-${demand.keyword || analysis.primary_keyword}`,
      keyword: demand.keyword || analysis.primary_keyword,
      role: '주력 검색어',
      pc: formatVolume(demand.pc),
      mobile: formatVolume(demand.mobile),
      total: formatTotalDisplay(demand, demand.pc, demand.mobile),
      note: demand.observation,
    });
  }
  for (const [index, item] of (demand?.related_known ?? []).entries()) {
    if (!item?.keyword) continue;
    rows.push({
      key: `related-${item.keyword}-${index}`,
      keyword: item.keyword,
      role: '연관 검색어',
      pc: formatVolume(item.pc),
      mobile: formatVolume(item.mobile),
      total: item.total_display || formatTotalDisplay(null, item.pc, item.mobile),
    });
  }
  for (const [index, item] of (analysis.additional_volume_candidates ?? []).entries()) {
    if (!item?.keyword) continue;
    const total = typeof item.range_min === 'number' && typeof item.range_max === 'number'
      ? (item.range_min === item.range_max
        ? `${item.range_min.toLocaleString('ko-KR')}`
        : `${item.range_min.toLocaleString('ko-KR')}~${item.range_max.toLocaleString('ko-KR')}`)
      : formatTotalDisplay(null, item.pc, item.mobile);
    rows.push({
      key: `candidate-${item.keyword}-${index}`,
      keyword: item.keyword,
      role: '추가 검증 후보',
      pc: formatVolume(item.pc),
      mobile: formatVolume(item.mobile),
      total,
      note: item.source,
    });
  }
  const selected = analysis.final_keyword_selection?.monthly_data;
  if (selected?.keyword && !rows.some(row => row.keyword === selected.keyword && row.role === '최종 선정 검색어')) {
    rows.push({
      key: `final-${selected.keyword}`,
      keyword: selected.keyword,
      role: '최종 선정 검색어',
      pc: formatVolume(selected.pc),
      mobile: formatVolume(selected.mobile),
      total: selected.total != null ? formatVolume(selected.total) : formatTotalDisplay(null, selected.pc, selected.mobile),
      note: analysis.final_keyword_selection?.evidence_note,
    });
  }
  return rows;
}

export function BlogStrategyModal({ draftId, title, tags, content, featuredImage, dirty = false, onClose }: {
  draftId: string;
  title: string;
  tags: string[];
  content: JSONContent;
  featuredImage: string | null;
  dirty?: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/blog-drafts/${encodeURIComponent(draftId)}/strategy`, {
      signal: controller.signal, cache: 'no-store', credentials: 'same-origin',
    }).then(async response => {
      const value = await response.json() as Response;
      if (!response.ok) throw new Error(value.error || '분석 정보를 불러오지 못했습니다.');
      setData(value);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '분석 조회 오류'); });
    return () => controller.abort();
  }, [draftId]);

  const metrics = useMemo(() => {
    const body = textContent(content);
    const headings = getHeadings(content);
    const images: string[] = [];
    const walk = (node: JSONContent) => {
      if (node.type === 'image') images.push(String(node.attrs?.src ?? ''));
      (node.content ?? []).forEach(walk);
    };
    walk(content);
    return {
      length: body.replace(/\s+/g, '').length,
      headingCount: headings.length,
      imageCount: images.length + (featuredImage ? 1 : 0),
      hasCta: /문의|상담|spokedu\.kr|신청/.test(body),
      headingSamples: headings.slice(0, 3),
    };
  }, [content, featuredImage]);
  const analysis = data?.strategy;
  const evidence = analysis?.competitive_evidence ?? null;
  const naver = analysis?.naver_serp_snapshot ?? null;
  const trust = analysis ? evidenceTrust(analysis) : null;
  const volumeRows = analysis ? buildVolumeRows(analysis) : [];
  const needsFreshSerp = analysis ? keywordNeedsFreshSerp(analysis) : false;
  const publicationTrack = analysis ? publicationTrackLabel(analysis) : null;
  const demand = analysis?.monthly_keyword_demand ?? null;
  const readiness = analysis?.publication_readiness ?? null;
  const legacy = analysis?.legacy_publication_decision ?? null;
  const finalSelection = analysis?.final_keyword_selection ?? null;
  const legacyHref = safeHttpUrl(legacy?.original_url);
  const checks = [
    { label: '제목', result: title.length > 8 && title.length < 110 ? '검토 가능' : '길이·정보량 확인', detail: '주제와 독자 질문이 제목에 직접 드러나는지 확인' },
    { label: '소제목', result: metrics.headingCount > 0 ? `${metrics.headingCount}개 확인` : '소제목 없음', detail: '본문을 탐색할 수 있는 구체적인 내용의 소제목 권장' },
    { label: '본문', result: `${metrics.length.toLocaleString('ko-KR')}자(공백 제외)`, detail: '분량만으로 검색 노출이나 품질을 판단하지 않음' },
    { label: '관련 태그', result: `${tags.length}개`, detail: '태그 반복보다 실제 문맥에 맞는 주제 표현이 중요' },
    { label: '사진', result: metrics.imageCount ? `${metrics.imageCount}장` : '미등록', detail: '해당 회차의 출처·활용 권리가 확인된 사진만 권장' },
    { label: '상담 안내', result: metrics.hasCta ? '문구 확인' : '미확인', detail: '정보 전달을 해치지 않는 자연스러운 연결' },
  ];
  const lines = analysis ? [
    `원고: ${title}`,
    `집필 이유: ${analysis.writing_reason}`,
    `주요 검색어: ${analysis.primary_keyword}`,
    `연관 검색어: ${analysis.related_keywords.join(', ')}`,
    `대상 독자: ${analysis.target_audience}`,
    `검색에 유리한 요소: ${analysis.exposure_factors.join(' / ')}`,
    `차별점: ${analysis.brand_differentiation}`,
    `제약과 위험: ${analysis.risks.join(' / ')}`,
    `보완 방향: ${analysis.improvements.join(' / ')}`,
    `주의: ${analysis.verification_note}`,
    evidence?.competitors?.length ? `웹 색인 경쟁 문서: ${evidence.competitors.map(item => item.title).filter(Boolean).join(' / ')}` : '',
    naver?.observed_results?.length ? `네이버 검색 화면 확인: ${naver.observed_results.map(item => item.title).filter(Boolean).join(' / ')}` : '',
    volumeRows.length ? `월간 검색량: ${volumeRows.map(row => `${row.keyword} PC ${row.pc} / 모바일 ${row.mobile} / 합계 ${row.total}`).join(' | ')}` : '',
    publicationTrack ? `발행 경로: ${publicationTrack.label}` : '',
    needsFreshSerp ? '새 검색어 재검증 필요' : '',
  ].filter(Boolean).join('\n') : '';

  return (
    <DraftModal label="집필 전략·네이버 검색 분석" className={styles.modal} onClose={onClose}>
      <div className={styles.header}>
        <div><p className={styles.eyebrow}>SPOKEDU EDITORIAL</p><h2>집필 전략 · 검색 경쟁 분석</h2></div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="분석 닫기">닫기</button>
      </div>
      <p className={styles.notice}>이 분석은 원고의 집필 전략과 조사된 경쟁 자료를 함께 보여 줍니다. 웹 색인 참고 자료는 네이버 실제 상위 노출 순위가 아니며, 검색량·경쟁 강도·상위 노출 확률을 숫자로 추정하지 않습니다.</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!error && !data && <p role="status" className={styles.loading}>분석 내용을 불러오는 중…</p>}
      {data && <>
        {dirty && <p role="status" className={styles.info}>저장 전 변경사항 있음. 아래 구조 점검은 현재 편집 화면 기준이며, 저장된 분석은 자동으로 바뀌지 않습니다.</p>}
        {data.needsReview && <p role="status" className={styles.warning}>{analysis ? '원고 수정 버전이 분석 버전과 다릅니다. 최신 원고를 기준으로 검색 전략을 다시 검토해야 합니다.' : '이 원고의 검색 전략 분석이 아직 없습니다. 분석이 완료되기 전까지 검색 경쟁 근거로 사용하지 마세요.'}</p>}
        {analysis ? <>
          <div className={styles.sections}>
            <section><h3>01. 이 글을 작성한 이유</h3><p>{analysis.writing_reason}</p><p className={styles.meta}>주요 독자: {analysis.target_audience}</p></section>
            <section><h3>02. 핵심 검색 전략</h3><p><strong>주력 검색어</strong> {analysis.primary_keyword}</p><p><strong>연관 검색어</strong> {analysis.related_keywords.join(' · ')}</p><p><strong>검색 의도</strong> {analysis.search_intent}</p></section>
            <section><h3>03. 노출에 유리할 수 있는 요소</h3><ul>{analysis.exposure_factors.map((v, i) => <li key={i}>{v}</li>)}</ul><p className={styles.meta}>SPOKEDU 차별점: {analysis.brand_differentiation}</p></section>
            <section><h3>04. 약점 · 위험 요인</h3><ul>{analysis.risks.map((v, i) => <li key={i}>{v}</li>)}</ul></section>
            <section><h3>05. 다음 개선 작업</h3><ul>{analysis.improvements.map((v, i) => <li key={i}>{v}</li>)}</ul></section>
          </div>

          <section className={styles.competition} aria-labelledby="competition-heading">
            <div className={styles.competitionHeader}>
              <h3 id="competition-heading">06. 검색 경쟁 분석</h3>
              <div className={styles.badges}>
                {trust?.hasNaver && <span className={styles.badgeNaver}>네이버 검색 화면 확인</span>}
                {trust?.hasWeb && <span className={styles.badgeWeb}>웹 색인 참고</span>}
                {(!trust?.volumeVerified || !trust?.rankingVerified) && <span className={styles.badgeUnverified}>미검증</span>}
              </div>
            </div>
            <p><strong>주력 검색어</strong> {analysis.primary_keyword}</p>
            {analysis.editorial_update?.date && (
              <p className={styles.meta}>원고 개정: {formatDate(analysis.editorial_update.date)}{analysis.editorial_update.kind ? ` · ${analysis.editorial_update.kind}` : ''}</p>
            )}

            {trust?.hasNaver && naver && (
              <div className={styles.evidenceBlock}>
                <div className={styles.evidenceLabel}>
                  <span className={styles.badgeNaver}>네이버 검색 화면 확인</span>
                  <span>{formatDate(naver.date) ?? '조사일 미기록'} · 질의 “{naver.query || analysis.primary_keyword}”</span>
                </div>
                <p className={styles.meta}>{naver.method}</p>
                {naver.limits && <p className={styles.meta}>한계: {naver.limits}</p>}
                <ol className={styles.competitorList}>
                  {(naver.observed_results ?? []).map((item, index) => {
                    const href = safeHttpUrl(item.source_url);
                    return (
                      <li key={`naver-${index}`}>
                        <span className={styles.rank}>관찰 위치 {item.position ?? index + 1}</span>
                        {href ? <a href={href} target="_blank" rel="noopener noreferrer">{item.title || href}</a> : <span>{item.title || '제목 없음'}</span>}
                        {item.source_name && <small>{item.source_name}{item.category ? ` · ${item.category}` : ''}</small>}
                      </li>
                    );
                  })}
                </ol>
                <p className={styles.meta}>이 목록은 조사 시점의 네이버 블로그 검색 화면 관찰이며, 현재 실시간 순위나 검색량 수치가 아닙니다.</p>
              </div>
            )}

            {trust?.hasWeb && evidence && (
              <div className={styles.evidenceBlock}>
                <div className={styles.evidenceLabel}>
                  <span className={styles.badgeWeb}>웹 색인 참고</span>
                  <span>{formatDate(evidence.collected_at) ?? '조사일 미기록'} · 키워드 “{evidence.keyword || analysis.primary_keyword}”</span>
                </div>
                {evidence.notes && <p className={styles.meta}>{evidence.notes}</p>}
                <ul className={styles.competitorList}>
                  {(evidence.competitors ?? []).map((item, index) => {
                    const href = safeHttpUrl(item.url);
                    return (
                      <li key={`web-${index}`}>
                        {href ? <a href={href} target="_blank" rel="noopener noreferrer">{item.title || href}</a> : <span>{item.title || '제목 없음'}</span>}
                        {item.snippet && <small>{item.snippet}</small>}
                      </li>
                    );
                  })}
                </ul>
                <p className={styles.meta}>웹 색인에서 찾은 비교 문서입니다. 네이버 검색 결과의 실제 상위 노출 순위로 표시하지 않습니다.</p>
              </div>
            )}

            {!trust?.hasNaver && !trust?.hasWeb && (
              <p className={styles.meta}>저장된 경쟁 문서가 없습니다. 검색 전략 분석이 필요하지만, 아직 조사 결과가 연결되지 않았습니다.</p>
            )}

            <div className={styles.compareGrid}>
              <div>
                <h4>검색 의도 차이</h4>
                <p>우리 원고의 검색 의도: {analysis.search_intent}</p>
                <p className={styles.meta}>집필 목적: {analysis.writing_reason}</p>
                <p className={styles.meta}>경쟁 문서의 제목·요약은 위 조사 목록에서 직접 비교하세요. 목록 밖의 의도를 추정해 단정하지 않습니다.</p>
              </div>
              <div>
                <h4>차별화되는 정보</h4>
                <p>{analysis.brand_differentiation}</p>
                <ul>{analysis.exposure_factors.map((item, index) => <li key={index}>{item}</li>)}</ul>
              </div>
              <div>
                <h4>추가로 보완할 정보</h4>
                <ul>{analysis.improvements.map((item, index) => <li key={index}>{item}</li>)}</ul>
              </div>
              <div>
                <h4>검증되지 않은 지표</h4>
                <ul>
                  <li>검색량: {trust?.volumeVerified ? '확인됨' : '미검증'}</li>
                  <li>네이버 실제 순위 지속성: {trust?.rankingVerified ? '확인됨' : '미검증'}</li>
                  <li>{analysis.verification_note}</li>
                </ul>
              </div>
            </div>
          </section>

          <section className={styles.competition} aria-labelledby="volume-heading">
            <div className={styles.competitionHeader}>
              <h3 id="volume-heading">07. 월간 검색량</h3>
              <div className={styles.badges}>
                {publicationTrack && <span className={publicationTrack.label.startsWith('신규') ? styles.badgeNaver : styles.badgeWeb}>{publicationTrack.label}</span>}
                {needsFreshSerp && <span className={styles.badgeUnverified}>새 검색어 재검증 필요</span>}
                {!readiness?.monthly_keyword_volume_verified && <span className={styles.badgeUnverified}>검색량·유입 구분 필요</span>}
              </div>
            </div>
            <p className={styles.meta}>아래 수치는 광고 키워드 검색량 조회 결과입니다. 블로그 실제 유입·노출 순위·전환과 같은 지표가 아니며, 10회 미만 값은 0회로 바꾸지 않습니다.</p>
            {needsFreshSerp && (
              <p role="status" className={styles.warning}>주력 검색어가 기존 경쟁 검색 조사 키워드와 다르거나, 저장된 준비 상태가 재조사를 요구합니다. 새 검색어 기준으로 경쟁 문서·검색 화면을 다시 확인해야 합니다.</p>
            )}
            {publicationTrack && (
              <p><strong>{publicationTrack.label}</strong> {publicationTrack.detail}</p>
            )}
            {finalSelection?.selected_keyword && (
              <p className={styles.meta}>최종 선정 검색어: {finalSelection.selected_keyword}{finalSelection.decision_reason ? ` · ${finalSelection.decision_reason}` : ''}</p>
            )}
            {legacy?.original_url && (
              <p className={styles.meta}>
                기존 발행글:{' '}
                {legacyHref
                  ? <a href={legacyHref} target="_blank" rel="noopener noreferrer">{legacy.original_url}</a>
                  : legacy.original_url}
                {legacy.caveat ? ` · ${legacy.caveat}` : ''}
              </p>
            )}
            {volumeRows.length > 0 ? (
              <div className={styles.tableWrap}>
                <table className={styles.volumeTable}>
                  <caption className={styles.meta}>
                    조회일 {formatDate(demand?.retrieved_date_kst) ?? formatDate(readiness?.checked_at) ?? '미기록'}
                    {demand?.period ? ` · 기간 ${demand.period}` : ''}
                    {demand?.data_origin ? ` · 출처 ${demand.data_origin}` : ''}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">검색어</th>
                      <th scope="col">구분</th>
                      <th scope="col">PC</th>
                      <th scope="col">모바일</th>
                      <th scope="col">합계 표시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volumeRows.map(row => (
                      <tr key={row.key}>
                        <th scope="row">{row.keyword}</th>
                        <td>{row.role}</td>
                        <td>{row.pc}</td>
                        <td>{row.mobile}</td>
                        <td>{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.meta}>저장된 월간 검색량 데이터가 없습니다.</p>
            )}
            <div className={styles.compareGrid}>
              <div>
                <h4>검색량 vs 블로그 유입</h4>
                <p>{demand?.observation || '광고 API 검색량은 블로그 유입·노출순위가 아닙니다.'}</p>
                <p className={styles.meta}>{finalSelection?.evidence_note || '검색량만으로 상위 노출이나 문의 전환을 단정하지 않습니다.'}</p>
              </div>
              <div>
                <h4>발행 준비 상태</h4>
                <ul>
                  <li>사진 단계: {readiness?.photo_stage || '미기록'}</li>
                  <li>원고 상태: {readiness?.status || '미기록'}</li>
                  <li>남은 작업: {readiness?.pending || readiness?.notes || '미기록'}</li>
                  {legacy?.editorial_work && <li>기존글 편집 방향: {legacy.editorial_work}</li>}
                </ul>
              </div>
            </div>
          </section>
        </> : (
          <section className={styles.empty} data-status="analysis-needed">
            <h3>검색 전략 분석 필요</h3>
            <p>이 원고에는 저장된 개별 분석이 없습니다. 자동 검색이나 AI 분석이 아직 수행되지 않았으므로 분석 완료로 표시하지 않습니다.</p>
            <p className={styles.meta}>향후 연결 시 필요한 최소 구조: 원고 ID, 원고 버전, 주력 검색어, 조사 날짜, 출처(네이버 검색 화면 확인 / 웹 색인 참고), 경쟁 문서 제목·링크, 의도 차이, 차별점, 보완점, 미검증 지표.</p>
            <p>지금은 아래 구조 점검만 확인할 수 있습니다. 신규 원고의 집필 이유와 경쟁 조사는 별도로 작성해 저장해야 합니다.</p>
          </section>
        )}
        <section className={styles.diagnostics}><h3>현재 편집 내용 점검</h3><div className={styles.grid}>{checks.map(x => <div key={x.label}><strong>{x.label}</strong><span>{x.result}</span><small>{x.detail}</small></div>)}</div></section>
        <div className={styles.footer}><small>{data.updatedAt ? `분석 저장: ${new Date(data.updatedAt).toLocaleString('ko-KR')}` : '저장된 개별 분석 없음'}{data.sourceRevision != null ? ` · 분석 버전 ${data.sourceRevision} / 원고 버전 ${data.currentRevision}` : ''}</small><div className={styles.actions}><button type="button" disabled={!analysis} onClick={() => { void navigator.clipboard.writeText(lines).then(() => setCopied(true)).catch(() => setCopied(false)); }}>{copied ? '복사됨' : '분석 복사'}</button><button type="button" onClick={onClose}>닫기</button></div></div>
      </>}
    </DraftModal>
  );
}
