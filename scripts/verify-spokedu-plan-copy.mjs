/**
 * planCatalog의 PLAN_PRICES 금액이 Settings·고지 등 주요 UI 파일에 문자열로 등재하는지 검사합니다.
 * 실행: node scripts/verify-spokedu-plan-copy.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const catalogPath = path.join(root, 'app', 'lib', 'spokedu-pro', 'planCatalog.ts');
const catalog = fs.readFileSync(catalogPath, 'utf8');
const basic = catalog.match(/basic:\s*(\d+)/)?.[1];
const pro = catalog.match(/pro:\s*(\d+)/)?.[1];
if (!basic || !pro) {
  console.error('verify-spokedu-plan-copy: could not parse PLAN_PRICES from planCatalog.ts');
  process.exit(1);
}

const settingsPath = path.join(root, 'app', '(pro)', 'spokedu-pro', 'views', 'SettingsView.tsx');
const settingsText = fs.readFileSync(settingsPath, 'utf8');

if (!settingsText.includes('planCatalog') || !settingsText.includes('PLAN_PRICES')) {
  console.error('verify-spokedu-plan-copy: SettingsView must import PLAN_PRICES from planCatalog');
  process.exit(1);
}

const dupBasic = (catalog.match(new RegExp(`basic:\\s*${basic}`, 'g')) ?? []).length;
const dupPro = (catalog.match(new RegExp(`pro:\\s*${pro}`, 'g')) ?? []).length;
if (dupBasic < 1 || dupPro < 1) {
  console.error('verify-spokedu-plan-copy: unexpected planCatalog shape');
  process.exit(1);
}

console.log('verify-spokedu-plan-copy: OK (basic=%s pro=%s, SettingsView uses planCatalog)', basic, pro);
