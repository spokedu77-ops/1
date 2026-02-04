/**
 * Event Timeline 생성
 * 시각적 보상 효과를 정확한 타이밍에 스케줄링
 */

import { GeneratedScenario, EventTimelineItem } from '../types/scenario';

export function generateEventTimeline(scenario: GeneratedScenario): EventTimelineItem[] {
  const timeline: EventTimelineItem[] = [];
  
  // Play Phase 이벤트
  if (scenario.play.actions) {
    scenario.play.actions.forEach((action) => {
      const startTime = action.startTime * 1000; // 초 → ms
      const endTime = startTime + (action.duration * 1000);
      
      // 액션 시작
      timeline.push({
        timestamp: startTime,
        type: 'ACTION_START',
        intensity: action.intensity,
        phase: 'play',
        metadata: { actionId: action.id, actionType: action.type }
      });
      
      // 액션 중간 지점에 파티클 효과
      const midTime = startTime + (action.duration * 500);
      timeline.push({
        timestamp: midTime,
        type: 'PARTICLE',
        intensity: 'MID',
        direction: 'CENTER',
        phase: 'play',
        metadata: { actionId: action.id }
      });
      
      // 액션 종료
      timeline.push({
        timestamp: endTime,
        type: 'ACTION_END',
        intensity: 'LOW',
        phase: 'play',
        metadata: { actionId: action.id }
      });
    });
  }
  
  // Think Phase 이벤트
  if (scenario.think.totalRounds) {
    for (let i = 0; i < scenario.think.totalRounds; i++) {
      const roundStartTime = i * (scenario.think.roundDuration || 18000);
      timeline.push({
        timestamp: roundStartTime,
        type: 'COLOR_FLASH',
        intensity: 'MID',
        phase: 'think',
        metadata: { round: i + 1 }
      });
    }
  }
  
  // Flow Phase 이벤트 (레벨 전환 시)
  // TODO: Flow Phase 레벨 전환 로직 추가 시 구현
  
  // 타임스탬프 기준 정렬
  return timeline.sort((a, b) => a.timestamp - b.timestamp);
}
