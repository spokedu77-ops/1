/**
 * BGM 플레이어 클래스
 * HTMLAudioElement를 래핑하여 BGM 재생을 관리
 * - 사용자 제스처에서만 재생 시작 (autoplay 정책 준수)
 * - fadeIn/fadeOut 지원
 * - loop, preload 설정
 */

export class BgmPlayer {
  private audio: HTMLAudioElement | null = null;
  private fadeInterval: number | null = null;
  private isInitialized = false;
  private targetVolume: number = 0.65;
  private eventHandlers: { event: string; handler: EventListener }[] = [];

  /**
   * BGM 초기화 (재생하지 않음)
   * 사용자 제스처에서 play()를 호출해야 재생됨
   */
  async init(srcUrl: string, volume = 0.65): Promise<void> {
    // 기존 재생 중이면 반드시 stop() 후 교체
    if (this.audio && this.isInitialized) {
      this.stop();
    }
    // 기존 audio 정리
    this.cleanup();

    // 새 audio element 생성
    this.audio = new Audio();
    
    this.audio.src = srcUrl;
    this.audio.preload = 'auto';
    this.audio.loop = true;
    this.audio.volume = volume;
    this.targetVolume = volume;
    this.isInitialized = true;
    
    // 에러 핸들링 (크래시 방지)
    const errorHandler = (e: Event) => {
      const error = this.audio?.error;
      console.warn('[BgmPlayer] Audio error:', e, error);
    };
    this.audio.addEventListener('error', errorHandler);
    this.eventHandlers.push({ event: 'error', handler: errorHandler });
  }

  /**
   * BGM 재생 시작
   * 사용자 제스처(클릭)에서만 호출되어야 함
   * autoplay blocked 시 조용히 실패 (throw하지 않음)
   */
  async play(): Promise<void> {
    if (!this.audio || !this.isInitialized) {
      console.warn('[BgmPlayer] Not initialized');
      return;
    }

    try {
      await this.audio.play();
    } catch (error: any) {
      // autoplay blocked 또는 기타 에러
      console.warn('[BgmPlayer] Play failed (autoplay blocked or error):', error);
      // throw하지 않고 조용히 무시
    }
  }

  /**
   * BGM 일시정지
   */
  pause(): void {
    if (this.audio) {
      this.audio.pause();
      // pause 시에도 loop를 false로 설정하여 재생이 계속되지 않도록
      this.audio.loop = false;
    }
  }

  /**
   * BGM 정지 및 리셋
   */
  stop(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    if (this.audio) {
      // 모든 이벤트 리스너 제거
      this.eventHandlers.forEach(({ event, handler }) => {
        this.audio?.removeEventListener(event, handler);
      });
      this.eventHandlers = [];
      
      // 기존 오디오 정지 및 완전히 제거
      try {
        this.audio.pause();
        this.audio.loop = false;
        this.audio.currentTime = 0;
        // suspend()를 호출하여 리소스 해제
        if ('suspend' in this.audio && typeof this.audio.suspend === 'function') {
          this.audio.suspend();
        }
      } catch (e) {
        // 무시
      }
      
      // src를 제거하여 재생 중단
      try {
        this.audio.removeAttribute('src');
        this.audio.src = '';
      } catch (e) {
        // 무시
      }
      
      // 오디오 요소를 완전히 제거
      this.audio = null;
      this.isInitialized = false;
    }
  }

  /**
   * 볼륨 설정 (0.0 ~ 1.0)
   */
  setVolume(v: number): void {
    this.targetVolume = Math.max(0, Math.min(1, v));
    if (this.audio) {
      this.audio.volume = this.targetVolume;
    }
  }

  /**
   * 음소거 토글
   * volume을 변경하지 않고 audio.muted 속성 사용
   */
  setMuted(muted: boolean): void {
    if (this.audio) {
      this.audio.muted = muted;
    }
  }

  /**
   * 페이드 아웃 (점진적으로 볼륨 감소 후 정지)
   */
  fadeOut(ms = 300): void {
    if (!this.audio || !this.isInitialized) return;

    // loop를 false로 설정하여 fadeOut 후 재생이 계속되지 않도록
    this.audio.loop = false;

    // 기존 fade interval 정리
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const startVolume = this.audio.volume;
    const steps = Math.max(10, Math.floor(ms / 16)); // 16ms 간격 (약 60fps)
    const stepSize = startVolume / steps;
    let currentStep = 0;

    this.fadeInterval = window.setInterval(() => {
      currentStep++;
      const newVolume = Math.max(0, startVolume - stepSize * currentStep);
      
      if (this.audio) {
        this.audio.volume = newVolume;
      }

      if (currentStep >= steps || newVolume <= 0) {
        if (this.fadeInterval) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        this.pause();
        // fadeOut 완료 후 오디오 요소 완전히 제거
        if (this.audio) {
          // 모든 이벤트 리스너 제거
          this.eventHandlers.forEach(({ event, handler }) => {
            this.audio?.removeEventListener(event, handler);
          });
          this.eventHandlers = [];
          
          try {
            // suspend()를 호출하여 리소스 해제
            if ('suspend' in this.audio && typeof this.audio.suspend === 'function') {
              this.audio.suspend();
            }
            this.audio.removeAttribute('src');
            this.audio.src = '';
          } catch (e) {
            // 무시
          }
          
          this.audio = null;
          this.isInitialized = false;
        }
        // 볼륨은 원래대로 복구하지 않음 (stop에서 리셋됨)
      }
    }, 16);
  }

  /**
   * 페이드 인 (점진적으로 볼륨 증가)
   */
  fadeIn(ms = 150): void {
    if (!this.audio || !this.isInitialized) return;

    // 기존 fade interval 정리
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const targetVolume = this.targetVolume;
    const steps = Math.max(10, Math.floor(ms / 16)); // 16ms 간격
    const stepSize = targetVolume / steps;
    let currentStep = 0;

    // 시작 볼륨을 0으로 설정
    if (this.audio) {
      this.audio.volume = 0;
    }

    this.fadeInterval = window.setInterval(() => {
      currentStep++;
      const newVolume = Math.min(targetVolume, stepSize * currentStep);
      
      if (this.audio) {
        this.audio.volume = newVolume;
      }

      if (currentStep >= steps || newVolume >= targetVolume) {
        if (this.fadeInterval) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        if (this.audio) {
          this.audio.volume = targetVolume;
        }
      }
    }, 16);
  }

  /**
   * 리소스 정리 (interval, audio)
   */
  cleanup(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    if (this.audio) {
      // 모든 이벤트 리스너 제거
      this.eventHandlers.forEach(({ event, handler }) => {
        this.audio?.removeEventListener(event, handler);
      });
      this.eventHandlers = [];
      
      try {
        this.audio.pause();
        this.audio.loop = false;
        this.audio.currentTime = 0;
        // suspend()를 호출하여 리소스 해제
        if ('suspend' in this.audio && typeof this.audio.suspend === 'function') {
          this.audio.suspend();
        }
        // src를 제거하여 재생 중단
        this.audio.removeAttribute('src');
        this.audio.src = '';
      } catch (e) {
        // 무시
      }
      
      this.audio = null;
    }
    this.isInitialized = false;
  }
}
