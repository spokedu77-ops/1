#!/usr/bin/node
/** Extend Codex sidebar webview ready wait (K2 watchdog: default 30s → 120s). */
import fs from 'node:fs';
import path from 'node:path';

const extJs = path.join(
  process.env.USERPROFILE ?? '',
  '.cursor/extensions/openai.chatgpt-26.51021.22027/out/extension.js',
);

const needle =
  'var K2=class{constructor(e){this.onTimeout=e}timeout;disposed=!1;receivedWebviewMessage=!1;start(){if(this.disposed||this.timeout!=null)return;let e=Date.now();this.timeout=setTimeout(()=>{this.timeout=void 0,this.onTimeout({elapsedMs:Date.now()-e,receivedWebviewMessage:this.receivedWebviewMessage,timeoutMs:3e4})},3e4)}';

const replacement =
  'var K2=class{constructor(e){this.onTimeout=e}timeout;disposed=!1;receivedWebviewMessage=!1;start(){if(this.disposed||this.timeout!=null)return;let e=Date.now();this.timeout=setTimeout(()=>{this.timeout=void 0,this.onTimeout({elapsedMs:Date.now()-e,receivedWebviewMessage:this.receivedWebviewMessage,timeoutMs:12e4})},12e4)}';

let c = fs.readFileSync(extJs, 'utf8');
if (c.includes(replacement)) {
  console.log('[patch] Codex K2 timeout already extended (120s).');
  process.exit(0);
}
if (!c.includes(needle)) {
  console.error('[patch] K2 watchdog block not found — extension version may have changed.');
  process.exit(1);
}
c = c.replace(needle, replacement);
fs.writeFileSync(extJs, c);
console.log('[patch] Codex webview ready timeout: 30s → 120s (K2 class).');
