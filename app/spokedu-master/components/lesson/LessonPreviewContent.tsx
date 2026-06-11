'use client';

import type { ReactNode } from 'react';

import {
  getLessonEquipment,
  getLessonFieldTips,
  getLessonFunction,
  getLessonRules,
  getLessonSafetyNotes,
  getLessonScript,
  getLessonSpace,
  getLessonTarget,
  getLessonTheme,
  getLessonTitle,
  getLessonVariations,
} from '../../lib/lessonDisplay';
import type { Program } from '../../types';
import { LessonPreviewMedia } from './LessonPreviewMedia';
import {
  LessonBulletList,
  LessonCoachScript,
  LessonEquipmentChecklist,
  LessonFullSection,
  LessonNumberedList,
  LessonTitle,
  LessonVariationText,
} from './LessonPanels';

function PreviewEquipmentCard({ items }: { items: string[] }) {
  const visibleItems = items.slice(0, 6);
  const hiddenCount = Math.max(items.length - visibleItems.length, 0);

  return (
    <div className="shrink-0 rounded-[12px] border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-600">준비물</p>
      <div className="mt-2">
        <LessonEquipmentChecklist items={visibleItems} compact />
        {hiddenCount > 0 ? (
          <p className="mt-2 text-[11px] font-bold text-slate-500">+{hiddenCount}개 더 있음</p>
        ) : null}
      </div>
    </div>
  );
}

function getPreviewScript(script: string) {
  return script.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 1).join('\n');
}

function buildMetaHashTags(program: Program): string[] {
  const theme = getLessonTheme(program);
  const target = getLessonTarget(program);
  const func = getLessonFunction(program);
  const space = getLessonSpace(program);

  const tokens = [
    ...(theme ? [theme] : []),
    ...(target ? target.split(',').map((t) => t.trim()) : []),
    ...(func ? func.split(',').map((f) => f.trim()) : []),
    ...(space ? [space] : []),
  ]
    .map((v) => v.replace(/\s+/g, ''))
    .filter(Boolean);

  const seen = new Set<string>();
  return tokens
    .filter((v) => {
      if (seen.has(v)) return false;
      seen.add(v);
      return true;
    })
    .slice(0, 6);
}

export function LessonPreviewContent({
  program,
  badges,
  footer,
}: {
  program: Program;
  badges?: ReactNode;
  footer?: ReactNode;
}) {
  const title = getLessonTitle(program);
  const equipment = getLessonEquipment(program);
  const script = getLessonScript(program);
  const rules = getLessonRules(program);
  const variations = getLessonVariations(program);
  const safetyNotes = getLessonSafetyNotes(program);
  const fieldTips = getLessonFieldTips(program);
  const previewRules = rules.slice(0, 3);
  const hiddenRuleCount = Math.max(rules.length - previewRules.length, 0);
  const hashTags = buildMetaHashTags(program);
  const parentNote = program.lessonDetail?.parentNote?.trim() ?? '';

  return (
    <div className="flex flex-col gap-4">
      <LessonTitle title={title} badges={badges} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,0.95fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          {hashTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {hashTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          <LessonPreviewMedia program={program} layout="preview" />
        </div>

        <aside className="flex min-w-0 flex-col gap-3">
          {equipment.length > 0 ? <PreviewEquipmentCard items={equipment} /> : null}
          {script ? (
            <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-indigo-600">수업 스크립트</p>
              <LessonCoachScript text={getPreviewScript(script)} prominent />
            </div>
          ) : null}
          {previewRules.length > 0 ? (
            <LessonFullSection title="활동 방법">
              <LessonNumberedList items={previewRules} />
              {hiddenRuleCount > 0 ? (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[12px] font-bold text-slate-500">
                  전체 진행 순서는 수업 자료에서 확인하세요.
                </p>
              ) : null}
            </LessonFullSection>
          ) : null}
        </aside>
      </div>

      {/* 보호자 문구 — 등록된 값이 있을 때만 표시 */}
      {parentNote ? (
        <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">보호자 문구</p>
          <p className="mt-2 text-[13px] font-semibold leading-6 text-emerald-900">{parentNote}</p>
        </div>
      ) : null}

      {/* 안전 / 변형 / 현장 팁 — 값이 있을 때만 표시 */}
      {safetyNotes.length > 0 ? (
        <LessonFullSection title="안전">
          <LessonBulletList items={safetyNotes} compact />
        </LessonFullSection>
      ) : null}
      {variations.length > 0 ? (
        <LessonFullSection title="변형">
          <LessonVariationText text={variations.join('\n')} />
        </LessonFullSection>
      ) : null}
      {fieldTips.length > 0 ? (
        <LessonFullSection title="현장 팁">
          <LessonBulletList items={fieldTips} compact />
        </LessonFullSection>
      ) : null}

      {footer ? (
        <div className="shrink-0">{footer}</div>
      ) : null}
    </div>
  );
}
