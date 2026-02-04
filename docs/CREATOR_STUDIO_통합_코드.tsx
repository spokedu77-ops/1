/**
 * 크리에이터 스튜디오 통합 코드
 * 모든 컴포넌트를 하나의 파일로 통합
 * 
 * 사용법:
 * 1. 이 파일 전체를 복사
 * 2. app/admin/iiwarmup/generator/page.tsx에 붙여넣기
 * 3. 필요한 외부 의존성 확인 (import 문 참고)
 */

'use client';

// ============================================
// SECTION 1: IMPORTS
// ============================================
import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Play, Brain, Waves } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/app/lib/supabase/client';
import { generateWeekBasedThemeId } from '@/app/lib/admin/assets/storagePaths';
import { validateLayoutSequence, normalizeLayoutSequence, LayoutSequence, LayoutType, PoolType, RuleType, ObjectPlacementType } from '@/app/lib/admin/logic/layoutEngine';
import { fetchActionCatalog } from '@/app/lib/admin/actions/actionCatalog';
import { generatePlayTimeline, type PlayBlock } from '../app/lib/admin/logic/generatePlayTimeline';
import { loadThemeAssets, type ThemeAssets } from '@/app/lib/admin/assets/loadThemeAssets';
import { ASSET_VARIANTS, type ActionKey } from '@/app/lib/admin/constants/physics';
import { listThinkAssetPacks, loadThinkAssetPack, type ThinkAssetPack } from '../app/lib/admin/assets/thinkAssetLoader';
import { AssetReadinessIndicator } from '../app/components/admin/iiwarmup/AssetReadinessIndicator';
import { PlaySimulator } from '@/app/admin/iiwarmup/generator/components/PlaySimulator';
import { ThinkSimulator } from '@/app/admin/iiwarmup/generator/components/ThinkSimulator';
import { FlowSimulator } from '@/app/admin/iiwarmup/generator/components/FlowSimulator';
import type { ThinkSceneRule, ThinkStimulusMode, DraftTemplate } from '@/app/lib/admin/types/iiwarmup';

const supabase = getSupabaseClient();
const STORAGE_KEY = 'iiwarmup_draft_template';

// ============================================
// SECTION 2: TYPE DEFINITIONS
// ============================================
// 타입 정의는 app/lib/admin/types/iiwarmup에서 import하여 사용

// ============================================
// SECTION 3: PLAY STUDIO COMPONENT
// ============================================

interface PlayStudioProps {
  year: number;
  month: number;
  week: number;
  theme: string;
  onUpdate: (play: { timeline: PlayBlock[]; selectedActions: ActionKey[] }) => void;
  draft: { timeline: PlayBlock[]; selectedActions: ActionKey[] };
}

const MAX_SELECTIONS = 5;

function PlayStudio({ year, month, week, theme, onUpdate, draft }: PlayStudioProps) {
  const themeId = generateWeekBasedThemeId(year, month, week, theme);
  
  const [catalog, setCatalog] = useState<Array<{ key: ActionKey; label: string; is_active: boolean; sort_order: number }>>([]);
  const [selected, setSelected] = useState<ActionKey[]>(draft?.selectedActions || []);
  const [timeline, setTimeline] = useState<PlayBlock[]>(draft?.timeline || []);
  const [themeAssets, setThemeAssets] = useState<ThemeAssets | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (themeId) {
      loadAssets();
    }
  }, [themeId]);

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const items = await fetchActionCatalog();
      setCatalog(items);
    } catch (error: any) {
      console.error('Action Catalog 로드 실패:', error);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const loadAssets = async () => {
    setLoadingAssets(true);
    try {
      const assets = await loadThemeAssets(themeId);
      setThemeAssets(assets);
    } catch (error) {
      console.error('Asset 로드 실패:', error);
    } finally {
      setLoadingAssets(false);
    }
  };

  const toggleSelect = (key: ActionKey) => {
    if (selected.includes(key)) {
      setSelected(selected.filter((k) => k !== key));
      setTimeline([]);
    } else if (selected.length < MAX_SELECTIONS) {
      setSelected([...selected, key]);
    } else {
      alert(`최대 ${MAX_SELECTIONS}개까지만 선택할 수 있습니다. 기존 선택을 해제해주세요.`);
    }
  };

  const buildTimeline = () => {
    try {
      const newTimeline = generatePlayTimeline(selected);
      setTimeline(newTimeline);
      
      if (onUpdate) {
        onUpdate({
          timeline: newTimeline,
          selectedActions: selected,
        });
      }
    } catch (error: any) {
      console.error('타임라인 생성 실패:', error);
      alert(error.message || '타임라인 생성에 실패했습니다.');
    }
  };

  useEffect(() => {
    if (selected.length > 0 && timeline.length > 0) {
      onUpdate({
        timeline,
        selectedActions: selected,
      });
    }
  }, [selected, timeline, onUpdate]);

  const assetsActions: Record<string, any> = {};
  if (themeAssets) {
    for (const key of selected) {
      assetsActions[key] = themeAssets.actions[key] || {};
    }
  }

  return (
    <div className="h-full flex min-h-0">
      <div className="w-full md:w-[400px] lg:w-[450px] shrink-0 min-h-0 overflow-y-auto border-r border-slate-700 bg-slate-800 p-6">
        <h2 className="text-xl font-bold text-white mb-6">Play Studio</h2>

        <div className="space-y-6">
          <p className="text-sm text-slate-300">
            월 20개 동작 중 이번 주차에 사용할 <b className="text-white">5개</b>를 선택하면 125초 Play 타임라인이 자동 생성됩니다.
          </p>

          <div className="p-3 bg-slate-700 rounded-lg">
            <div className="text-xs text-slate-400 mb-1">현재 주차</div>
            <div className="text-sm font-semibold text-white">
              {year}년 {month}월 {week}주차 - {theme} 테마
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Asset Pack: {themeId}
            </div>
            {loadingAssets && <span className="text-xs text-slate-400 mt-2 block">로딩 중...</span>}
          </div>

          {selected.length > 0 && (
            <div>
              <AssetReadinessIndicator
                actions={selected}
                variants={ASSET_VARIANTS}
                assetsActions={assetsActions}
              />
              <div className="mt-2 text-xs text-slate-400">
                ※ 준비도는 "선택한 5개"에 대해서만 검사합니다.
              </div>
            </div>
          )}

          <div>
            <b className="block text-sm font-semibold text-slate-300 mb-2">
              이번 주 동작 선택 (최대 {MAX_SELECTIONS}개) - {selected.length}/{MAX_SELECTIONS}
            </b>
            {selected.length > 0 && selected.length < MAX_SELECTIONS && (
              <div className="mb-2 p-2 bg-red-900/50 border border-red-700 rounded text-red-300 text-xs">
                {MAX_SELECTIONS}개를 선택해야 합니다. (현재: {selected.length}개)
              </div>
            )}
            {loadingCatalog ? (
              <div className="text-sm text-slate-400">로딩 중...</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {catalog
                  .filter((a) => a.is_active)
                  .map((a) => {
                    const active = selected.includes(a.key);
                    const disabled = !active && selected.length >= MAX_SELECTIONS;
                    return (
                      <button
                        key={a.key}
                        onClick={() => toggleSelect(a.key)}
                        disabled={disabled}
                        className={`p-3 rounded-lg border transition text-left ${
                          active
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="font-semibold text-sm">{a.label}</div>
                        <div className="text-xs opacity-75 mt-1">{a.key}</div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={buildTimeline}
              disabled={selected.length !== MAX_SELECTIONS || loadingAssets}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              125초 타임라인 생성
            </button>
            <button
              onClick={() => {
                setSelected([]);
                setTimeline([]);
              }}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500 transition"
            >
              초기화
            </button>
          </div>

          {timeline.length > 0 && (
            <div className="text-xs text-slate-400 space-y-1">
              <div>
                <b className="text-slate-300">구성:</b>
              </div>
              <div>5초 시작 → (2.5초 설명 + 10초 + 10초) × 5 → 7.5초 마무리 = 125초</div>
              <div className="mt-2">
                <b className="text-slate-300">타임라인 블록:</b> {timeline.length}개
              </div>
            </div>
          )}

          {timeline.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-400">
                ✅ Draft는 자동으로 저장됩니다 (localStorage)
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-black">
        {timeline.length > 0 ? (
          <PlaySimulator
            timeline={timeline}
            selected={selected}
            themeAssets={themeAssets}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            {selected.length === 0
              ? `20개 동작 중 ${MAX_SELECTIONS}개를 선택하세요.`
              : selected.length < MAX_SELECTIONS
              ? `${MAX_SELECTIONS}개를 선택해야 합니다. (현재: ${selected.length}개)`
              : '125초 타임라인 생성 버튼을 클릭하세요.'}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SECTION 4: THINK STUDIO COMPONENT
// ============================================

interface ThinkStudioProps {
  onUpdate: (think: DraftTemplate['think']) => void;
  draft: DraftTemplate['think'];
}

function ThinkStudio({ onUpdate, draft }: ThinkStudioProps) {
  const [layoutSequence, setLayoutSequence] = useState<LayoutSequence[]>(draft.layout_sequence || []);
  
  const initialPreview = draft.layout_sequence && draft.layout_sequence.length > 0
    ? normalizeLayoutSequence(draft.layout_sequence, 120)
    : [];
  const [previewSequence, setPreviewSequence] = useState<LayoutSequence[]>(initialPreview);
  const [previewKey, setPreviewKey] = useState<number>(0);
  
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const [assetPacks, setAssetPacks] = useState<ThinkAssetPack[]>([]);
  const [selectedAssetPackId, setSelectedAssetPackId] = useState<string>(draft.asset_pack_id || '');
  const [loadedAssetPack, setLoadedAssetPack] = useState<ThinkAssetPack | null>(null);
  
  const [rules, setRules] = useState<ThinkSceneRule[]>(draft.rules || []);
  
  const [totalRounds, setTotalRounds] = useState<number>(10);
  const [roundDuration, setRoundDuration] = useState<number>(10000);
  const [objectSpawnInterval, setObjectSpawnInterval] = useState<number>(2000);
  const [objectLifetime, setObjectLifetime] = useState<number>(5000);
  const [congruentRatio, setCongruentRatio] = useState<number>(0.5);
  const [staticDurationRatio, setStaticDurationRatio] = useState<number>(0.3);
  const [seed, setSeed] = useState<number>(12345);
  
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);
  
  useEffect(() => {
    if (draft.layout_sequence && draft.layout_sequence.length > 0) {
      const draftStr = JSON.stringify(draft.layout_sequence);
      const currentStr = JSON.stringify(layoutSequence);
      if (draftStr !== currentStr) {
        setLayoutSequence(draft.layout_sequence);
        const normalized = normalizeLayoutSequence(draft.layout_sequence, 120);
        setPreviewSequence(normalized);
      }
    }
  }, [draft.layout_sequence]);

  useEffect(() => {
    if (layoutSequence.length === 0 && previewSequence.length === 0) {
      const defaultSequence: LayoutSequence[] = [
        {
          startTime: 0,
          endTime: 40,
          layout_type: '2x2',
          pool: 'actions',
          max_active: 2,
          rule: 'random',
          transition: { duration: 300, easing: 'ease-in-out' },
          objectPlacement: 'preserve'
        },
        {
          startTime: 40,
          endTime: 80,
          layout_type: '3x3',
          pool: 'objects',
          max_active: 3,
          rule: 'sequence',
          transition: { duration: 300, easing: 'ease-in-out' },
          objectPlacement: 'reset'
        },
        {
          startTime: 80,
          endTime: 120,
          layout_type: '2x2',
          pool: 'actions',
          max_active: 2,
          rule: 'random',
          transition: { duration: 300, easing: 'ease-in-out' },
          objectPlacement: 'preserve'
        }
      ];
      setLayoutSequence(defaultSequence);
      const normalized = normalizeLayoutSequence(defaultSequence, 120);
      setPreviewSequence(normalized);
    }
  }, []);

  useEffect(() => {
    listThinkAssetPacks().then(packs => {
      setAssetPacks(packs);
    });
  }, []);

  useEffect(() => {
    if (selectedAssetPackId) {
      loadThinkAssetPack(selectedAssetPackId).then(pack => {
        setLoadedAssetPack(pack);
      });
    } else {
      setLoadedAssetPack(null);
    }
  }, [selectedAssetPackId]);

  useEffect(() => {
    onUpdateRef.current({ 
      layout_sequence: previewSequence,
      asset_pack_id: selectedAssetPackId || undefined,
      rules: rules.length > 0 ? rules : undefined
    });
  }, [previewSequence, selectedAssetPackId, rules]);

  const canAddMore = layoutSequence.length === 0 || 
    (layoutSequence.length > 0 && layoutSequence[layoutSequence.length - 1].endTime < 120);

  const addLayoutSequence = () => {
    if (!canAddMore) {
      return;
    }
    
    const lastEnd = layoutSequence.length > 0 
      ? layoutSequence[layoutSequence.length - 1].endTime 
      : 0;
    
    setLayoutSequence([
      ...layoutSequence,
      {
        startTime: lastEnd,
        endTime: Math.min(lastEnd + 30, 120),
        layout_type: '2x2',
        pool: 'actions',
        max_active: 2,
        rule: 'random',
        transition: { duration: 300, easing: 'ease-in-out' },
        objectPlacement: 'preserve'
      }
    ]);
  };

  const handleApply = () => {
    const normalized = normalizeLayoutSequence(layoutSequence, 120);
    const errors = validateLayoutSequence(normalized, 120);
    
    setValidationErrors(errors);
    setPreviewSequence(normalized);
    setIsPlaying(false);
    setPreviewKey(prev => prev + 1);
  };

  const removeLayoutSequence = (index: number) => {
    const updated = layoutSequence.filter((_, i) => i !== index);
    setLayoutSequence(updated);
  };

  const updateLayoutSequence = (index: number, updates: Partial<LayoutSequence>) => {
    const updated = [...layoutSequence];
    const current = updated[index];
    
    if (updates.endTime !== undefined) {
      const clampedEndTime = Math.min(Math.max(updates.endTime, current.startTime + 1), 120);
      updated[index] = { ...current, ...updates, endTime: clampedEndTime };
      
      if (index < updated.length - 1) {
        const nextSequence = updated[index + 1];
        updated[index + 1] = {
          ...nextSequence,
          startTime: clampedEndTime
        };
        
        if (updated[index + 1].startTime >= updated[index + 1].endTime) {
          updated[index + 1] = {
            ...updated[index + 1],
            endTime: Math.min(updated[index + 1].startTime + 1, 120)
          };
        }
      }
    } else {
      updated[index] = { ...current, ...updates };
    }
    
    setLayoutSequence(updated);
  };

  return (
    <div className="h-full flex min-h-0">
      <div className="w-full md:w-[500px] lg:w-[550px] shrink-0 min-h-0 overflow-y-auto border-r border-slate-700 bg-slate-800 p-6">
        <h2 className="text-xl font-bold text-white mb-6">Think Studio</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Think Asset Pack</h3>
            <select
              value={selectedAssetPackId}
              onChange={(e) => {
                setSelectedAssetPackId(e.target.value);
              }}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600"
            >
              <option value="">Asset Pack 선택 안 함</option>
              {assetPacks.map(pack => (
                <option key={pack.id} value={pack.id}>
                  {pack.name} {pack.theme_ref ? `(${pack.theme_ref})` : ''}
                </option>
              ))}
            </select>
            {selectedAssetPackId && (
              <p className="mt-2 text-xs text-slate-400">
                선택된 Asset Pack: {assetPacks.find(p => p.id === selectedAssetPackId)?.name || selectedAssetPackId}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">기본 설정</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  총 라운드: {totalRounds}
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  라운드 지속 시간: {roundDuration / 1000}초
                </label>
                <input
                  type="range"
                  min="5000"
                  max="30000"
                  step="1000"
                  value={roundDuration}
                  onChange={(e) => setRoundDuration(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  객체 스폰 간격: {objectSpawnInterval}ms
                </label>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="100"
                  value={objectSpawnInterval}
                  onChange={(e) => setObjectSpawnInterval(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  객체 생존 시간: {objectLifetime}ms
                </label>
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="100"
                  value={objectLifetime}
                  onChange={(e) => setObjectLifetime(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Stroop 일치 확률: {(congruentRatio * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={congruentRatio}
                  onChange={(e) => setCongruentRatio(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  정지 상태 비율: {(staticDurationRatio * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={staticDurationRatio}
                  onChange={(e) => setStaticDurationRatio(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Seed: {seed}
                </label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">레이아웃 시퀀스</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 font-semibold"
                >
                  적용
                </button>
                <button
                  onClick={addLayoutSequence}
                  disabled={!canAddMore}
                  className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + 추가
                </button>
              </div>
            </div>
            
            {!canAddMore && (
              <div className="mb-3 p-2 bg-yellow-900/50 border border-yellow-700 rounded text-xs text-yellow-300">
                120초에 도달했습니다. 더 이상 구간을 추가할 수 없습니다.
              </div>
            )}
            
            {validationErrors.length > 0 && (
              <div className="mb-3 p-3 bg-red-900/50 border border-red-700 rounded text-xs text-red-300">
                {validationErrors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}
            
            <div className="mb-2 text-xs text-slate-400">
              ※ 미리보기는 '적용'한 내용으로 재생됩니다.
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {layoutSequence.map((seq, index) => (
                <div key={index} className="p-3 bg-slate-700 rounded border border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">
                      구간 {index + 1}: {seq.startTime}s - {seq.endTime}s
                    </span>
                    <button
                      onClick={() => removeLayoutSequence(index)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      삭제
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 mb-1">시작 시간 (자동)</label>
                        <input
                          type="number"
                          value={seq.startTime}
                          readOnly
                          disabled
                          className="w-full px-2 py-1 bg-slate-500 text-slate-300 rounded cursor-not-allowed"
                        />
                        <div className="text-xs text-slate-500 mt-1">
                          {index === 0 ? '0초부터 시작' : `이전 구간 종료 시간: ${index > 0 ? layoutSequence[index - 1].endTime : 0}초`}
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">종료 시간</label>
                        <input
                          type="number"
                          min={index > 0 ? layoutSequence[index - 1].endTime + 1 : 1}
                          max={120}
                          value={seq.endTime}
                          onChange={(e) => {
                            const newEndTime = Number(e.target.value);
                            updateLayoutSequence(index, { endTime: newEndTime });
                          }}
                          className="w-full px-2 py-1 bg-slate-600 text-white rounded"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-slate-400 mb-1">레이아웃 타입</label>
                      <select
                        value={seq.layout_type}
                        onChange={(e) => updateLayoutSequence(index, { layout_type: e.target.value as LayoutType })}
                        className="w-full px-2 py-1 bg-slate-600 text-white rounded"
                      >
                        {['1x1', '1x2', '1x3', '2x2', '2x3', '3x3', '4x4'].map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-slate-400 mb-1">풀 타입</label>
                      <select
                        value={seq.pool}
                        onChange={(e) => updateLayoutSequence(index, { pool: e.target.value as PoolType })}
                        className="w-full px-2 py-1 bg-slate-600 text-white rounded"
                      >
                        <option value="actions">Actions</option>
                        <option value="objects">Objects</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-slate-400 mb-1">최대 활성 객체: {seq.max_active}</label>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        value={seq.max_active}
                        onChange={(e) => updateLayoutSequence(index, { max_active: Number(e.target.value) as 1 | 2 | 3 | 4 })}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-slate-400 mb-1">배치 규칙</label>
                      <select
                        value={seq.rule}
                        onChange={(e) => updateLayoutSequence(index, { rule: e.target.value as RuleType })}
                        className="w-full px-2 py-1 bg-slate-600 text-white rounded"
                      >
                        <option value="random">Random</option>
                        <option value="sequence">Sequence</option>
                        <option value="memory">Memory</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-slate-400 mb-1">객체 배치</label>
                      <select
                        value={seq.objectPlacement}
                        onChange={(e) => updateLayoutSequence(index, { objectPlacement: e.target.value as ObjectPlacementType })}
                        className="w-full px-2 py-1 bg-slate-600 text-white rounded"
                      >
                        <option value="preserve">Preserve</option>
                        <option value="reset">Reset</option>
                        <option value="random">Random</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Think Scene Rules</h3>
              <button
                type="button"
                onClick={() => {
                  const lastEnd = rules.length > 0 
                    ? rules[rules.length - 1].endTime 
                    : 0;
                  if (lastEnd >= 120) return;
                  
                  setRules([
                    ...rules,
                    {
                      startTime: lastEnd,
                      endTime: Math.min(lastEnd + 30, 120),
                      mode: 'grid_same_color',
                      colorsAllowed: ['red', 'blue', 'yellow', 'green']
                    }
                  ]);
                }}
                disabled={rules.length > 0 && rules[rules.length - 1].endTime >= 120}
                className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Rule 추가
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {rules.map((rule, index) => (
                <div key={index} className="p-3 bg-slate-700 rounded border border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">
                      Rule {index + 1}: {rule.startTime}s - {rule.endTime}s
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRules(rules.filter((_, i) => i !== index));
                      }}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      삭제
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 mb-1">시작 시간</label>
                        <input
                          type="number"
                          min={index > 0 ? rules[index - 1].endTime : 0}
                          max={120}
                          value={rule.startTime}
                          onChange={(e) => {
                            const updated = [...rules];
                            updated[index] = {
                              ...rule,
                              startTime: Number(e.target.value),
                              endTime: Math.max(Number(e.target.value) + 1, rule.endTime)
                            };
                            if (index < updated.length - 1) {
                              updated[index + 1] = {
                                ...updated[index + 1],
                                startTime: updated[index].endTime
                              };
                            }
                            setRules(updated);
                          }}
                          className="w-full px-2 py-1 bg-slate-600 text-white rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">종료 시간</label>
                        <input
                          type="number"
                          min={rule.startTime + 1}
                          max={120}
                          value={rule.endTime}
                          onChange={(e) => {
                            const updated = [...rules];
                            updated[index] = {
                              ...rule,
                              endTime: Number(e.target.value)
                            };
                            if (index < updated.length - 1) {
                              updated[index + 1] = {
                                ...updated[index + 1],
                                startTime: updated[index].endTime
                              };
                            }
                            setRules(updated);
                          }}
                          className="w-full px-2 py-1 bg-slate-600 text-white rounded"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Stimulus 모드</label>
                      <select
                        value={rule.mode}
                        onChange={(e) => {
                          const updated = [...rules];
                          updated[index] = {
                            ...rule,
                            mode: e.target.value as ThinkStimulusMode
                          };
                          setRules(updated);
                        }}
                        className="w-full px-2 py-1 bg-slate-600 text-white rounded"
                      >
                        <option value="grid_same_color">(1) 4분할 1가지 색</option>
                        <option value="full_single_color">(2) 전체화면 1가지 색</option>
                        <option value="split_1to3_colors">(3) 3분할 1~3가지 색</option>
                        <option value="split_all_distinct">(4) 3분할 서로 다른 색</option>
                        <option value="split_memory_pattern">(5) 3분할 메모리 패턴</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">사용 가능한 색상</label>
                      <div className="flex flex-wrap gap-2">
                        {(['red', 'blue', 'yellow', 'green'] as const).map(color => (
                          <label key={color} className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={rule.colorsAllowed.includes(color)}
                              onChange={(e) => {
                                const updated = [...rules];
                                if (e.target.checked) {
                                  updated[index] = {
                                    ...rule,
                                    colorsAllowed: [...rule.colorsAllowed, color]
                                  };
                                } else {
                                  updated[index] = {
                                    ...rule,
                                    colorsAllowed: rule.colorsAllowed.filter(c => c !== color)
                                  };
                                }
                                setRules(updated);
                              }}
                              className="rounded"
                            />
                            <span className="text-slate-300 capitalize">{color}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {rules.length === 0 && (
                <div className="p-3 bg-slate-700/50 rounded border border-slate-600 text-xs text-slate-400 text-center">
                  Rule이 없습니다. "+ Rule 추가" 버튼을 클릭하여 추가하세요.
                </div>
              )}
            </div>
          </div>

          {layoutSequence.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-400">
                ✅ Draft는 자동으로 저장됩니다 (localStorage)
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-black flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(prev => !prev)}
            className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 font-semibold"
          >
            {isPlaying ? '일시정지' : '재생'}
          </button>
          <button
            onClick={() => {
              setPreviewKey(prev => prev + 1);
              setIsPlaying(false);
            }}
            className="px-4 py-2 bg-slate-600 text-white rounded text-sm hover:bg-slate-700 font-semibold"
          >
            리셋
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">속도:</span>
            {([0.5, 1, 2] as const).map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  playbackSpeed === speed
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
          <div className="ml-auto text-sm text-slate-300 font-mono">
            {currentTime.toFixed(1)} / 120s
          </div>
        </div>
        
        <div className="flex-1 relative">
          <ThinkSimulator
            key={previewKey}
            sequence={previewSequence}
            durationSec={120}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onTimeUpdate={(tSec: number) => setCurrentTime(tSec)}
            assetPack={loadedAssetPack || undefined}
            rules={rules.length > 0 ? rules : undefined}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION 5: FLOW STUDIO COMPONENT
// ============================================

interface FlowStudioProps {
  onUpdate: (flow: DraftTemplate['flow']) => void;
  draft: DraftTemplate['flow'];
}

function FlowStudio({ onUpdate, draft }: FlowStudioProps) {
  const [baseSpeed, setBaseSpeed] = useState(draft.baseSpeed || 0.6);
  const [distortion, setDistortion] = useState(draft.distortion || 0.3);
  const [boxRateLv3, setBoxRateLv3] = useState(draft.boxRate?.lv3 || 0.40);
  const [boxRateLv4, setBoxRateLv4] = useState(draft.boxRate?.lv4 || 0.45);
  
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      setBaseSpeed(draft.baseSpeed || 0.6);
      setDistortion(draft.distortion || 0.3);
      setBoxRateLv3(draft.boxRate?.lv3 || 0.40);
      setBoxRateLv4(draft.boxRate?.lv4 || 0.45);
      isInitialMount.current = false;
    }
  }, []);

  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }
    onUpdateRef.current({
      baseSpeed,
      distortion,
      boxRate: {
        lv3: boxRateLv3,
        lv4: boxRateLv4
      }
    });
  }, [baseSpeed, distortion, boxRateLv3, boxRateLv4]);

  return (
    <div className="h-full flex min-h-0">
      <div className="w-full md:w-[400px] lg:w-[450px] shrink-0 min-h-0 overflow-y-auto border-r border-slate-700 bg-slate-800 p-6">
        <h2 className="text-xl font-bold text-white mb-6">Flow Studio</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              우주선 속도: {baseSpeed.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={baseSpeed}
              onChange={(e) => setBaseSpeed(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>느림</span>
              <span>빠름</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              공간 왜곡: {(distortion * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={distortion}
              onChange={(e) => setDistortion(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>없음</span>
              <span>강함</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              LV3 박스 등장률: {(boxRateLv3 * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={boxRateLv3}
              onChange={(e) => setBoxRateLv3(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              LV4 박스 등장률: {(boxRateLv4 * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={boxRateLv4}
              onChange={(e) => setBoxRateLv4(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="p-4 bg-slate-700 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Flow Phase 정보</h3>
            <div className="text-xs text-slate-400 space-y-1">
              <div>• 3D 몰입 환경에서의 전신 반응 훈련</div>
              <div>• 우주선 속도: 이동 속도 조절</div>
              <div>• 공간 왜곡: 카메라 흔들림 효과</div>
              <div>• 박스 등장률: 장애물 생성 빈도</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-400">
              ✅ Draft는 자동으로 저장됩니다 (localStorage)
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-black">
        <FlowSimulator
          baseSpeed={baseSpeed}
          distortion={distortion}
          boxRate={{
            lv3: boxRateLv3,
            lv4: boxRateLv4
          }}
          duration={300}
        />
      </div>
    </div>
  );
}

// ============================================
// SECTION 6: MAIN GENERATOR PAGE COMPONENT
// ============================================

interface GeneratorPageProps {
  year: number;
  month: number;
  week: number;
  theme: string;
}

export default function GeneratorPage({ year, month, week, theme }: GeneratorPageProps) {
  const [activeTab, setActiveTab] = useState<'play' | 'think' | 'flow'>('play');
  const themeId = generateWeekBasedThemeId(year, month, week, theme);
  
  const [draft, setDraft] = useState<DraftTemplate>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.asset_pack_id === themeId) {
            return parsed;
          }
        } catch (e) {
          console.error('Failed to load draft from localStorage', e);
        }
      }
    }
    return {
      asset_pack_id: themeId,
      play: {
        timeline: [],
        selectedActions: []
      },
      think: {
        layout_sequence: []
      },
      flow: {
        baseSpeed: 0.6,
        distortion: 0.3,
        boxRate: {
          lv3: 0.40,
          lv4: 0.45
        }
      }
    };
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (draft.asset_pack_id) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [draft]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleDraftUpdate = useCallback((partial: Partial<DraftTemplate>) => {
    setDraft(prev => ({
      ...prev,
      ...partial,
      asset_pack_id: prev.asset_pack_id || themeId,
    }));
  }, [themeId]);

  const handleSaveTemplate = useCallback(async () => {
    if (!draft.play.timeline.length || draft.play.selectedActions.length !== 5) {
      showToast('Play: 5개 액션을 선택하고 타임라인을 생성해주세요', 'error');
      return;
    }
    
    if (!draft.think.layout_sequence.length) {
      showToast('Think: 최소 1개 이상의 레이아웃 시퀀스를 추가하고 적용해주세요', 'error');
      return;
    }

    const normalizedThink = normalizeLayoutSequence(draft.think.layout_sequence, 120);
    const thinkErrors = validateLayoutSequence(normalizedThink, 120);
    
    if (thinkErrors.length > 0) {
      showToast(`Think: ${thinkErrors[0]}`, 'error');
      return;
    }

    try {
      const templateData = {
        id: `template_${Date.now()}`,
        week_id: null,
        title: `${theme} 테마 템플릿`,
        description: 'Play, Think, Flow 3단계로 구성된 웜업 템플릿',
        total_duration: 540,
        phases: {
          play: {
            scenario_id: null,
            timeline: draft.play.timeline,
            selectedActions: draft.play.selectedActions
          },
          think: {
            scenario_id: null,
            layout_sequence: normalizedThink
          },
          flow: {
            scenario_id: null,
            baseSpeed: draft.flow.baseSpeed,
            distortion: draft.flow.distortion,
            boxRate: draft.flow.boxRate
          }
        },
        scenario_ids: [draft.asset_pack_id],
        version: 1,
        is_active: true
      };

      const { data, error } = await supabase
        .from('warmup_programs_composite')
        .upsert(templateData, { onConflict: 'id' })
        .select('id')
        .single();

      if (error) throw error;

      showToast('템플릿 저장 완료', 'success');
      
      localStorage.removeItem(STORAGE_KEY);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      showToast(`템플릿 저장 실패: ${error?.message || '알 수 없는 오류'}`, 'error');
    }
  }, [draft, theme, showToast]);
  
  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      <header className="shrink-0 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4 px-4 py-2 bg-slate-900/50 border-b border-slate-700">
          <span className="text-sm font-medium text-slate-300">초안 상태:</span>
          <div className="flex items-center gap-2 text-xs">
            {draft.play.timeline.length > 0 && draft.play.selectedActions.length === 5 ? (
              <span className="text-green-400">✅ Play</span>
            ) : (
              <span className="text-yellow-400">⚠️ Play</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            {draft.think.layout_sequence.length > 0 && validateLayoutSequence(draft.think.layout_sequence, 120).length === 0 ? (
              <span className="text-green-400">✅ Think</span>
            ) : (
              <span className="text-yellow-400">⚠️ Think</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            {draft.flow.baseSpeed > 0 ? (
              <span className="text-green-400">✅ Flow</span>
            ) : (
              <span className="text-yellow-400">⚠️ Flow</span>
            )}
          </div>
          
          <button
            onClick={handleSaveTemplate}
            disabled={
              draft.play.timeline.length === 0 || 
              draft.play.selectedActions.length !== 5 || 
              draft.think.layout_sequence.length === 0 ||
              validateLayoutSequence(draft.think.layout_sequence, 120).length > 0
            }
            className="ml-auto px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            템플릿 저장
          </button>
        </div>

        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">Creator Studio</h1>
          </div>
        </div>

        <div className="flex border-b border-slate-700 bg-slate-800">
          <button
            onClick={() => setActiveTab('play')}
            className={`px-6 py-3 font-medium transition-all active:scale-95 ${
              activeTab === 'play'
                ? 'bg-slate-900 text-white border-b-2 border-indigo-500'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            aria-selected={activeTab === 'play'}
          >
            Play Studio
          </button>
          <button
            onClick={() => setActiveTab('think')}
            className={`px-6 py-3 font-medium transition-all active:scale-95 ${
              activeTab === 'think'
                ? 'bg-slate-900 text-white border-b-2 border-indigo-500'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            aria-selected={activeTab === 'think'}
          >
            Think Studio
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`px-6 py-3 font-medium transition-all active:scale-95 ${
              activeTab === 'flow'
                ? 'bg-slate-900 text-white border-b-2 border-indigo-500'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            aria-selected={activeTab === 'flow'}
          >
            Flow Studio
          </button>
        </div>
      </header>

      {toastMessage && (
        <div 
          role="alert"
          aria-live="assertive"
          className={`fixed top-4 right-4 z-[80] max-w-md px-6 py-4 rounded-lg shadow-2xl animate-in slide-in-from-top-5 fade-in duration-300 ${
            toastType === 'success'
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="font-bold">{toastMessage}</span>
            <button 
              onClick={() => setToastMessage(null)}
              className="ml-auto text-white hover:text-white/80 transition-colors cursor-pointer"
              aria-label="닫기"
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'play' && (
          <div className="h-full flex min-h-0">
            <PlayStudio
              year={year}
              month={month}
              week={week}
              theme={theme}
              onUpdate={(partial) => handleDraftUpdate({ play: partial })}
              draft={draft.play}
            />
          </div>
        )}
        {activeTab === 'think' && (
          <div className="h-full flex min-h-0">
            <ThinkStudio
              onUpdate={(partial) => handleDraftUpdate({ think: partial })}
              draft={draft.think}
            />
          </div>
        )}
        {activeTab === 'flow' && (
          <div className="h-full flex min-h-0">
            <FlowStudio
              onUpdate={(partial) => handleDraftUpdate({ flow: partial })}
              draft={draft.flow}
            />
          </div>
        )}
      </main>
    </div>
  );
}
