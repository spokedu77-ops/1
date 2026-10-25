/**
 * Read-only Chrome DevTools Protocol health preflight.
 * Distinguishes an open WebSocket from a responsive browser command loop.
 * No tabs, profiles, cookies, page data, or settings are modified.
 */
const trim = (value, max = 350) => String(value ?? '').slice(0, max);

async function probeCommands(wsEndpoint, timeoutMs) {
  return await new Promise((resolve) => {
    let socket;
    let timer;
    let closed = false;
    let stage = 'WS_CONNECT';
    const replies = new Map();
    const complete = (data) => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      try { if (socket && socket.readyState <= 1) socket.close(); } catch {}
      resolve(data);
    };
    timer = setTimeout(() => complete({ok: false, code: 'CDP_COMMAND_TIMEOUT', stage, detail: `No response after ${timeoutMs}ms`}), timeoutMs);
    try {
      socket = new WebSocket(wsEndpoint);
      socket.addEventListener('open', () => {
        if (closed) return;
        stage = 'COMMAND_RESPONSE';
        socket.send(JSON.stringify({id: 91401, method: 'Browser.getVersion'}));
        socket.send(JSON.stringify({id: 91402, method: 'Target.getTargets'}));
      });
      socket.addEventListener('error', () => complete({ok: false, code: 'CDP_WS_ERROR', stage, detail: 'WebSocket error; browser CDP not responsive'}));
      socket.addEventListener('close', () => complete({ok: false, code: 'CDP_WS_CLOSED', stage, detail: 'WebSocket closed before Chrome command reply'}));
      socket.addEventListener('message', (event) => {
        if (closed) return;
        let m;
        try { m = JSON.parse(event.data); } catch { return; }
        if (m.id !== 91401 && m.id !== 91402) return;
        if (m.error) return complete({ok: false, code: 'CDP_METHOD_FAILED', stage, detail: trim(m.error.message)});
        replies.set(m.id, m.result || {});
        if (replies.size !== 2) return;
        const v = replies.get(91401), targets = replies.get(91402)?.targetInfos || [];
        complete({ok: true, stage: 'COMMAND_RESPONSE', code: 'OK',
          browser: trim(v.product, 90), protocolVersion: trim(v.protocolVersion, 40),
          targets: targets.length});
      });
    } catch (error) {
      complete({ok: false, code: 'CDP_WEBSOCKET_CREATION_FAILED', stage, detail: trim(error.message)});
    }
  });
}

/** @param {string} endpoint */
export async function probeChromeProtocol(endpoint, opts = {}) {
  const started = performance.now();
  const httpTimeoutMs = opts.httpTimeoutMs ?? 3000;
  const commandTimeoutMs = opts.commandTimeoutMs ?? 5000;
  const report = {ok: false, code: 'UNSTARTED', stage: 'HTTP_VERSION', wsEndpoint: null};
  try {
    const url = new URL('/json/version', `${endpoint.replace(/\/$/,'')}/`);
    const response = await fetch(url, {signal: AbortSignal.timeout(httpTimeoutMs)});
    report.httpStatus = response.status;
    if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`),{code:'CDP_HTTP_NOT_OK'});
    const info = await response.json();
    const ws = info.webSocketDebuggerUrl;
    if (!ws || !/^wss?:\/\//.test(ws)) throw Object.assign(new Error('webSocketDebuggerUrl missing'),{code:'CDP_WS_ENDPOINT_MISSING'});
    report.wsEndpoint = ws;
    report.stage = 'WS_COMMANDS';
    const check = await probeCommands(ws, commandTimeoutMs);
    Object.assign(report, check);
    return report;
  } catch (error) {
    report.ok = false;
    report.code = error.code || (error.name === 'TimeoutError' ? 'CDP_HTTP_TIMEOUT' : 'CDP_HTTP_UNREACHABLE');
    report.detail = trim(error.message);
    return report;
  } finally {
    report.elapsedMs = Math.round(performance.now() - started);
  }
}

export function formatCdpError(report) {
  return `${report.code} at ${report.stage}: ${report.detail || 'no command reply'}. ` +
    'Do not close or kill Chrome if other tabs contain unsaved work.';
}
