/**
 * Think Engine
 * Think Phase의 3-Panel Multi-Stimulus 로직을 TypeScript 클래스로 변환
 */

import { StroopEngine, StroopConfig } from '../logic/stroopLogic';

export interface ThinkConfig {
  roundDuration: number;         // 라운드당 시간 (ms)
  totalRounds: number;            // 총 라운드 수
  objectSpawnInterval: number;   // 객체 스폰 간격 (ms)
  objectLifetime: number;        // 객체 생존 시간 (ms)
  congruentRatio: number;        // Stroop 일치 확률
  staticDurationRatio: number;   // 정지 상태 비율
  theme?: string;                // 테마 (kitchen, fire_station, default)
}

interface PanelObject {
  id: string;
  emoji: string;
  x: number;  // 0-100 (%)
  y: number;  // 0-100 (%)
  scale: number;
  opacity: number;
  spawnTime: number;
  isClicked: boolean;
}

export class ThinkEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: ThinkConfig;
  private stroopEngine: StroopEngine;
  private rafId: number | null = null;
  private isRunning: boolean = false;
  private currentRound: number = 0;
  private roundStartTime: number = 0;
  private objects: PanelObject[] = [];
  private spawnIntervalId: number | null = null;
  private roundTimeoutId: number | null = null;
  
  // 테마별 객체 목록
  private static readonly THEME_OBJECTS: Record<string, string[]> = {
    kitchen: ['🍎', '🥕', '🧄', '🧅', '🥔', '🍅', '🥒', '🌶️'],
    fire_station: ['🚒', '🔥', '💧', '🚨', '⛑️', '🧯', '🚑', '📞'],
    default: ['⭐', '🌟', '💫', '✨', '🔮', '💎', '🎯', '🎲']
  };
  
  private objectsForTheme: string[];
  private resizeHandler: () => void;
  
  constructor(canvas: HTMLCanvasElement, config: ThinkConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context를 가져올 수 없습니다.');
    }
    this.ctx = ctx;
    this.config = config;
    
    // Stroop 엔진 초기화
    const stroopConfig: StroopConfig = {
      congruentRatio: config.congruentRatio,
      totalRounds: config.totalRounds,
      roundDuration: config.roundDuration,
      objectSpawnInterval: config.objectSpawnInterval,
      objectLifetime: config.objectLifetime,
      staticDurationRatio: config.staticDurationRatio,
    };
    this.stroopEngine = new StroopEngine(stroopConfig);
    
    // 테마별 객체 목록
    this.objectsForTheme = ThinkEngine.THEME_OBJECTS[config.theme || 'kitchen'] || 
                          ThinkEngine.THEME_OBJECTS.default;
    
    // Canvas 크기 설정
    this.resize();
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
  }
  
  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  
  /**
   * 엔진 시작
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.currentRound = 0;
    this.roundStartTime = performance.now();
    this.objects = [];
    
    this.executeRound(0);
    this.animate();
  }
  
  /**
   * 엔진 중지
   */
  stop() {
    this.isRunning = false;
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    if (this.spawnIntervalId) {
      clearInterval(this.spawnIntervalId);
      this.spawnIntervalId = null;
    }
    
    if (this.roundTimeoutId) {
      clearTimeout(this.roundTimeoutId);
      this.roundTimeoutId = null;
    }
    
    this.objects = [];
  }
  
  /**
   * 파라미터 업데이트 (싱글턴 패턴)
   */
  updateParams(params: Partial<ThinkConfig>) {
    if (params.roundDuration !== undefined) {
      this.config.roundDuration = params.roundDuration;
    }
    if (params.totalRounds !== undefined) {
      this.config.totalRounds = params.totalRounds;
    }
    if (params.objectSpawnInterval !== undefined) {
      this.config.objectSpawnInterval = params.objectSpawnInterval;
    }
    if (params.objectLifetime !== undefined) {
      this.config.objectLifetime = params.objectLifetime;
    }
    if (params.congruentRatio !== undefined) {
      this.config.congruentRatio = params.congruentRatio;
    }
    if (params.staticDurationRatio !== undefined) {
      this.config.staticDurationRatio = params.staticDurationRatio;
    }
    if (params.theme !== undefined) {
      this.config.theme = params.theme;
      this.objectsForTheme = ThinkEngine.THEME_OBJECTS[params.theme] || 
                             ThinkEngine.THEME_OBJECTS.default;
    }
  }
  
  /**
   * 라운드 실행
   */
  private executeRound(round: number) {
    if (round >= this.config.totalRounds) {
      this.isRunning = false;
      return;
    }
    
    this.currentRound = round;
    this.clearAllObjects();
    
    // 객체 스폰 시작
    this.spawnIntervalId = window.setInterval(() => {
      if (!this.isRunning) {
        if (this.spawnIntervalId) {
          clearInterval(this.spawnIntervalId);
          this.spawnIntervalId = null;
        }
        return;
      }
      this.spawnRandomObject();
    }, this.config.objectSpawnInterval);
    
    // 라운드 종료
    this.roundTimeoutId = window.setTimeout(() => {
      if (this.spawnIntervalId) {
        clearInterval(this.spawnIntervalId);
        this.spawnIntervalId = null;
      }
      
      this.clearAllObjects();
      
      // 다음 라운드
      setTimeout(() => {
        this.executeRound(round + 1);
      }, 500);
    }, this.config.roundDuration);
  }
  
  /**
   * 랜덤 객체 스폰
   */
  private spawnRandomObject() {
    const panelIndex = Math.floor(Math.random() * 3);
    const emoji = this.objectsForTheme[Math.floor(Math.random() * this.objectsForTheme.length)];
    
    const obj: PanelObject = {
      id: `obj_${Date.now()}_${Math.random()}`,
      emoji,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      scale: 0,
      opacity: 1,
      spawnTime: performance.now(),
      isClicked: false,
    };
    
    this.objects.push(obj);
    
    // 자동 제거
    setTimeout(() => {
      const index = this.objects.findIndex(o => o.id === obj.id);
      if (index !== -1) {
        this.objects[index].opacity = 0;
        this.objects[index].scale = 0;
        setTimeout(() => {
          this.objects = this.objects.filter(o => o.id !== obj.id);
        }, 300);
      }
    }, this.config.objectLifetime);
  }
  
  /**
   * 모든 객체 제거
   */
  private clearAllObjects() {
    this.objects = [];
  }
  
  /**
   * 객체 클릭 처리
   */
  handleClick(x: number, y: number) {
    const panelWidth = this.canvas.width / window.devicePixelRatio / 3;
    const panelIndex = Math.floor(x / panelWidth);
    const relativeX = (x % panelWidth) / panelWidth * 100;
    const relativeY = (y / (this.canvas.height / window.devicePixelRatio)) * 100;
    
    // 해당 패널의 객체 찾기
    const panelStartX = panelIndex * (100 / 3);
    const panelEndX = (panelIndex + 1) * (100 / 3);
    
    for (const obj of this.objects) {
      if (obj.x >= panelStartX && obj.x < panelEndX && !obj.isClicked) {
        const distance = Math.sqrt(
          Math.pow(obj.x - relativeX, 2) + Math.pow(obj.y - relativeY, 2)
        );
        
        if (distance < 10) { // 클릭 범위
          obj.isClicked = true;
          obj.scale = 1.5;
          obj.opacity = 0;
          
          setTimeout(() => {
            this.objects = this.objects.filter(o => o.id !== obj.id);
          }, 200);
          
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * 렌더링 루프
   */
  private animate = () => {
    if (!this.isRunning) return;
    
    this.rafId = requestAnimationFrame(this.animate);
    this.render();
  };
  
  /**
   * 렌더링
   */
  private render() {
    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;
    const panelWidth = width / 3;
    
    // 배경 클리어
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);
    
    // 3개 패널 그리기
    for (let i = 0; i < 3; i++) {
      const panelX = i * panelWidth;
      
      // 패널 배경
      this.ctx.fillStyle = '#1a1a1a';
      this.ctx.fillRect(panelX, 0, panelWidth, height);
      
      // 패널 구분선
      if (i > 0) {
        this.ctx.strokeStyle = '#2a2a2a';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(panelX, 0);
        this.ctx.lineTo(panelX, height);
        this.ctx.stroke();
      }
    }
    
    // 객체 렌더링
    const now = performance.now();
    for (const obj of this.objects) {
      const panelIndex = Math.floor(obj.x / (100 / 3));
      const panelX = panelIndex * panelWidth;
      const objX = panelX + (obj.x % (100 / 3)) / 100 * panelWidth;
      const objY = (obj.y / 100) * height;
      
      // 애니메이션
      const elapsed = now - obj.spawnTime;
      if (elapsed < 100) {
        obj.scale = elapsed / 100;
      } else if (!obj.isClicked) {
        obj.scale = 1;
      }
      
      // 그리기
      this.ctx.save();
      this.ctx.globalAlpha = obj.opacity;
      this.ctx.translate(objX, objY);
      this.ctx.scale(obj.scale, obj.scale);
      
      this.ctx.font = '32px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(obj.emoji, 0, 0);
      
      this.ctx.restore();
    }
    
    // 진행 표시기 (하단 중앙)
    const progressY = height - 30;
    const progressWidth = width * 0.6;
    const progressX = (width - progressWidth) / 2;
    const segmentWidth = progressWidth / this.config.totalRounds;
    
    for (let i = 0; i < this.config.totalRounds; i++) {
      const segmentX = progressX + i * segmentWidth;
      const isActive = i === this.currentRound;
      const isCompleted = i < this.currentRound;
      
      this.ctx.fillStyle = isCompleted 
        ? '#22c55e' 
        : isActive 
          ? '#3b82f6' 
          : 'rgba(255, 255, 255, 0.2)';
      
      this.ctx.fillRect(segmentX, progressY, segmentWidth - 4, 4);
    }
    
    // 라운드 카운터 (우측 상단)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(
      `ROUND ${this.currentRound + 1}/${this.config.totalRounds}`,
      width - 20,
      20
    );
  }
  
  /**
   * 정리
   */
  cleanup() {
    this.stop();
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }
  
  /**
   * 현재 라운드 반환
   */
  getCurrentRound(): number {
    return this.currentRound;
  }
  
  /**
   * 진행률 반환 (0-1)
   */
  getProgress(): number {
    return this.currentRound / this.config.totalRounds;
  }
  
  /**
   * Stroop 엔진 반환
   */
  getStroopEngine(): StroopEngine {
    return this.stroopEngine;
  }
}
