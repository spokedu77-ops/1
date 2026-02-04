/**
 * Stroop 간섭 엔진
 * Think Phase의 Stroop 간섭 로직을 독립 모듈로 분리
 */

export interface StroopConfig {
  congruentRatio: number;      // 일치 확률 (0-1)
  totalRounds: number;          // 총 라운드 수
  roundDuration: number;         // 라운드당 시간 (ms)
  objectSpawnInterval: number;  // 객체 스폰 간격 (ms)
  objectLifetime: number;       // 객체 생존 시간 (ms)
  staticDurationRatio: number;  // 정지 상태 비율 (0-1)
  // 0.3 = 30% 정지, 70% 액션 (시니어용)
  // 0.5 = 50% 정지, 50% 액션 (기본)
  // 0.7 = 70% 정지, 30% 액션 (아동용)
}

export interface StroopTrial {
  word: string;                 // 표시되는 단어
  wordColor: string;            // 단어의 색상 (Hex)
  correctColor: string;         // 정답 색상
  isCongruent: boolean;         // 일치 여부
}

export interface StroopResponse {
  trial: StroopTrial;
  selectedColor: string;
  reactionTime: number;         // ms
  correct: boolean;
}

// 4-Color Pad 색상 정의
const PAD_COLORS: Record<string, string> = {
  RED: '#FF0000',
  YELLOW: '#FFFF00',
  GREEN: '#00FF00',
  BLUE: '#0000FF'
};

export class StroopEngine {
  private config: StroopConfig;
  private responses: StroopResponse[] = [];
  private currentRound: number = 0;
  
  constructor(config: StroopConfig) {
    this.config = config;
  }
  
  /**
   * Stroop 시행 생성 (일치/불일치 확률 적용)
   */
  generateTrial(): StroopTrial {
    const colors = ['RED', 'YELLOW', 'GREEN', 'BLUE'];
    const colorWords = ['빨강', '노랑', '초록', '파랑'];
    
    const wordIndex = Math.floor(Math.random() * colorWords.length);
    const colorIndex = Math.floor(Math.random() * colors.length);
    
    const word = colorWords[wordIndex];
    const wordColor = PAD_COLORS[colors[colorIndex]];
    const correctColor = PAD_COLORS[colors[wordIndex]]; // 단어 의미가 정답
    const isCongruent = wordIndex === colorIndex;
    
    // 확률 조정: congruentRatio에 따라 일치/불일치 조절
    const adjustedCongruent = Math.random() < this.config.congruentRatio;
    
    return {
      word,
      wordColor: adjustedCongruent ? correctColor : wordColor,
      correctColor,
      isCongruent: adjustedCongruent && isCongruent
    };
  }
  
  /**
   * 반응 기록
   */
  recordResponse(trial: StroopTrial, selectedColor: string, reactionTime: number) {
    const correct = selectedColor === trial.correctColor;
    
    this.responses.push({
      trial,
      selectedColor,
      reactionTime,
      correct
    });
  }
  
  /**
   * 정지 상태 지속 시간 계산
   */
  getStaticDuration(): number {
    const totalCycle = this.config.objectLifetime;
    return totalCycle * this.config.staticDurationRatio;
  }
  
  /**
   * 액션 상태 지속 시간 계산
   */
  getActionDuration(): number {
    const totalCycle = this.config.objectLifetime;
    return totalCycle * (1 - this.config.staticDurationRatio);
  }
  
  /**
   * 인지 간섭 점수 계산
   * Score_interf = (RT_incongruent - RT_congruent) / RT_congruent × (1 - ErrorRate)
   */
  calculateInterferenceScore(): {
    score: number;
    rtCongruent: number;
    rtIncongruent: number;
    errorRate: number;
    confidence: number;
  } {
    const congruent = this.responses.filter(r => r.trial.isCongruent);
    const incongruent = this.responses.filter(r => !r.trial.isCongruent);
    
    if (congruent.length === 0 || incongruent.length === 0) {
      return { score: 0, rtCongruent: 0, rtIncongruent: 0, errorRate: 0, confidence: 0 };
    }
    
    const avgCongruentRT = congruent.reduce((sum, r) => sum + r.reactionTime, 0) / congruent.length;
    const avgIncongruentRT = incongruent.reduce((sum, r) => sum + r.reactionTime, 0) / incongruent.length;
    const errorRate = this.responses.filter(r => !r.correct).length / this.responses.length;
    
    const baseInterference = (avgIncongruentRT - avgCongruentRT) / avgCongruentRT;
    const score = baseInterference * (1 - errorRate);
    const confidence = Math.min(1, this.responses.length / 10);
    
    return {
      score,
      rtCongruent: avgCongruentRT,
      rtIncongruent: avgIncongruentRT,
      errorRate,
      confidence
    };
  }
  
  /**
   * 엔진 시작
   */
  start(onRoundComplete?: (round: number) => void) {
    this.currentRound = 0;
    this.responses = [];
    // 라운드 실행 로직은 컴포넌트에서 처리
  }
  
  /**
   * 엔진 중지
   */
  stop() {
    // 정리 로직
  }
  
  getConfig(): StroopConfig {
    return this.config;
  }
  
  getResponses(): StroopResponse[] {
    return this.responses;
  }
}
