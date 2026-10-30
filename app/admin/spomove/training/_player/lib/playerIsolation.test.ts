// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { CSS } from '../styles';
import { scopePlayerCss } from './scopePlayerCss';
import { exitFullscreenSafely } from './fullscreen';
afterEach(()=>vi.unstubAllGlobals());
it('scopes globals, themes and nested media selectors while retaining keyframes',()=>{
  expect(scopePlayerCss(':root{--x:1}body{color:red}button:hover{opacity:.5}@media(hover:none){button:hover{opacity:1}}@keyframes pulse{0%{opacity:0}100%{opacity:1}}')).toBe('.spomove-player-root{--x:1}.spomove-player-root{color:red}.spomove-player-root button:hover{opacity:.5}@media(hover:none){.spomove-player-root button:hover{opacity:1}}@keyframes pulse{0%{opacity:0}100%{opacity:1}}');
  expect(CSS).not.toMatch(/(^|})\s*(?::root|body|button(?::|\s*\{))/);
  expect(CSS).toContain('.spomove-player-root[data-theme="dark"]');
});
it('contains asynchronous fullscreen denial',async()=>{vi.stubGlobal('document',{exitFullscreen:vi.fn().mockRejectedValue(new Error('denied'))});expect(()=>exitFullscreenSafely()).not.toThrow();await Promise.resolve();});
it('contains synchronous fullscreen denial and absent APIs',()=>{vi.stubGlobal('document',{exitFullscreen:()=>{throw new Error('denied')}});expect(()=>exitFullscreenSafely()).not.toThrow();vi.stubGlobal('document',{});expect(()=>exitFullscreenSafely()).not.toThrow()});
