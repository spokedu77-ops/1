import {defineConfig} from 'vitest/config';import path from 'node:path';
export default defineConfig({resolve:{alias:{'@':process.cwd()}},test:{environment:'node',include:['.spomove-audit-stage2/*.test.ts'],fileParallelism:false}});
