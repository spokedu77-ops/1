'use client';

import { useEffect, useRef } from 'react';
import { Phase } from '../../components/ProgramOrchestrator';

interface FlowPhaseProps {
  phase: Phase;
}

export function FlowPhase({ phase }: FlowPhaseProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // iframe 로드 후 자동 시작 (선택적)
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.onload = () => {
        // 게임이 자동으로 시작되도록 메시지 전달
        // HTML 내부에서 자동 시작하도록 수정할 수도 있음
        setTimeout(() => {
          const startBtn = iframe.contentDocument?.getElementById('start-btn');
          if (startBtn) {
            startBtn.click();
          }
        }, 500);
      };
    }
  }, []);

  return (
    <div className="w-full h-full relative bg-black">
      <iframe
        ref={iframeRef}
        src="/flow-phase/index.html"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms"
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
}
