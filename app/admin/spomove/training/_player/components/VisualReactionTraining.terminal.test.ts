// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { VisualReactionTraining } from './VisualReactionTraining';
let root: Root, host: HTMLDivElement;
beforeEach(()=>{
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','performance','Date']});
  vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>setTimeout(()=>fn(performance.now()),50));
  vi.stubGlobal('cancelAnimationFrame',(id:ReturnType<typeof setTimeout>)=>clearTimeout(id));
  vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}});
  const drawing=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop(){}}):key==='measureText'?()=>({width:10}):()=>{}});
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation((()=>drawing) as unknown as typeof HTMLCanvasElement.prototype.getContext);
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(()=>{act(()=>root.unmount());host.remove();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals()});
function mount(){const complete=vi.fn();act(()=>root.render(React.createElement(VisualReactionTraining,{variant:'flow',durationSec:12,speedSec:2,onExit:vi.fn(),onComplete:complete})));return complete}
function advance(ms:number){act(()=>vi.advanceTimersByTime(ms))}
it('cancels before the engine starts',()=>{const done=mount();act(()=>host.querySelector<HTMLButtonElement>('.vrt-stop')!.click());advance(20000);expect(done).toHaveBeenCalledTimes(1);expect(done.mock.calls[0][0].completionReason).toBe('cancelled')});
it.each(['stop-first','natural-first'])('resolves a natural/STOP race once: %s',order=>{const done=mount();advance(order==='stop-first'?14999:15000);act(()=>host.querySelector<HTMLButtonElement>('.vrt-stop')!.click());advance(1000);expect(done).toHaveBeenCalledTimes(1);expect(done.mock.calls[0][0].completionReason).toBe(order==='stop-first'?'stopped_early':'natural_complete')});
it('reports a real Canvas exception as failed rather than completing',()=>{const done=mount();vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(()=>{throw Error('injected canvas failure')});advance(20000);expect(done).toHaveBeenCalledTimes(1);expect(done.mock.calls[0][0].completionReason).toBe('failed')});
