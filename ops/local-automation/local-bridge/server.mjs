import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && process.env[match[1]] == null) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const port = Number(process.env.BRIDGE_PORT || 5681);
const appBase = (process.env.SPOKEDU_BRIDGE_APP_BASE_URL || process.env.SPOKEDU_APP_BASE_URL || '').replace(/\/$/, '');
const workerSecret = process.env.SPOKEDU_AUTOMATION_WORKER_SECRET || process.env.AUTOMATION_WORKER_SECRET || '';
const workflowId = process.env.N8N_WORKFLOW_ID || 'dmKZDzet61qQv4XW';
const container = process.env.N8N_CONTAINER_NAME || 'local-automation-n8n-1';
const allowedOrigins = new Set([
  'https://spokedu.kr',
  'https://www.spokedu.kr',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
]);
const running = new Set();

function cors(req, res) {
  const origin = req.headers.origin || '';
  if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== 'POST' || req.url !== '/run') {
    send(res, 404, { error: 'NOT_FOUND' });
    return;
  }
  const origin = req.headers.origin || '';
  if (!allowedOrigins.has(origin)) {
    send(res, 403, { error: 'ORIGIN_FORBIDDEN' });
    return;
  }
  let body;
  try {
    body = await readJson(req);
  } catch {
    send(res, 400, { error: 'invalid_json' });
    return;
  }
  const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : '';
  const grant = typeof body.grant === 'string' ? body.grant.trim() : '';
  if (!jobId || !grant || !appBase || !workerSecret) {
    send(res, 400, { error: 'GRANT_MALFORMED' });
    return;
  }
  if (running.has(jobId)) {
    send(res, 409, { error: 'ALREADY_RUNNING' });
    return;
  }
  const verified = await fetch(`${appBase}/api/automation/local-bridge/consume`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${workerSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jobId, grant }),
  });
  if (!verified.ok) {
    send(res, verified.status, { error: 'GRANT_REJECTED' });
    return;
  }
  running.add(jobId);
  const child = spawn('docker', ['exec', container, 'n8n', 'execute', '--id', workflowId], {
    stdio: 'ignore',
    windowsHide: true,
  });
  child.on('close', () => running.delete(jobId));
  child.on('error', () => running.delete(jobId));
  send(res, 202, { ok: true, started: true });
});

server.listen(port, '127.0.0.1');
