import { describe, expect, it } from 'vitest';
import { resolveTrainingCompletionReason } from './trainingResultSummary';
import { resolveTrainingResultRichContent } from './trainingResultRichContent';
import { resolveSpomoveCompletionPresentation } from '@/app/spokedu-master/spomove/session/sessionResultModel';
const cfg={mode:'reactTrain',level:2,timeMode:'time',duration:30,targetReps:20};
describe('shared SPOMOVE terminal truth',()=>{
  it('preserves STOP rather than marking natural completion',()=>{
    expect(resolveTrainingCompletionReason({stoppedEarly:true})).toBe('stopped_early');
  });
  it.each(['natural_complete','stopped_early','cancelled','failed'] as const)('preserves explicit %s and measured counts',completionReason=>{
    expect(resolveTrainingCompletionReason({completionReason,stoppedEarly:true})).toBe(completionReason);
    const rich=resolveTrainingResultRichContent(cfg,12000,{red:2,blue:1,green:3,yellow:1},{completionReason});
    expect(rich.activityFeel).toBe(resolveSpomoveCompletionPresentation(completionReason).statusBadge);
    expect(rich.elapsedLabel).toBe('12초');
    if(completionReason!=='natural_complete')expect(JSON.stringify(rich)).not.toMatch(/완주했|끝까지 해냈|성공했|모두 마쳤/);
  });
});
