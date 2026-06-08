'use client';

import type { ReactNode } from 'react';

import {
  getLessonEquipment,
  getLessonFunction,
  getLessonRules,
  getLessonScript,
  getLessonSpace,
  getLessonTarget,
  getLessonTheme,
  getLessonTitle,
} from '../../lib/lessonDisplay';
import type { Program } from '../../types';
import { LessonPreviewMedia } from './LessonPreviewMedia';
import {
  LessonCoachScript,
  LessonEquipmentChecklist,
  LessonFullSection,
  LessonNumberedList,
  LessonQuadGrid,
  LessonTitle,
} from './LessonPanels';

function PreviewEquipmentCard({ items }: { items: string[] }) {
  return (
    <div className="shrink-0 rounded-[12px] border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-600">준비물</p>
      <div className="mt-2">
        <LessonEquipmentChecklist items={items} compact />
      </div>
    </div>
  );
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

  const metaGrid = (
    <LessonQuadGrid
      compact
      cells={[
        { label: '테마', value: getLessonTheme(program) },
        { label: '대상', value: getLessonTarget(program) },
        { label: '기능', value: getLessonFunction(program) },
        { label: '공간', value: getLessonSpace(program) },
      ]}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <LessonTitle title={title} badges={badges} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.65fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <LessonPreviewMedia program={program} layout="preview" />
          {metaGrid}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <PreviewEquipmentCard items={equipment} />
          <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-indigo-600">수업 스크립트</p>
            <LessonCoachScript text={script} prominent />
          </div>
          <LessonFullSection title="활동 방법">
            <LessonNumberedList items={rules} />
          </LessonFullSection>
          {footer}
        </div>
      </div>
    </div>
  );
}
