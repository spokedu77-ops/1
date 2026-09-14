'use client';

import { useEffect, useState } from 'react';
import type { DisplayDirection } from '@/app/lib/move-report/track/learningLoop';
import type { SpecialPeAsset } from '@/app/lib/move-report/track/assetRecommendation';

type Props = {
  skill: string | null;
  level: number | null;
  direction: DisplayDirection | null;
};

const STAGE_LABEL: Record<SpecialPeAsset['stage'], string> = {
  foundation: '기초',
  generalize: '일반화',
  challenge: '도전',
  transfer: '적용',
};

export default function AssetRecommendations({ skill, level, direction }: Props) {
  const [items, setItems] = useState<SpecialPeAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!skill || level == null || !direction) {
      setItems([]);
      setError('');
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');

    const params = new URLSearchParams({
      skill,
      level: String(level),
      direction,
    });

    void fetch(`/api/move-report/track/assets?${params.toString()}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '추천 활동을 불러오지 못했습니다.');
        setItems(json.data?.recommendations ?? []);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : '추천 활동을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [skill, level, direction]);

  if (!skill || level == null || !direction) return null;

  return (
    <section className="mr-track-section">
      <h2 className="mr-track-section-label">다음 수업 추천 활동</h2>
      <p className="mr-track-hint">현재 기술·수준·다음 방향에 맞는 스포키듀 자산 3개입니다.</p>

      {loading && <p className="mr-track-hint">추천 활동 불러오는 중…</p>}
      {error && <p className="mr-track-error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="mr-track-hint">연결된 추천 활동이 없습니다.</p>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item, index) => (
            <article
              key={item.map_id}
              style={{
                border: '1px solid var(--mr-border, rgba(15, 23, 42, 0.12))',
                borderRadius: 14,
                padding: 14,
                background: 'rgba(255,255,255,0.72)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <strong style={{ fontSize: 15, lineHeight: 1.35 }}>
                  {index + 1}. {item.title}
                </strong>
                <span className="mr-track-hint" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                  {STAGE_LABEL[item.stage]}
                </span>
              </div>

              <p className="mr-track-hint" style={{ marginTop: 6 }}>
                {item.source_label || (item.source_type === 'master' ? 'SPOKEDU MASTER' : '개인 커리큘럼')}
                {' · '}L{item.level_min}–L{item.level_max}
              </p>

              {item.adaptation_note && (
                <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.55 }}>
                  {item.adaptation_note}
                </p>
              )}

              {item.equipment && item.equipment.length > 0 && (
                <p className="mr-track-hint" style={{ marginTop: 7 }}>
                  교구: {item.equipment.join(' · ')}
                </p>
              )}

              {item.variation_method && (
                <details style={{ marginTop: 8 }}>
                  <summary className="mr-track-hint" style={{ cursor: 'pointer' }}>변형 방법 보기</summary>
                  <p style={{ margin: '7px 0 0', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                    {item.variation_method}
                  </p>
                </details>
              )}

              {item.url && /^https?:\/\//i.test(item.url) && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mr-track-nav-btn"
                  style={{ display: 'inline-flex', marginTop: 10, textDecoration: 'none' }}
                >
                  영상 보기 →
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
