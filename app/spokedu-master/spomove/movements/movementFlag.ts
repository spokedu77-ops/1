export type MovementLayerFlagContext = {
  userRole?: string | null;
  userId?: string | null;
  isAdmin?: boolean;
  environment?: 'development' | 'preview' | 'production';
};

const TEST_USER_IDS: string[] = (
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SPOMOVE_MOVEMENT_TEST_USER_IDS ?? '' : ''
)
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

function resolveEnvironment(): 'development' | 'preview' | 'production' {
  if (typeof process === 'undefined') return 'development';
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') return 'preview';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

/**
 * 서버·클라이언트 동일 판정용.
 * production에서는 admin 또는 allowlist만 ON.
 * development/preview는 기본 ON (롤백은 아래 kill switch).
 */
export function isSpomoveMovementLayerEnabled(context: MovementLayerFlagContext = {}): boolean {
  if (process.env.NEXT_PUBLIC_SPOMOVE_MOVEMENT_LAYER === '0') return false;
  if (process.env.NEXT_PUBLIC_SPOMOVE_MOVEMENT_LAYER === '1') return true;

  const environment = context.environment ?? resolveEnvironment();
  if (environment !== 'production') return true;

  if (context.isAdmin || context.userRole === 'admin') return true;
  const userId = context.userId?.trim();
  if (userId && TEST_USER_IDS.includes(userId)) return true;
  return false;
}
