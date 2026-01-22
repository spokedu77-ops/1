export type ActionType = 
  | 'POINT' | 'PULL' | 'PUSH' | 'TURN' | 'DUCK' 
  | 'JUMP' | 'CLAP' | 'PUNCH' | 'SHUFFLE' | 'BLOCK'
  | 'SWIPE' | 'TWIST' | 'BALANCE' | 'GRAB' | 'LEAN';

// 시나리오 타입 재export
export * from './types/scenario';

export type Intensity = 'LOW' | 'MID' | 'HIGH';

export interface ActionPoint {
  id: string;
  type: ActionType;
  startTime: number;     // 시작 시간 (초)
  duration: number;      // 지속 시간 (초)
  position?: { x: number; y: number }; // 출현 좌표 (%, 0-100)
  intensity: Intensity;
}

export interface ActionProps {
  action: ActionPoint;
  onComplete: () => void;
  onHit: (correct: boolean) => void;
}

export interface GameState {
  elapsedTime: number;
  isRunning: boolean;
}
