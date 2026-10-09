#!/usr/bin/env node
/** CDP Runtime.evaluate에 넣을 COLLECT_SNAPSHOT_FN 본문 출력 */
import { COLLECT_SNAPSHOT_FN } from './dom-verify.mjs';
process.stdout.write(COLLECT_SNAPSHOT_FN);
