export function isProductionDeployment(input?: {
  vercelEnvironment?: string;
  nodeEnvironment?: string;
}): boolean {
  const vercelEnvironment = input?.vercelEnvironment
    ?? process.env.NEXT_PUBLIC_VERCEL_ENV
    ?? process.env.VERCEL_ENV;

  if (vercelEnvironment) return vercelEnvironment === 'production';
  return (input?.nodeEnvironment ?? process.env.NODE_ENV) === 'production';
}
