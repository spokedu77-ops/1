'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { S } from '../styles';
import { useChallengeBGM } from '@/app/lib/admin/hooks/useChallengeBGM';
import { CHALLENGE_TEMPLATES } from '@/app/program/iiwarmup/challenge/challengeTemplateDefaults';
import {
  CHALLENGE_DISPLAY_BPM_OPTIONS,
  clearSpomoveChallengeEmbed,
  getSpomoveChallengeEmbed,
  resolveChallengeProgramBpm,
  setSpomoveChallengeEmbed,
  snapSourceBpmToDisplayBpm,
} from '@/app/lib/spomove/challengeEmbedStorage';

const LEVELS = [1, 2, 3, 4] as const;

function empty8(): string[] {
  return Array.from({ length: 8 }, () => '');
}

function loadUrlsByLevel(): Record<number, string[]> {
  const s = getSpomoveChallengeEmbed();
  const out: Record<number, string[]> = {};
  for (const lv of LEVELS) {
    const row = s?.imageUrlsByLevel?.[lv];
    out[lv] = Array.isArray(row)
      ? Array.from({ length: 8 }, (_, i) => String(row[i] ?? '').trim())
      : empty8();
  }
  return out;
}

export function ChallengeSpomoveSetupPanel() {
  const { sourceBpm } = useChallengeBGM();
  const [templateId, setTemplateId] = useState('tpl_1');
  const [useManualBpm, setUseManualBpm] = useState(false);
  const [bpm, setBpm] = useState<number>(100);
  const [urlsByLevel, setUrlsByLevel] = useState<Record<number, string[]>>(() => {
    const o: Record<number, string[]> = {};
    for (const lv of LEVELS) o[lv] = empty8();
    return o;
  });

  useEffect(() => {
    setUrlsByLevel(loadUrlsByLevel());
    const s = getSpomoveChallengeEmbed();
    setTemplateId(s?.templateId?.trim() || 'tpl_1');
  }, []);

  useEffect(() => {
    const s = getSpomoveChallengeEmbed();
    const storedBpm = s?.bpm;
    const manual =
      typeof storedBpm === 'number' &&
      CHALLENGE_DISPLAY_BPM_OPTIONS.includes(
        storedBpm as (typeof CHALLENGE_DISPLAY_BPM_OPTIONS)[number]
      );
    setUseManualBpm(manual);
    if (manual) setBpm(storedBpm);
    else setBpm(resolveChallengeProgramBpm(undefined, sourceBpm));
  }, [sourceBpm]);

  const autoBpmHint = useMemo(() => {
    if (typeof sourceBpm === 'number' && sourceBpm > 0) {
      return `${snapSourceBpmToDisplayBpm(sourceBpm)} BPM (원곡 ${sourceBpm}에 가장 가까운 값)`;
    }
    return '관리자 챌린지 페이지에 원곡 BPM을 입력하면 여기서 자동으로 맞춰집니다.';
  }, [sourceBpm]);

  const save = () => {
    const prev = getSpomoveChallengeEmbed() ?? {};
    const { bpm: _drop, ...rest } = prev;
    const imageUrlsByLevel: Partial<Record<number, string[]>> = { ...(rest.imageUrlsByLevel ?? {}) };
    for (const lv of LEVELS) {
      imageUrlsByLevel[lv] = [...(urlsByLevel[lv] ?? empty8())];
    }
    const payload = { ...rest, templateId, imageUrlsByLevel };
    if (useManualBpm) {
      setSpomoveChallengeEmbed({ ...payload, bpm });
    } else {
      setSpomoveChallengeEmbed(payload);
    }
  };

  const clear = () => {
    clearSpomoveChallengeEmbed();
    setTemplateId('tpl_1');
    setUseManualBpm(false);
    setBpm(resolveChallengeProgramBpm(undefined, sourceBpm));
    const o: Record<number, string[]> = {};
    for (const lv of LEVELS) o[lv] = empty8();
    setUrlsByLevel(o);
  };

  const setCell = (lv: number, idx: number, value: string) => {
    setUrlsByLevel((prev) => {
      const row = [...(prev[lv] ?? empty8())];
      row[idx] = value;
      return { ...prev, [lv]: row };
    });
  };

  return (
    <div style={S.sec}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--subtle-bg)',
            color: '#14B8A6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.84rem',
            fontWeight: 900,
            flexShrink: 0,
            border: '2px solid #14B8A6',
          }}
        >
          ★
        </div>
        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>챌린지 (SPOMOVE)</span>
      </div>

      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.85rem', lineHeight: 1.65 }}>
        <strong>그리드·BPM 편집</strong>은{' '}
        <Link href="/admin/iiwarmup/challenge" style={{ color: '#14B8A6', fontWeight: 700 }}>
          관리자 → II Warmup → Challenge
        </Link>
        에서 미리보기로 수정하고 저장합니다(같은 브라우저 IndexedDB). 여기서는 <strong>어떤 포맷을 쓸지</strong>만 고르면 됩니다.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ ...S.slabel, marginBottom: '0.5rem' }}>사용할 포맷(템플릿)</div>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          style={{
            width: '100%',
            padding: '0.65rem 0.75rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--border)',
            fontSize: '0.92rem',
            fontFamily: 'inherit',
            fontWeight: 600,
            background: 'var(--card)',
            color: 'var(--text)',
          }}
        >
          {CHALLENGE_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id} · {t.title}
            </option>
          ))}
        </select>
      </div>

      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.85rem', lineHeight: 1.65 }}>
        <strong>BGM·원곡 BPM</strong>도 위 Challenge 페이지에서 업로드·선택·입력합니다. 아래는 이 기기에서만 덮어쓰는 옵션입니다.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ ...S.slabel, marginBottom: '0.5rem' }}>화면 BPM</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.55rem', fontSize: '0.88rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!useManualBpm}
            onChange={() => {
              if (useManualBpm) {
                setUseManualBpm(false);
                setBpm(resolveChallengeProgramBpm(undefined, sourceBpm));
              } else {
                setUseManualBpm(true);
                setBpm(resolveChallengeProgramBpm(undefined, sourceBpm));
              }
            }}
          />
          노래 원곡 BPM에 맞춤 (직접 BPM을 저장하지 않음)
        </label>
        {!useManualBpm && (
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '0.65rem', lineHeight: 1.55 }}>
            자동 예상: {autoBpmHint}
          </p>
        )}
        {useManualBpm && (
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {CHALLENGE_DISPLAY_BPM_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBpm(n)}
                style={{
                  padding: '0.55rem 0.9rem',
                  borderRadius: '0.75rem',
                  border: `2px solid ${bpm === n ? '#14B8A6' : 'var(--border)'}`,
                  background: bpm === n ? 'rgba(20,184,166,0.12)' : 'var(--card)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: 'var(--text)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <details style={{ marginBottom: '1rem' }}>
        <summary style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)', cursor: 'pointer' }}>
          고급: 이 브라우저에서만 칸 이미지 URL 덮어쓰기 (선택)
        </summary>
        <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.65rem 0 0.75rem', lineHeight: 1.55 }}>
          스튜디오 텍스트/이미지 대신 URL이 있는 칸만 바꿉니다. 비우면 스튜디오·코드 기본값을 씁니다.
        </p>
        {LEVELS.map((lv) => (
          <div key={lv} style={{ marginBottom: '0.85rem' }}>
            <div style={{ ...S.slabel, marginBottom: '0.35rem', fontSize: '0.88rem' }}>
              {lv}번 · 8칸
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {(urlsByLevel[lv] ?? empty8()).map((v, i) => (
                <input
                  key={i}
                  type="url"
                  inputMode="url"
                  placeholder={`${lv}-${i + 1} https://...`}
                  value={v}
                  onChange={(e) => setCell(lv, i, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '0.55rem',
                    border: '1px solid var(--border)',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    background: 'var(--card)',
                    color: 'var(--text)',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </details>

      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={save} style={{ ...S.btn, ...S.bPrimary, padding: '0.65rem 1.1rem', fontSize: '0.92rem' }}>
          설정 저장
        </button>
        <button
          type="button"
          onClick={clear}
          style={{ ...S.btn, ...S.bSecondary, padding: '0.65rem 1.1rem', fontSize: '0.92rem' }}
        >
          초기화
        </button>
      </div>
    </div>
  );
}
