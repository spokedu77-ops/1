import test from 'node:test'; import assert from 'node:assert/strict'; import {readFile} from 'node:fs/promises';
const run=await readFile(new URL('./run.mjs',import.meta.url),'utf8');
test('dedicated oneclick reports path',()=>assert.match(run,/reports\/naver-new\/rich-paste\/spokedu-oneclick/));
test('explicit save and publish flags false',()=>{assert.match(run,/saveDraftExecuted:false/);assert.match(run,/publishExecuted:false/);});
