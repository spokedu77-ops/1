#!/usr/bin/env node
/**
 * 브라우저에서 수집한 스냅샷 JSON을 stdin 또는 파일로 받아 manifest/baseline과 대조.
 * 사용: node scripts/naver-blog-p0/run-verify.mjs --post p0-family-sports-day < snapshot.json
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { verifySnapshot } from './dom-verify.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(__dirname, 'manifest.json'), 'utf8'));

function parseArgs(argv) {
  const postIdx = argv.indexOf('--post');
  if (postIdx === -1 || !argv[postIdx + 1]) {
    console.error('Usage: run-verify.mjs --post <post-id> [snapshot.json]');
    process.exit(2);
  }
  const postId = argv[postIdx + 1];
  const fileArg = argv[postIdx + 2];
  return { postId, fileArg };
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const { postId, fileArg } = parseArgs(process.argv);
const post = manifest.posts.find((p) => p.id === postId);
if (!post) {
  console.error(`Unknown post id: ${postId}`);
  process.exit(2);
}

let baseline = null;
if (post.baselineFile) {
  baseline = JSON.parse(readFileSync(join(__dirname, post.baselineFile), 'utf8'));
}

const raw = fileArg ? readFileSync(fileArg, 'utf8') : await readStdin();
const snapshot = JSON.parse(raw);
const result = verifySnapshot(snapshot, post, baseline);

console.log(JSON.stringify(result, null, 2));
process.exit(result.pass ? 0 : 1);
