import path from 'path';
import { defineConfig } from 'vitest/config';

/** Historical data preservation only; never treat this as the active runtime. */
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'app/api/spokedu-master/class-records/createClassRecord.contract.test.ts',
      'app/api/spokedu-master/class-records/replaceClassRecord.contract.test.ts',
      'app/spokedu-master/class-record/classRecordEntry.contract.test.ts',
      'app/spokedu-master/lib/importLegacyOperationalData.test.ts',
      'app/spokedu-master/lib/legacyOperationalArchive.test.ts',
      'app/spokedu-master/lib/legacyOperationalImport.test.ts',
      'app/spokedu-master/store/todayLessonMigration.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
