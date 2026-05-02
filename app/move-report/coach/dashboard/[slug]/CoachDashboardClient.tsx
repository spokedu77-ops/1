'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { trackMoveReportEvent } from '../../../lib/events';
import { P } from '../../../data/profiles';
import { isValidCoachSlugFormat, normalizeCoachSlugInput } from '../../../lib/coachSlug';

/**
 * 보안 TODO (MVP 이후):
 * - 대시보드 URL만으로는 누구나 집계를 볼 수 있음 → 비공개 토큰(access_token) 쿼리·또는 이메일 OTP 후 세션 쿠키 도입 검토.
 * - coach_links.contact 기반 소유자 검증 + rate limit.
 */

type DashboardJson = {
  ok: boolean;
  slug?: string;
  orgName?: string | null;
  total?: number;
  distribution?: Record<string, number>;
  topThree?: { key: string; count: number; profileTitle: string }[];
  hint?: string;
  error?: string;
  inactive?: boolean;
  disabledReason?: string | null;
};

export default function CoachDashboardClient({ slug: rawSlug }: { slug: string }) {
  const slug = normalizeCoachSlugInput(decodeURIComponent(rawSlug));
  const [data, setData] = useState<DashboardJson | null>(null);
  const [loadError, setLoadError] = useState('');
  const dashboardViewTrackedRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!isValidCoachSlugFormat(slug)) {
      setLoadError('링크 주소 형식이 올바르지 않아요.');
      setData({ ok: false });
      return;
    }
    try {
      const res = await fetch(`/api/move-report/coach-dashboard?slug=${encodeURIComponent(slug)}`);
      const json = (await res.json()) as DashboardJson;
      if (!res.ok || !json.ok) {
        if (json.inactive && res.status === 403) {
          setLoadError(
            typeof json.error === 'string'
              ? json.error
              : '비활성화된 링크예요. 기관에 문의하거나 새 링크를 발급받아 주세요.',
          );
        } else {
          setLoadError(typeof json.error === 'string' ? json.error : '불러오기에 실패했어요.');
        }
        setData(json);
        return;
      }
      setData(json);
      setLoadError('');
    } catch {
      setLoadError('네트워크 오류가 났어요.');
      setData({ ok: false });
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.ok) return;
    if (dashboardViewTrackedRef.current === slug) return;
    dashboardViewTrackedRef.current = slug;
    void trackMoveReportEvent({ eventName: 'move_report_coach_dashboard_viewed', meta: { slug } });
  }, [data?.ok, slug]);

  const onCsv = useCallback(() => {
    void trackMoveReportEvent({ eventName: 'move_report_coach_csv_downloaded', meta: { slug } });
    window.location.href = `/api/move-report/coach-dashboard?slug=${encodeURIComponent(slug)}&format=csv`;
  }, [slug]);

  if (!isValidCoachSlugFormat(slug)) {
    return (
      <main className="mr-page">
        <div className="mr-page-inner mr-content-max">
          <p className="mr-coach-lead">대시보드 주소가 올바르지 않아요.</p>
          <Link href="/move-report/coach/new" className="btn-fire" style={{ textDecoration: 'none' }}>
            새 링크 만들기
          </Link>
        </div>
      </main>
    );
  }

  if (loadError && (!data || !data.ok)) {
    return (
      <main className="mr-page">
        <div className="mr-page-inner mr-content-max">
          <p className="mr-educator-form-error">{loadError}</p>
          <Link href="/move-report/coach/new" className="btn-ghost" style={{ textDecoration: 'none', marginTop: 12 }}>
            링크 만들기
          </Link>
        </div>
      </main>
    );
  }

  const total = data?.total ?? 0;
  const distribution = data?.distribution ?? {};
  const topThree = data?.topThree ?? [];
  const hint = data?.hint ?? '';
  const orgName = data?.orgName;

  const orderedKeys = Object.keys(P).sort((a, b) => (distribution[b] ?? 0) - (distribution[a] ?? 0));

  return (
    <main className="mr-page">
      <div className="mr-page-inner mr-content-max mr-coach-dash">
        <div className="mr-coach-dash-head">
          <Link href="/move-report/coach/new" className="btn-ghost mr-coach-back" style={{ textDecoration: 'none' }}>
            ← 새 링크
          </Link>
          <h1 className="mr-coach-title">집계 대시보드</h1>
          {orgName ? <p className="mr-coach-org">{orgName}</p> : null}
          <p className="mr-coach-slug-line">
            링크: <code>/move-report?coach={slug}</code>
          </p>
        </div>

        <section className="mr-coach-stat-card">
          <div className="mr-coach-stat-big">{total}</div>
          <div className="mr-coach-stat-label">총 응답 수 (익명 집계)</div>
        </section>

        <section className="mr-coach-section">
          <h2 className="mr-coach-subtitle">16유형 분포</h2>
          <p className="mr-coach-muted">개별 아동명·개별 리포트는 표시하지 않습니다.</p>
          <ul className="mr-coach-dist">
            {orderedKeys.map((key) => {
              const n = distribution[key] ?? 0;
              const label = P[key]?.char ?? key;
              const max = Math.max(1, ...Object.values(distribution));
              const pct = max ? Math.round((n / max) * 100) : 0;
              return (
                <li key={key} className="mr-coach-dist-row">
                  <span className="mr-coach-dist-key">{key}</span>
                  <span className="mr-coach-dist-name">{label}</span>
                  <span className="mr-coach-dist-bar-wrap">
                    <span className="mr-coach-dist-bar" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="mr-coach-dist-n">{n}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mr-coach-section">
          <h2 className="mr-coach-subtitle">상위 유형</h2>
          <ol className="mr-coach-top3">
            {topThree.length === 0 ? <li className="mr-coach-muted">아직 응답이 없어요.</li> : null}
            {topThree.map((t, i) => (
              <li key={t.key}>
                <span className="mr-coach-rank">{i + 1}</span>
                <span className="mr-coach-top-title">{t.profileTitle}</span>
                <span className="mr-coach-top-code">{t.key}</span>
                <span className="mr-coach-top-n">{t.count}명</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mr-coach-section mr-coach-hint-box">
          <h2 className="mr-coach-subtitle">수업 설계 힌트</h2>
          <p className="mr-coach-hint-text">{hint}</p>
        </section>

        <div className="mr-coach-actions">
          <button type="button" className="btn-ghost" onClick={onCsv}>
            CSV 다운로드
          </button>
          <button type="button" className="btn-ghost" onClick={() => void load()}>
            새로고침
          </button>
        </div>

        <section className="mr-coach-upsell">
          <p className="mr-coach-upsell-text">더 자세한 수업 처방 카드와 학부모 피드백 생성기는 곧 제공됩니다.</p>
          <Link href="/move-report/educator-beta" className="btn-fire" style={{ textDecoration: 'none', textAlign: 'center' }}>
            피드백 생성기 베타 신청하기
          </Link>
        </section>

        <p className="mr-coach-security-note">
          보안: 현재는 링크 주소만으로 대시보드에 접근할 수 있어요. 운영 전에는 접근 토큰 또는 소유자 인증을 붙이는 것을 권장합니다.
        </p>
      </div>
    </main>
  );
}
