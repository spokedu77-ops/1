import path from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Fast, release-blocking coverage for the SPOKEDU MASTER runtime.
 *
 * Keep this list intentionally small. A test belongs here only when it protects
 * authentication/entitlement, payment integrity, or the Session-based lesson
 * workflow. Historical import compatibility belongs in the legacy suite.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'app/lib/server/spokeduMasterEntitlement.test.ts',
      'app/lib/server/spokeduMasterProxyAccess.contract.test.ts',
      'app/lib/server/spokeduMasterPaymentApply.test.ts',
      'app/lib/server/spokeduMasterPaymentRpcMigration.contract.test.ts',
      'app/api/spokedu-master/payment/create-checkout/route.contract.test.ts',
      'app/api/spokedu-master/payment/confirm/ownership.contract.test.ts',
      'app/api/spokedu-master/payment/webhook/route.test.ts',
      'app/api/spokedu-master/payment/billing/issue/route.test.ts',
      'app/api/spokedu-master/payment/billing/renew/route.test.ts',
      'app/api/spokedu-master/operational-data/route.test.ts',
      'app/api/spokedu-master/operational-routes.test.ts',
      'app/api/spokedu-master/apiRouteImports.contract.test.ts',
      'app/api/spokedu-master/access/route.test.ts',
      'app/api/spokedu-master/subscription/route.test.ts',
      'app/api/spokedu-master/sessionFoundation.contract.test.ts',
      'app/api/spokedu-master/foundationLockdown.test.ts',
      'app/api/spokedu-master/classAndSessionUx.contract.test.ts',
      'app/api/spokedu-master/sessionWorkflow.contract.test.ts',
      'app/spokedu-master/lib/operationalDataAdapter.test.ts',
      'app/spokedu-master/lib/sessionDateTime.test.ts',
      'app/spokedu-master/navigation.contract.test.ts',
      'app/spokedu-master/lessonFlow.contract.test.ts',
      'app/spokedu-master/terminology.contract.test.ts',
      'app/spokedu-master/serviceTruthfulness.test.ts',
      'app/spokedu-master/operational/providerErrorSanitization.contract.test.ts',
      'app/spokedu-master/students/studentHistory.contract.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
