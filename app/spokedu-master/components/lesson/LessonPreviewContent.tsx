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
import {
  LessonBulletList,
  LessonFullSection,
  LessonNumberedList,
  LessonPairGrid,
  LessonQuadGrid,
  LessonScriptText,
  LessonTitle,
} from './LessonPanels';

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

  return (
    <div className="space-y-3.5">
      <LessonTitle title={title} badges={badges} />
      <LessonQuadGrid
        cells={[
          { label: '테마', value: getLessonTheme(program) },
          { label: '대상', value: getLessonTarget(program) },
          { label: '기능', value: getLessonFunction(program) },
          { label: '공간', value: getLessonSpace(program) },
        ]}
      />
      <LessonPairGrid
        left={{ label: '준비물', content: <LessonBulletList items={equipment} /> }}
        right={{ label: '수업 스크립트', content: <LessonScriptText text={script} /> }}
      />
      <LessonFullSection title="활동 방법">
        <LessonNumberedList items={rules} />
      </LessonFullSection>
      {footer}
    </div>
  );
}
